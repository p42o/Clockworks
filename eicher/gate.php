<?php
/**
 * PIN gate for the Eicher assessment.
 *
 * The report is committed to this (public) repo only as AES-256-GCM
 * ciphertext in blob/. The key and the PIN's HMAC live in _config.php,
 * which the deploy workflow writes from GitHub secrets and which is never
 * committed. Every request under /eicher/ is rewritten here: unauthenticated
 * visitors get the PIN screen, authenticated ones get the decrypted file.
 */

declare(strict_types=1);

const COOKIE      = 'eicher_auth';
const COOKIE_DAYS = 30;
const IP_MAX_FAIL = 8;      // per IP, per window
const GLOBAL_MAX  = 60;     // all IPs combined, per window
const WINDOW_SECS = 900;    // 15 minutes

header('X-Robots-Tag: noindex, nofollow, noarchive');
header('Referrer-Policy: no-referrer');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

$cfgFile = __DIR__ . '/_config.php';
if (!is_file($cfgFile)) {
    http_response_code(503);
    exit('Not configured.');
}
$cfg = require $cfgFile;
$key = base64_decode($cfg['key'], true);
$pinMac = $cfg['pin'];
if ($key === false || strlen($key) !== 32) {
    http_response_code(503);
    exit('Not configured.');
}

