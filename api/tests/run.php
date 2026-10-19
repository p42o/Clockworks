<?php
// TEST-ONLY: all transports are fixtures; never makes network requests.
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
define('CW_REVIEWS_TEST', true);
require dirname(__DIR__) . '/reviews.php';
$count = 0;
function check(bool $ok, string $label): void { global $count; if (!$ok) throw new RuntimeException($label); ++$count; echo "PASS $label\n"; }
function snapshot(): array {
    $paths = [];
    foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator(dirname(__DIR__), FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::SELF_FIRST) as $file) $paths[] = $file->getPathname();
    foreach (glob(sys_get_temp_dir() . '/cw-*') ?: [] as $file) $paths[] = $file;
    sort($paths); return $paths;
}
putenv('CW_REVIEWS_FIXTURE');
$before = snapshot();
$raw = json_decode(file_get_contents(__DIR__ . '/fixtures/places-details.TEST-ONLY.json'), true, 512, JSON_THROW_ON_ERROR);
$config = ['legal_pages_live' => true, 'api_key' => 'TEST-ONLY', 'place_id' => 'TEST-ONLY-NOT-A-PLACE', 'max_reviews' => 5];
$calls = 0;
$fetch = function () use (&$calls, $raw): array { ++$calls; return $raw; };
foreach ([[], array_replace($config, ['api_key' => '']), array_replace($config, ['place_id' => ''])] as $c) check(cw_reviews($c, $fetch) === cw_disabled(), 'missing config or empty credential disabled');
foreach ([null, false, 'true', 1] as $switch) {
    $c = $config; unset($c['legal_pages_live']); if ($switch !== null) $c['legal_pages_live'] = $switch;
    check(cw_reviews($c, $fetch) === cw_disabled(), 'strict switch disabled: ' . json_encode($switch));
}
check($calls === 0, 'disabled configurations never call transport');
putenv('CW_REVIEWS_FIXTURE=' . __DIR__ . '/fixtures/places-details.TEST-ONLY.json');
$data = cw_reviews($config, $fetch);
putenv('CW_REVIEWS_FIXTURE');
check($raw['_TEST_ONLY'] && $data['enabled'] && count($data['reviews']) === 3, 'TEST-ONLY CLI fixture normalized');
check($calls === 0, 'CLI fixture bypasses network transport');
check($data['reviews'][0]['translated'] && $data['reviews'][0]['originalLanguage'] === 'es', 'translation detected');
check($data['reviews'][0]['text'] === $raw['reviews'][0]['text']['text'] && str_contains($data['reviews'][0]['text'], '<script>'), 'text preserved byte for byte including script');
check($data['reviews'][1]['text'] === '', 'rating-only retained');
check(array_column($data['reviews'], 'rating') === [4.0, 5.0, 1.0], 'one-star retained in exact upstream order');
check(strlen($data['reviews'][2]['text']) > 600 && $data['reviews'][2]['text'] === $raw['reviews'][2]['text']['text'], 'long one-star text unchanged');
foreach (['authorName','authorUri','authorPhotoUri','googleMapsUri','flagContentUri','relativeTime','publishTime'] as $field) check(array_key_exists($field, $data['reviews'][0]), 'attribution: ' . $field);
check(isset($data['place']['googleMapsUri']) && !array_key_exists('fetchedAt', $data), 'place attribution and no fetchedAt');
check(count(cw_normalize($raw, 1)['reviews']) === 1, 'max_reviews enforced');
$many = $raw; $many['reviews'] = array_merge($raw['reviews'], $raw['reviews'], $raw['reviews']);
check(count(cw_reviews(array_replace($config, ['max_reviews' => 99]), fn() => $many)['reviews']) === 5, 'max_reviews capped at five');
for ($i = 0; $i < 3; ++$i) check(cw_reviews($config, $fetch)['enabled'], 'consecutive success');
check($calls === 3, 'three calls perform three transports');
$fail = function () { throw new RuntimeException('TEST-ONLY failure'); };
check(cw_reviews($config, $fail) === cw_disabled(), 'success followed by failure has no stale fallback');
check(cw_reviews($config, $fail) === cw_disabled(), 'failure without success disabled');
foreach ([['error' => []], ['reviews' => $raw['reviews']], ['id' => 'TEST-ONLY', 'reviews' => []], null] as $invalid) check(cw_reviews($config, fn() => $invalid) === cw_disabled(), 'invalid upstream disabled');
putenv('CW_REVIEWS_FIXTURE=' . __DIR__ . '/fixtures/missing.TEST-ONLY.json');
check(cw_reviews($config) === cw_disabled(), 'unreadable fixture/bad JSON disabled');
putenv('CW_REVIEWS_FIXTURE');
check(!is_dir(dirname(__DIR__) . '/_cache') && snapshot() === $before, 'no cache directory or files created in api or cw-* temp entries');
$source = file_get_contents(dirname(__DIR__) . '/reviews.php');
check(str_contains($source, "header('Cache-Control: no-store')"), 'endpoint no-store header');
foreach (['max-age','refresh_token','$_GET','file_put_contents','flock','tempnam','_cache','apcu','static $'] as $term) check(!str_contains($source, $term), 'source excludes ' . $term);
$example = file_get_contents(dirname(__DIR__) . '/_reviews-config.example.php');
check(str_contains($example, "'legal_pages_live' => false") && !str_contains($example, 'ttl') && !str_contains($example, 'refresh_token'), 'example switch off and no obsolete config');
$ht = file_get_contents(dirname(__DIR__) . '/.htaccess');
check(str_contains($ht, 'Options -Indexes') && str_contains($ht, '^_|\\.json$') && str_contains($ht, '_cache|tests') && str_contains($ht, 'Require all denied'), 'Apache protections retained');
check(str_contains($ht, '<Files "reviews.php">') && str_contains($ht, 'Header always set Cache-Control "no-store"') && str_contains($ht, 'ExpiresActive Off'), 'Apache no-store and expires off');
echo "$count checks passed; no Google API requests made.\n";
