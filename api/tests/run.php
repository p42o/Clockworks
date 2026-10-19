<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
define('CW_REVIEWS_TEST', true);
require dirname(__DIR__) . '/reviews.php';
$count = 0;
function check(bool $ok, string $label): void { global $count; if (!$ok) throw new RuntimeException($label); ++$count; echo "PASS $label\n"; }
putenv('CW_REVIEWS_FIXTURE');
check(cw_reviews([]) === cw_disabled(), 'missing config disabled');
check(cw_reviews(['api_key' => '', 'place_id' => 'test']) === cw_disabled(), 'empty key disabled');
check(cw_reviews(['api_key' => 'test', 'place_id' => '']) === cw_disabled(), 'empty place disabled');
$fixture = __DIR__ . '/fixtures/places-details.TEST-ONLY.json';
$raw = json_decode(file_get_contents($fixture), true, 512, JSON_THROW_ON_ERROR);
check($raw['_TEST_ONLY'] === true, 'fixture marked test only');
putenv('CW_REVIEWS_FIXTURE=' . $fixture);
$data = cw_reviews([]);
check($data['enabled'] && count($data['reviews']) === 2, 'CLI fixture normalized');
check($data['reviews'][0]['translated'] && $data['reviews'][0]['originalLanguage'] === 'es', 'translation detected');
check(str_contains($data['reviews'][0]['text'], '<script>'), 'text preserved for text rendering');
check($data['reviews'][1]['text'] === '' && !$data['reviews'][1]['translated'], 'rating-only review retained');
check(isset($data['place']['googleMapsUri'], $data['fetchedAt'], $data['reviews'][0]['flagContentUri']), 'attribution fields retained');
check(count(cw_normalize($raw, 1)['reviews']) === 1, 'max reviews enforced');
check(cw_normalize(['reviews' => []]) === cw_disabled(), 'no reviews disabled');
putenv('CW_REVIEWS_FIXTURE');
$dir = sys_get_temp_dir() . '/cw-reviews-tests-' . bin2hex(random_bytes(6));
mkdir($dir);
$config = ['api_key' => 'TEST-ONLY', 'place_id' => 'TEST-ONLY-NOT-A-PLACE', 'ttl' => 86400, 'refresh_token' => 'TEST-ONLY-token'];
$calls = 0;
$fetch = function () use (&$calls, $raw): array { ++$calls; return $raw; };
$fail = function (): array { throw new RuntimeException('TEST-ONLY simulated upstream failure'); };
try {
    $fresh = cw_reviews($config, null, $dir, $fetch);
    check($calls === 1 && $fresh['enabled'], 'cache populated via injected transport, no network');
    check(cw_reviews($config, 'wrong', $dir, $fetch) == $fresh && $calls === 1, 'fresh cache and invalid refresh token use no request');
    cw_reviews($config, 'TEST-ONLY-token', $dir, $fetch);
    check($calls === 2, 'valid refresh token refreshes');
    $lock = fopen($dir . '/refresh.lock', 'c'); flock($lock, LOCK_EX);
    touch($dir . '/reviews.json', time() - 90000); clearstatcache();
    check(cw_reviews($config, null, $dir, $fetch)['enabled'] && $calls === 2, 'lock contention serves stale without fetching');
    flock($lock, LOCK_UN); fclose($lock);
    check(cw_reviews($config, null, $dir, $fail)['enabled'], 'upstream failure serves stale cache');
    touch($dir . '/reviews.json', time() - 604801); clearstatcache();
    check(cw_reviews($config, null, $dir, $fail) === cw_disabled(), 'cache older than seven days disabled');
    file_put_contents($dir . '/reviews.json', 'invalid json'); clearstatcache();
    check(cw_reviews($config, null, $dir, $fail) === cw_disabled(), 'corrupt cache disabled');
    unlink($dir . '/reviews.json');
    check(cw_reviews($config, null, $dir, $fail) === cw_disabled(), 'failure without cache disabled');
} finally { foreach (glob($dir . '/*') as $f) unlink($f); rmdir($dir); }
echo "$count checks passed; no Google API requests made.\n";