// ---------------------------------------------------------------- auth cookie
function sign(string $key, string $msg): string {
    return hash_hmac('sha256', $msg, $key);
}
function is_authed(string $key): bool {
    $c = $_COOKIE[COOKIE] ?? '';
    if (!preg_match('/^(\d{10})\.([a-f0-9]{64})$/', $c, $m)) return false;
    if ((int)$m[1] < time()) return false;
    return hash_equals(sign($key, 'auth|' . $m[1]), $m[2]);
}
function set_auth(string $key): void {
    $exp = time() + COOKIE_DAYS * 86400;
    setcookie(COOKIE, $exp . '.' . sign($key, 'auth|' . $exp), [
        'expires' => $exp, 'path' => '/eicher/', 'secure' => true,
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

$path = $_GET['p'] ?? '';
$path = ltrim(str_replace('\\', '/', $path), '/');
if ($path === 'admin') { header('Location: /eicher/admin/', true, 301); exit; }  // keep relative asset URLs right
if ($path === '' || substr($path, -1) === '/') $path .= 'index.html';
// /eicher/admin/ is Parker's internal playbook; everything else is the assessment.
$isPlaybook = strpos($path, 'admin/') === 0;
$isPage = $path === 'index.html' || $path === 'admin/index.html';
if (strpos($path, '..') !== false || strpos($path, "\0") !== false) {
    http_response_code(400);
    exit;
}

if (isset($_GET['logout'])) {
    setcookie(COOKIE, '', ['expires' => 1, 'path' => '/eicher/', 'secure' => true, 'httponly' => true, 'samesite' => 'Lax']);
    header('Location: /eicher/', true, 303);
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['pin'])) {
    $dir = state_dir();
    $ipFile = $dir . '/ip-' . sign($key, 'ip|' . ($_SERVER['REMOTE_ADDR'] ?? '')) . '.json';
    $allFile = $dir . '/global.json';
    if (count(fails($ipFile)) >= IP_MAX_FAIL || count(fails($allFile)) >= GLOBAL_MAX) {
        http_response_code(429);
        $error = 'Too many tries. Please wait 15 minutes and try again.';
    } else {
        $pin = preg_replace('/\D/', '', (string)$_POST['pin']);
        if (hash_equals($pinMac, sign($key, 'pin:' . $pin))) {
            set_auth($key);
            $back = '/eicher/' . preg_replace('#(^|/)index\.html$#', '$1', $path);
            header('Location: ' . $back, true, 303);
            exit;
        }
        add_fail($ipFile);
        add_fail($allFile);
        usleep(400000);
        $error = 'That PIN didn’t match. Try again.';
    }
}

if (!is_authed($key)) {
    // Only the page itself shows the PIN screen; sub-resources just 401.
    if (!$isPage) {
        http_response_code(401);
        exit;
    }
    header('Cache-Control: no-store');
    if (!$error) http_response_code(401);
    render_gate($error, $isPlaybook);
    exit;
}

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

// ---------------------------------------------------------------- PIN screen
function render_gate(string $error, bool $playbook): void {
    $err = htmlspecialchars($error, ENT_QUOTES);
    $action = $playbook ? '/eicher/admin/' : '/eicher/';
    ?><!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#F5F1E8" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#161412" media="(prefers-color-scheme: dark)">
<title><?= $playbook ? 'Eicher Playbook (internal)' : 'Eicher Assessment' ?> · MN Clockworks</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@400;500;600&family=Geist+Mono:wght@500&display=swap" rel="stylesheet">
<style>
  :root{--paper:#F5F1E8;--card:#FBF8F1;--ink:#1A1916;--muted:#6B645A;--line:#E3DACB;--copper:#D4582A;--copper-ink:#A8401A;--navy:#1B3A5C;--err:#A8401A}
  @media (prefers-color-scheme:dark){:root{--paper:#161412;--card:#1F1C19;--ink:#F3EEE4;--muted:#A89F92;--line:#34302A;--copper:#E0703F;--copper-ink:#F08A5C;--navy:#9DB8D9;--err:#F08A5C}}
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
  .box{width:52px;height:62px;border:1.5px solid var(--line);border-radius:14px;display:grid;place-items:center;font:500 28px 'Geist Mono',monospace;background:var(--paper);transition:border-color .15s,transform .15s}
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
  .foot{margin-top:18px;color:var(--muted);font-size:12.5px}
  @media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>
</head>
<body>
<main class="card">
  <div class="brand"><span class="dot"></span>MN Clockworks</div>
<?php if ($playbook): ?>
  <p class="badge">Internal · Not for the client</p>
  <p class="kicker">Impact Playbook</p>
  <h1>Eicher <em>Playbook</em></h1>
  <p class="sub">Parker’s operating plan: actions, costs, expected lift and how we measure it. Enter the PIN to open it.</p>
<?php else: ?>
  <p class="kicker">Online Presence Assessment</p>
  <h1>Eicher <em>Plumbing</em></h1>
  <p class="sub">This report is private. Enter the 5-digit PIN to view it.</p>
<?php endif; ?>
  <form method="post" action="<?= $action ?>" id="f" autocomplete="off">
    <label for="pin" class="sr" style="position:absolute;left:-9999px">PIN</label>
    <div class="boxes<?= $err ? ' shake' : '' ?>" id="boxes" aria-hidden="true">
      <div class="box"></div><div class="box"></div><div class="box"></div><div class="box"></div><div class="box"></div>
    </div>
    <input class="pin" id="pin" name="pin" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="5" autocomplete="one-time-code" autofocus required>
    <div class="err" role="alert"><?= $err ?></div>
    <button type="submit"><?= $playbook ? 'Open the playbook' : 'View the assessment' ?></button>
  </form>
  <p class="foot">Prepared by MN Clockworks · mnclockworks.com</p>
</main>
<script>
  const pin=document.getElementById('pin'),boxes=[...document.querySelectorAll('.box')],f=document.getElementById('f');
  function paint(){const v=pin.value.replace(/\D/g,'').slice(0,5);pin.value=v;boxes.forEach((b,i)=>{b.textContent=v[i]?'•':'';b.classList.toggle('on',!!v[i]);b.classList.toggle('cur',i===v.length&&document.activeElement===pin)});if(v.length===5)f.requestSubmit?f.requestSubmit():f.submit()}
  document.getElementById('boxes').addEventListener('click',()=>pin.focus());
  pin.addEventListener('input',paint);pin.addEventListener('focus',paint);pin.addEventListener('blur',paint);paint();
</script>
</body>
</html>
<?php
}
