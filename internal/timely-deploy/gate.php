<?php
/**
 * Internal, admin-only page: Timely Drywall one-shot deploy prompt.
 *
 * Same pattern as /thenickel/ and /timely/: the page is committed only as
 * AES-256-GCM ciphertext in blob/, encrypted with TIMELY_KEY. There is no
 * client or viewer PIN here. Only Parker's shared admin PIN opens it, checked
 * against TIMELY_ADMIN_HMAC from timely/_config.php (written by the Deploy
 * workflow from GitHub secrets, never committed). No new secret.
 */

declare(strict_types=1);

const COOKIE      = 'cw_internal_td';
const BASE        = '/internal/timely-deploy/';
const ADMIN_LEN   = 4;
const COOKIE_DAYS = 1;
const IP_MAX_FAIL = 8;
const GLOBAL_MAX  = 60;
const WINDOW_SECS = 900;

header('X-Robots-Tag: noindex, nofollow, noarchive');
header('Referrer-Policy: no-referrer');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Cache-Control: no-store');

$sharedFile = dirname(__DIR__, 2) . '/timely/_config.php';
$shared = is_file($sharedFile) ? require $sharedFile : null;
$key = is_array($shared) ? base64_decode((string)($shared['key'] ?? ''), true) : false;
$adminMac = is_array($shared) ? (string)($shared['admin'] ?? '') : '';
unset($shared);
if ($key === false || strlen($key) !== 32 || !preg_match('/^[a-f0-9]{64}$/', $adminMac)) {
    http_response_code(503);
    exit('Not configured.');
}

function sign(string $key, string $msg): string { return hash_hmac('sha256', $msg, $key); }
function authed(string $key): bool {
    $c = $_COOKIE[COOKIE] ?? '';
    if (!preg_match('/^a\.(\d{10})\.([a-f0-9]{64})$/', $c, $m)) return false;
    if ((int)$m[1] < time()) return false;
    return hash_equals(sign($key, 'internal-td|a|' . $m[1]), $m[2]);
}
function cookie_opts(int $exp): array {
    return ['expires' => $exp, 'path' => BASE, 'secure' => true, 'httponly' => true, 'samesite' => 'Strict'];
}
function state_dir(): string { $d = __DIR__ . '/_state'; if (!is_dir($d)) @mkdir($d, 0700); return $d; }
function fails(string $f): array {
    $now = time();
    $l = is_file($f) ? (json_decode((string)@file_get_contents($f), true) ?: []) : [];
    return array_values(array_filter($l, fn($t) => $t > $now - WINDOW_SECS));
}
function add_fail(string $f): void { $l = fails($f); $l[] = time(); @file_put_contents($f, json_encode($l), LOCK_EX); }

$path = ltrim(str_replace('\\', '/', (string)($_GET['p'] ?? '')), '/');
if ($path === '' || substr($path, -1) === '/') $path .= 'index.html';
if (strpos($path, '..') !== false || strpos($path, "\0") !== false) { http_response_code(400); exit; }

if (isset($_GET['logout'])) {
    setcookie(COOKIE, '', cookie_opts(1));
    header('Location: ' . BASE, true, 303);
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
        if (hash_equals($adminMac, sign($key, 'pin:' . $pin))) {
            $exp = time() + COOKIE_DAYS * 86400;
            setcookie(COOKIE, 'a.' . $exp . '.' . sign($key, 'internal-td|a|' . $exp), cookie_opts($exp));
            header('Location: ' . BASE, true, 303);
            exit;
        }
        add_fail($ipFile); add_fail($allFile);
        usleep(400000);
        $error = 'That PIN didn’t match. Try again.';
    }
}

if (!authed($key)) {
    if ($path !== 'index.html') { http_response_code(401); exit; }
    if (!$error) http_response_code(401);
    render_gate($error);
    exit;
}

$blob = __DIR__ . '/blob/' . substr(sign($key, 'path:' . $path), 0, 40) . '.bin';
if (!is_file($blob)) { http_response_code(404); exit('Not found.'); }
$raw = (string)file_get_contents($blob);
$plain = openssl_decrypt(substr($raw, 12, -16), 'aes-256-gcm', $key, OPENSSL_RAW_DATA, substr($raw, 0, 12), substr($raw, -16), $path);
if ($plain === false) { http_response_code(500); exit('Could not open file.'); }
header('Content-Type: text/html; charset=utf-8');
echo $plain;

