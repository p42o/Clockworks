<?php
/**
 * PIN gate for the Timely Drywall assessment.
 *
 * Client and viewer PINs open the assessment only; the admin PIN opens
 * Parker's internal playbook under /timely/admin/ (and the assessment).
 *
 * The report is committed to this (public) repo only as AES-256-GCM
 * ciphertext in blob/. The key and the PIN's HMAC live in _config.php,
 * which the deploy workflow writes from GitHub secrets and which is never
 * committed. Every request under /timely/ is rewritten here: unauthenticated
 * visitors get the PIN screen, authenticated ones get the decrypted file.
 */

declare(strict_types=1);

const IP_MODE = 'full'; // 'full' or 'hashed'

const COOKIE      = 'timely_auth';
const PIN_LEN     = 4;      // client PIN digits
const ADMIN_LEN   = 6;      // admin (playbook) PIN digits
const COOKIE_DAYS = 30;
const IP_MAX_FAIL = 8;      // per IP, per window
const GLOBAL_MAX  = 60;     // all IPs combined, per window
const WINDOW_SECS = 900;    // 15 minutes

header('X-Robots-Tag: noindex, nofollow, noarchive');
header('Referrer-Policy: no-referrer');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

$path = $_GET['p'] ?? '';
$path = ltrim(str_replace('\\', '/', $path), '/');
if ($path === 'privacy' || $path === 'privacy/') {
    render_privacy();
    exit;
}

$cfgFile = __DIR__ . '/_config.php';
if (!is_file($cfgFile)) {
    http_response_code(503);
    exit('Not configured.');
}
$cfg = require $cfgFile;
$key = base64_decode($cfg['key'], true);
$pinMac = $cfg['pin'];
$adminMac = $cfg['admin'] ?? '';
$viewerMac = $cfg['viewer'] ?? '';
if ($key === false || strlen($key) !== 32) {
    http_response_code(503);
    exit('Not configured.');
}

// ---------------------------------------------------------------- auth cookie
function sign(string $key, string $msg): string {
    return hash_hmac('sha256', $msg, $key);
}
// Cookie = "<scope>.<expiry>.<hmac>", scope c (client), v (viewer), or a (admin). Admin also opens the client report.
function auth_scope(string $key): string {
    $c = $_COOKIE[COOKIE] ?? '';
    if (!preg_match('/^([cav])\.(\d{10})\.([a-f0-9]{64})$/', $c, $m)) return '';
    if ((int)$m[2] < time()) return '';
    return hash_equals(sign($key, 'auth|' . $m[1] . '|' . $m[2]), $m[3]) ? $m[1] : '';
}
function set_auth(string $key, string $scope): void {
    $exp = time() + COOKIE_DAYS * 86400;
    setcookie(COOKIE, $scope . '.' . $exp . '.' . sign($key, 'auth|' . $scope . '|' . $exp), [
        'expires' => $exp, 'path' => '/timely/', 'secure' => true,
        'httponly' => true, 'samesite' => 'Lax',
    ]);
}

// ---------------------------------------------------------------- rate limit
function state_dir(): string {
    $d = __DIR__ . '/_state';
    if (!is_dir($d)) @mkdir($d, 0700);
    return $d;
}
function fails(string $file): array {
    $now = time();
    $list = is_file($file) ? (json_decode((string)@file_get_contents($file), true) ?: []) : [];
    return array_values(array_filter($list, fn($t) => $t > $now - WINDOW_SECS));
}
function add_fail(string $file): void {
    $list = fails($file);
    $list[] = time();
    @file_put_contents($file, json_encode($list), LOCK_EX);
}