function render_gate(string $error): void {
    $err = htmlspecialchars($error, ENT_QUOTES);
    $len = ADMIN_LEN;
    ?><!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name=robots content=noindex,nofollow>
<meta name="theme-color" content="#F5F1E8" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#161412" media="(prefers-color-scheme: dark)">
<title>Internal · MN Clockworks</title>
<style>
  :root{--paper:#F5F1E8;--card:#FBF8F1;--ink:#1A1916;--muted:#6B645A;--line:#E3DACB;--copper:#D4582A;--copper-ink:#A8401A;--navy:#7A5A10;--err:#A8401A}
  @media (prefers-color-scheme:dark){:root{--paper:#161412;--card:#1F1C19;--ink:#F3EEE4;--muted:#A89F92;--line:#34302A;--copper:#E0703F;--copper-ink:#F08A5C;--navy:#E2B84A;--err:#F08A5C}}
  *{box-sizing:border-box}
  html,body{margin:0;height:100%}
  body{min-height:100dvh;display:grid;place-items:center;background:radial-gradient(120% 70% at 50% 0%,color-mix(in srgb,var(--copper) 10%,var(--paper)),var(--paper) 60%);color:var(--ink);font-family:Geist,system-ui,-apple-system,sans-serif;padding:max(24px,env(safe-area-inset-top)) 20px max(24px,env(safe-area-inset-bottom));-webkit-tap-highlight-color:transparent}
  .card{width:100%;max-width:400px;background:var(--card);border:1px solid var(--line);border-radius:24px;padding:32px 26px 26px;box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 24px 60px -24px rgba(40,25,10,.25);text-align:center}
  .brand{display:flex;align-items:center;justify-content:center;gap:10px;font:400 22px Georgia,'Times New Roman',serif}
  .dot{width:10px;height:10px;border-radius:50%;background:var(--copper)}
  .badge{display:inline-block;margin:18px 0 0;padding:6px 12px;border-radius:999px;background:var(--ink);color:var(--paper);font:500 10.5px/1 ui-monospace,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase}
  .kicker{margin:22px 0 6px;font:500 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--copper-ink)}
  h1{margin:0;font:400 34px/1.08 Georgia,'Times New Roman',serif;letter-spacing:-.01em}
  h1 em{color:var(--navy)}
  p.sub{margin:10px 0 24px;color:var(--muted);font-size:15px;line-height:1.5}
  .boxes{display:flex;gap:10px;justify-content:center;margin-bottom:8px}
  .box{flex:0 1 52px;min-width:0;height:62px;border:1.5px solid var(--line);border-radius:14px;display:grid;place-items:center;font:500 28px ui-monospace,Menlo,monospace;background:var(--paper)}
  .box.on{border-color:var(--copper)}
  .box.cur{border-color:var(--copper);box-shadow:0 0 0 4px color-mix(in srgb,var(--copper) 18%,transparent)}
  input.pin{position:absolute;opacity:0;pointer-events:none;width:1px;height:1px}
  .err{min-height:22px;margin:8px 0 4px;color:var(--err);font-size:14px}
  .shake{animation:shake .4s}
  @keyframes shake{20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
  button{width:100%;min-height:52px;border:0;border-radius:14px;background:var(--copper);color:#fff;font:600 16px Geist,system-ui,sans-serif;cursor:pointer}
  .foot{margin-top:18px;color:var(--muted);font-size:12.5px}
  @media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>
</head>
<body>
<main class="card">
  <div class="brand"><span class="dot"></span>MN Clockworks</div>
  <p class="badge">Internal · Admin only</p>
  <p class="kicker">Deploy kit</p>
  <h1>Timely <em>deploy prompt</em></h1>
  <p class="sub">Enter the admin PIN to open it.</p>
  <form method="post" action="<?= BASE ?>" id="f" autocomplete="off">
    <label for="pin" style="position:absolute;left:-9999px">Admin PIN</label>
    <div class="boxes<?= $err ? ' shake' : '' ?>" id="boxes" aria-hidden="true"><?= str_repeat('<div class="box"></div>', $len) ?></div>
    <input class="pin" id="pin" name="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="<?= $len ?>" autocomplete="off" autofocus required>
    <div class="err" role="alert"><?= $err ?></div>
    <button type="submit">Open</button>
  </form>
  <p class="foot">mnclockworks.com</p>
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