// Visit storage is best effort and contains only the approved fields.
function device_class(): string {
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
    if (preg_match('/bot|curl|wget|python|crawler|spider|preview|facebookexternalhit|whatsapp/i', $ua)) return 'bot';
    foreach (['iPhone', 'iPad', 'Android', 'Mac', 'Windows', 'Linux'] as $class) {
        if (stripos($ua, $class) !== false) return $class;
    }
    return 'other';
}
function visit(string $ev, string $scope = ''): ?array {
    global $key, $isPlaybook;
    try {
        $now = new DateTimeImmutable('now', new DateTimeZone('America/Chicago'));
        $day = $now->format('Y-m-d');
        $dir = state_dir() . '/visits';
        if (!@is_dir($dir) && !@mkdir($dir, 0700)) return null;
        $marker = $dir . '/prune-' . $day . '.marker';
        if ($h = @fopen($marker, 'x')) {
            @fclose($h);
            $cutoff = $now->modify('-90 days')->format('Y-m-d');
            foreach (@glob($dir . '/*') ?: [] as $file) {
                if (preg_match('/(?:client-|parker-|prune-|notify-)(\d{4}-\d{2}-\d{2})\.(?:jsonl|marker)$/', basename($file), $m) && $m[1] < $cutoff) @unlink($file);
            }
        }
        $who = ['c' => 'client', 'v' => 'viewer', 'a' => 'admin'][$scope] ?? 'unknown';
        $stream = $scope !== '' ? ($scope === 'c' ? 'client' : 'parker') : ($isPlaybook ? 'parker' : 'client');
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        if (IP_MODE === 'hashed') $ip = substr(hash_hmac('sha256', 'ip|' . $ip . '|' . $now->format('Y-m'), $key), 0, 16);
        $row = ['t' => $now->format(DateTimeInterface::ATOM), 'ev' => $ev, 'gate' => $isPlaybook ? 'admin' : 'client', 'who' => $who, 'path' => $isPlaybook ? 'admin/index.html' : 'index.html', 'ip' => $ip, 'ua' => device_class()];
        $file = $dir . '/' . $stream . '-' . $day . '.jsonl';
        if ($h = @fopen($file, 'a')) {
            if (@flock($h, LOCK_EX)) {
                $stat = @fstat($h);
                if ($stat !== false && $stat['size'] <= 2 * 1024 * 1024) @fwrite($h, json_encode($row) . "\n");
                @flock($h, LOCK_UN);
            }
            @fclose($h);
        }
        return $row;
    } catch (Throwable $e) { return null; }
}
function notify_open(array $row): void {
    global $cfg;
    if (($cfg['notify'] ?? '') !== '1' || empty($cfg['resend']) || empty($cfg['notify_to'])) return;
    $day = substr($row['t'], 0, 10);
    $h = @fopen(state_dir() . '/visits/notify-' . $day . '.marker', 'x');
    if (!$h) return;
    @fclose($h);
    if (function_exists('fastcgi_finish_request')) @fastcgi_finish_request();
    elseif (function_exists('litespeed_finish_request')) @litespeed_finish_request();
    if (!function_exists('curl_init')) return;
    $ch = @curl_init($cfg['resend_url'] ?? 'https://api.resend.com/emails');
    if (!$ch) return;
    @curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 3,
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $cfg['resend'], 'Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode(['from' => $cfg['notify_from'] ?? 'MN Clockworks <visits@mnclockworks.com>', 'to' => [$cfg['notify_to']], 'subject' => 'Timely report opened',
            'text' => 'Time (CT): ' . $row['t'] . "\nPage: " . $row['path'] . "\nDevice: " . $row['ua'] . "\nIP: " . $row['ip']])]);
    @curl_exec($ch);
    @curl_close($ch);
}
function render_visits(): void {
    $tab = ($_GET['tab'] ?? '') === 'parker' ? 'parker' : 'client';
    $now = new DateTimeImmutable('now', new DateTimeZone('America/Chicago'));
    $rows = []; $counts = [];
    foreach (@glob(state_dir() . '/visits/' . $tab . '-*.jsonl') ?: [] as $file) {
        $day = substr(basename($file), strlen($tab) + 1, 10);
        if ($day < $now->modify('-90 days')->format('Y-m-d') || $day > $now->format('Y-m-d')) continue;
        foreach (@file($file, FILE_IGNORE_NEW_LINES) ?: [] as $line) {
            $row = json_decode($line, true);
            if (!is_array($row)) continue;
            $rows[] = $row; $counts[$day] = ($counts[$day] ?? 0) + 1;
        }
    }
    usort($rows, fn($a, $b) => strcmp($b['t'], $a['t'])); krsort($counts);
    $esc = fn($v) => htmlspecialchars((string)$v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    header('Cache-Control: no-store');
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Timely visits</title><style>body{background:#F5F1E8;color:#1A1916;font:15px system-ui;margin:32px}a{color:#A8401A;margin-right:24px}table{border-collapse:collapse;background:#FBF8F1}td,th{padding:10px;border:1px solid #E3DACB;text-align:left}</style><h1>Timely visits</h1><nav><a href="?tab=client">Client</a><a href="?tab=parker">Parker</a></nav><h2>' . ucfirst($tab) . '</h2>';
    foreach ($counts as $day => $count) echo '<p>' . $esc($day) . ': ' . $esc($count) . ' events</p>';
    echo '<table><tr><th>Time</th><th>Event</th><th>Gate</th><th>Who</th><th>IP</th><th>Device</th><th>Page</th></tr>';
    foreach ($rows as $row) {
        echo '<tr>';
        foreach (['t', 'ev', 'gate', 'who', 'ip', 'ua', 'path'] as $field) echo '<td>' . $esc($row[$field] ?? '') . '</td>';
        echo '</tr>';
    }
    echo '</table></html>';
}

if (preg_match('#(^|/)_#', $path)) { http_response_code(404); exit; }
$isVisits = $path === 'admin/visits' || $path === 'admin/visits/';
if ($path === 'admin') { header('Location: /timely/admin/', true, 301); exit; }  // keep relative asset URLs right
if ($path === '' || substr($path, -1) === '/') $path .= 'index.html';
// /timely/admin/ is Parker's internal playbook; everything else is the assessment.
$isPlaybook = strpos($path, 'admin/') === 0;
$isPage = $isVisits || $path === 'index.html' || $path === 'admin/index.html';
if (strpos($path, '..') !== false || strpos($path, "\0") !== false) {
    http_response_code(400);
    exit;
}

if (isset($_GET['logout'])) {
    setcookie(COOKIE, '', ['expires' => 1, 'path' => '/timely/', 'secure' => true, 'httponly' => true, 'samesite' => 'Lax']);
    header('Location: /timely/', true, 303);
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['pin'])) {
    $dir = state_dir();
    $ipFile = $dir . '/ip-' . sign($key, 'ip|' . ($_SERVER['REMOTE_ADDR'] ?? '')) . '.json';
    $allFile = $dir . '/global.json';
    if (count(fails($ipFile)) >= IP_MAX_FAIL || count(fails($allFile)) >= GLOBAL_MAX) {
        http_response_code(429);
        visit('pin_locked');
        $error = 'Too many tries. Please wait 15 minutes and try again.';
    } else {
        $pin = preg_replace('/\D/', '', (string)$_POST['pin']);
        $mac = sign($key, 'pin:' . $pin);
        $scope = ($adminMac !== '' && hash_equals($adminMac, $mac)) ? 'a' : (hash_equals($pinMac, $mac) ? 'c' : (($viewerMac !== '' && hash_equals($viewerMac, $mac)) ? 'v' : ''));
        // Client and viewer PINs never open the playbook.
        if (($scope === 'c' || $scope === 'v') && $isPlaybook) $scope = '';
        if ($scope !== '') {
            visit('pin_ok', $scope);
            set_auth($key, $scope);
            $back = '/timely/' . preg_replace('#(^|/)index\.html$#', '$1', $path);
            header('Location: ' . $back, true, 303);
            exit;
        }
        visit('pin_wrong');
        add_fail($ipFile);
        add_fail($allFile);
        usleep(400000);
        $error = 'That PIN didn’t match. Try again.';
    }
}

$scope = auth_scope($key);
if ($scope === '' || ($isPlaybook && $scope !== 'a')) {
    // Only the page itself shows the PIN screen; sub-resources just 401.
    if (!$isPage) {
        http_response_code(401);
        exit;
    }
    header('Cache-Control: no-store');
    if (!$error) http_response_code(401);
    if (!$error) visit('gate_shown');
    render_gate($error, $isPlaybook);
    exit;
}

if ($isVisits) { render_visits(); exit; }

// ---------------------------------------------------------------- serve file
$blob = __DIR__ . '/blob/' . substr(sign($key, 'path:' . $path), 0, 40) . '.bin';
if (!is_file($blob)) {
    http_response_code(404);
    exit('Not found.');
}
$raw = (string)file_get_contents($blob);
$iv = substr($raw, 0, 12);
$tag = substr($raw, -16);
$ct = substr($raw, 12, -16);
$plain = openssl_decrypt($ct, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag, $path);
if ($plain === false) {
    http_response_code(500);
    exit('Could not open file.');
}

$types = [
    'html' => 'text/html; charset=utf-8', 'js' => 'text/javascript; charset=utf-8',
    'mjs' => 'text/javascript; charset=utf-8', 'css' => 'text/css; charset=utf-8',
    'json' => 'application/json; charset=utf-8', 'txt' => 'text/plain; charset=utf-8',
    'md' => 'text/plain; charset=utf-8', 'csv' => 'text/plain; charset=utf-8',
    'xml' => 'text/plain; charset=utf-8', 'log' => 'text/plain; charset=utf-8',
    'svg' => 'image/svg+xml', 'png' => 'image/png', 'jpg' => 'image/jpeg',
    'jpeg' => 'image/jpeg', 'webp' => 'image/webp', 'gif' => 'image/gif',
    'ico' => 'image/x-icon', 'pdf' => 'application/pdf', 'woff2' => 'font/woff2',
];
$ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
$type = $types[$ext] ?? 'application/octet-stream';
header('Content-Type: ' . $type);
header($ext === 'html' ? 'Cache-Control: private, no-cache' : 'Cache-Control: private, max-age=3600');
if (strpos($type, 'text/') === 0 || strpos($type, 'json') !== false || $ext === 'svg') {
    if (!ini_get('zlib.output_compression') && function_exists('ob_gzhandler')) ob_start('ob_gzhandler');
}
echo $plain;
if ($isPage) {
    $row = visit('open', $scope);
    if ($scope === 'c' && $row !== null) notify_open($row);
}

// ---------------------------------------------------------------- PIN screen
function render_gate(string $error, bool $playbook): void {
    $err = htmlspecialchars($error, ENT_QUOTES);
    $action = $playbook ? '/timely/admin/' : '/timely/';
    $len = $playbook ? ADMIN_LEN : PIN_LEN;
    ?><!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#F5F1E8" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#161412" media="(prefers-color-scheme: dark)">
<title><?= $playbook ? 'Timely Playbook (internal)' : 'Timely Drywall Assessment' ?> · MN Clockworks</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@400;500;600&family=Geist+Mono:wght@500&display=swap" rel="stylesheet">
<?php render_gate_styles(); ?>

</head>
<body>
<main class="card">
  <div class="brand"><span class="dot"></span>MN Clockworks</div>
<?php if ($playbook): ?>
  <p class="badge">Internal · Not for the client</p>
  <p class="kicker">Impact Playbook</p>
  <h1>Timely <em>Playbook</em></h1>
  <p class="sub">Parker’s operating plan: actions, costs, expected lift and how we measure it. Enter the PIN to open it.</p>
<?php else: ?>
  <p class="kicker">Online Presence Assessment</p>
  <h1>Timely <em>Drywall</em></h1>
  <p class="sub">This report is private. Enter the <?= PIN_LEN ?>-digit PIN to view it.</p>
  <p style="margin:0 0 24px;color:var(--muted);font-size:12px;line-height:1.5"><?= htmlspecialchars("This page records when it's opened (time, " . (IP_MODE === 'hashed' ? 'a scrambled IP' : 'IP address') . " and device type) for security and so Parker can follow up. Parker can also open it. Records are deleted after 90 days. Your PIN is never stored. You can change your PIN anytime. Just ask Parker.", ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?> <a href="/timely/privacy">Privacy details</a></p>
<?php endif; ?>
  <form method="post" action="<?= $action ?>" id="f" autocomplete="off">
    <label for="pin" class="sr" style="position:absolute;left:-9999px">PIN</label>
    <div class="boxes<?= $err ? ' shake' : '' ?>" id="boxes" aria-hidden="true">
      <?= str_repeat('<div class="box"></div>', $len) ?>
    </div>
    <input class="pin" id="pin" name="pin" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="<?= $len ?>" autocomplete="one-time-code" autofocus required>
    <div class="err" role="alert"><?= $err ?></div>
    <button type="submit"><?= $playbook ? 'Open the playbook' : 'View the assessment' ?></button>
  </form>
  <p class="foot">Prepared by MN Clockworks · mnclockworks.com</p>
</main>
<script>
  const pin=document.getElementById('pin'),boxes=[...document.querySelectorAll('.box')],f=document.getElementById('f');
  function paint(){const L=<?= $len ?>,v=pin.value.replace(/\D/g,'').slice(0,L);pin.value=v;boxes.forEach((b,i)=>{b.textContent=v[i]?'•':'';b.classList.toggle('on',!!v[i]);b.classList.toggle('cur',i===v.length&&document.activeElement===pin)});if(v.length===L)f.requestSubmit?f.requestSubmit():f.submit()}
  document.getElementById('boxes').addEventListener('click',()=>pin.focus());
  pin.addEventListener('input',paint);pin.addEventListener('focus',paint);pin.addEventListener('blur',paint);paint();
</script>
</body>
</html>
<?php
}

function render_gate_styles(): void {
    ?><style>
  :root{--paper:#F5F1E8;--card:#FBF8F1;--ink:#1A1916;--muted:#6B645A;--line:#E3DACB;--copper:#D4582A;--copper-ink:#A8401A;--navy:#7A5A10;--err:#A8401A}
  @media (prefers-color-scheme:dark){:root{--paper:#161412;--card:#1F1C19;--ink:#F3EEE4;--muted:#A89F92;--line:#34302A;--copper:#E0703F;--copper-ink:#F08A5C;--navy:#E2B84A;--err:#F08A5C}}
  *{box-sizing:border-box}
  html,body{margin:0;height:100%}
  body{min-height:100dvh;display:grid;place-items:center;background:radial-gradient(120% 70% at 50% 0%,color-mix(in srgb,var(--copper) 10%,var(--paper)),var(--paper) 60%);color:var(--ink);font-family:Geist,system-ui,-apple-system,sans-serif;padding:max(24px,env(safe-area-inset-top)) 20px max(24px,env(safe-area-inset-bottom));-webkit-tap-highlight-color:transparent}
  .card{width:100%;max-width:400px;background:var(--card);border:1px solid var(--line);border-radius:24px;padding:32px 26px 26px;box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 24px 60px -24px rgba(40,25,10,.25);text-align:center;animation:rise .5s cubic-bezier(.2,.8,.2,1) both}
  @keyframes rise{from{opacity:0;transform:translateY(12px)}}
  .brand{display:flex;align-items:center;justify-content:center;gap:10px;font-family:'Instrument Serif',serif;font-size:22px}
  .dot{width:10px;height:10px;border-radius:50%;background:var(--copper)}
  .badge{display:inline-block;margin:18px 0 0;padding:6px 12px;border-radius:999px;background:var(--ink);color:var(--paper);font:500 10.5px/1 'Geist Mono',monospace;letter-spacing:.14em;text-transform:uppercase}
  .kicker{margin:22px 0 6px;font:500 11px/1 'Geist Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--copper-ink)}
  h1{margin:0;font:400 38px/1.05 'Instrument Serif',serif;letter-spacing:-.01em}
  h1 em{color:var(--navy)}
  p.sub{margin:10px 0 24px;color:var(--muted);font-size:15px;line-height:1.5}
  .boxes{display:flex;gap:10px;justify-content:center;margin-bottom:8px}
  .box{flex:0 1 52px;min-width:0;height:62px;border:1.5px solid var(--line);border-radius:14px;display:grid;place-items:center;font:500 28px 'Geist Mono',monospace;background:var(--paper);transition:border-color .15s,transform .15s}
  .box.on{border-color:var(--copper);transform:translateY(-2px)}
  .box.cur{border-color:var(--copper);box-shadow:0 0 0 4px color-mix(in srgb,var(--copper) 18%,transparent)}
  input.pin{position:absolute;opacity:0;pointer-events:none;width:1px;height:1px}
  .err{min-height:22px;margin:8px 0 4px;color:var(--err);font-size:14px}
  .shake{animation:shake .4s}
  @keyframes shake{20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
  button{width:100%;min-height:52px;border:0;border-radius:14px;background:var(--copper);color:#fff;font:600 16px Geist,system-ui,sans-serif;cursor:pointer;transition:transform .1s,filter .15s}
  button:active{transform:scale(.98)}
  button:focus-visible,.boxes:focus-within .box.cur{outline:none}
  button:focus-visible{box-shadow:0 0 0 4px color-mix(in srgb,var(--copper) 35%,transparent)}
  a{color:var(--copper-ink)}
  .foot{margin-top:18px;color:var(--muted);font-size:12.5px}
  @media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style><?php
}

function render_privacy(): void {
    http_response_code(200);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    ?><!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<title>Privacy Details for Client Report Pages</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@400;500;600&family=Geist+Mono:wght@500&display=swap" rel="stylesheet">
<?php render_gate_styles(); ?>

<style>
  .card{max-width:720px;text-align:left;animation:none}
  h2{margin:28px 0 12px;font:400 28px/1.15 'Instrument Serif',serif}
  p{font-size:15px;line-height:1.65}
  p:first-of-type{color:var(--muted);font-size:13px}
</style>
</head>
<body>
<main class="card">
<h1>Privacy Details for Client Report Pages</h1>
<p>Last updated October 21, 2026</p>
<p>This page adds to the MN Clockworks Privacy Notice and covers client report pages only.</p>
<h2>Client Report Pages</h2>
<p>Some client report pages are protected by a PIN. When one is opened, we record the time, the IP address, the device type and whether the client's PIN or MN Clockworks' PIN was used. We use this to keep the page secure and to know when a report has been opened. We delete these records after 90 days, though copies in routine website backups may last longer until those backups are replaced. Only Parker sees these records. We never sell or share them, except with the company that hosts our website or when the law requires it. Our web host also keeps its own standard server logs, which include IP addresses. We never store PINs.</p>
<p><a href="/portal/client/#/privacy-notice">MN Clockworks Privacy Notice</a></p>
</main>
</body>
</html>
<?php
}
