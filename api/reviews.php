<?php
declare(strict_types=1);

// Host settings must never turn PHP warnings into public response content.
ini_set('display_errors', '0');
ini_set('log_errors', '1');

function cw_disabled(): array { return ['enabled' => false, 'reviews' => []]; }

function cw_normalize(array $raw, int $max = 5): array {
    $reviews = [];
    foreach (array_slice($raw['reviews'] ?? [], 0, max(1, min(5, $max))) as $r) {
        $author = $r['authorAttribution'] ?? [];
        $text = $r['text'] ?? [];
        $original = $r['originalText'] ?? [];
        $reviews[] = [
            'authorName' => (string)($author['displayName'] ?? ''),
            'authorUri' => (string)($author['uri'] ?? ''),
            'authorPhotoUri' => (string)($author['photoUri'] ?? ''),
            'rating' => (float)($r['rating'] ?? 0),
            'text' => (string)($text['text'] ?? ''),
            'relativeTime' => (string)($r['relativePublishTimeDescription'] ?? ''),
            'publishTime' => (string)($r['publishTime'] ?? ''),
            'googleMapsUri' => (string)($r['googleMapsUri'] ?? ''),
            'flagContentUri' => (string)($r['flagContentUri'] ?? ''),
            'translated' => isset($text['languageCode'], $original['languageCode']) && $text['languageCode'] !== $original['languageCode'],
            'originalLanguage' => (string)($original['languageCode'] ?? $text['languageCode'] ?? ''),
        ];
    }
    if (!$reviews) return cw_disabled();
    return ['enabled' => true, 'place' => [
        'name' => (string)($raw['displayName']['text'] ?? ''),
        'rating' => (float)($raw['rating'] ?? 0),
        'userRatingCount' => (int)($raw['userRatingCount'] ?? 0),
        'googleMapsUri' => (string)($raw['googleMapsUri'] ?? ''),
    ], 'reviews' => $reviews, 'fetchedAt' => gmdate('c')];
}

function cw_cached(string $file, int $age, string $placeId): ?array {
    clearstatcache(true, $file);
    if (!is_file($file) || time() - (int)filemtime($file) > $age) return null;
    $entry = json_decode((string)file_get_contents($file), true);
    return is_array($entry) && ($entry['placeId'] ?? '') === $placeId && is_array($entry['data'] ?? null) ? $entry['data'] : null;
}

function cw_reviews(array $config, ?string $refresh = null, ?string $cacheDir = null, ?callable $fetch = null): array {
    // Fixture injection is impossible in a web SAPI, regardless of environment variables.
    if (PHP_SAPI === 'cli' && ($fixture = getenv('CW_REVIEWS_FIXTURE'))) {
        return cw_normalize(json_decode((string)file_get_contents($fixture), true, 512, JSON_THROW_ON_ERROR), (int)($config['max_reviews'] ?? 5));
    }
    if (empty($config['api_key']) || empty($config['place_id'])) return cw_disabled();
    $dir = $cacheDir ?? __DIR__ . '/_cache';
    if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) return cw_disabled();
    $file = $dir . '/reviews.json';
    $id = (string)$config['place_id'];
    $ttl = max(60, min(604800, (int)($config['ttl'] ?? 86400)));
    $purge = !empty($config['refresh_token']) && $refresh !== null && hash_equals((string)$config['refresh_token'], $refresh);
    if (!$purge && ($cached = cw_cached($file, $ttl, $id)) !== null) return $cached;
    $lock = fopen($dir . '/refresh.lock', 'c');
    if (!$lock) return cw_cached($file, 604800, $id) ?? cw_disabled();
    if (!flock($lock, LOCK_EX | LOCK_NB)) { fclose($lock); return cw_cached($file, 604800, $id) ?? cw_disabled(); }
    try {
        if (!$purge && ($cached = cw_cached($file, $ttl, $id)) !== null) return $cached;
        if ($fetch) {
            $raw = $fetch(); // CLI tests inject a transport; never derived from request input.
        } else {
            if (!function_exists('curl_init')) throw new RuntimeException('cURL unavailable');
            $ch = curl_init('https://places.googleapis.com/v1/places/' . rawurlencode($id) . '?languageCode=en');
            curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8, CURLOPT_CONNECTTIMEOUT => 8,
                CURLOPT_HTTPHEADER => ['X-Goog-Api-Key: ' . $config['api_key'], 'X-Goog-FieldMask: id,displayName,rating,userRatingCount,googleMapsUri,reviews']]);
            $body = curl_exec($ch);
            $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
            curl_close($ch);
            if ($body === false || $status !== 200) throw new RuntimeException('Places request failed (HTTP ' . $status . ')');
            $raw = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
        }
        if (!is_array($raw) || isset($raw['error']) || !isset($raw['id'])) throw new RuntimeException('Invalid Places response');
        $data = cw_normalize($raw, (int)($config['max_reviews'] ?? 5));
        $temp = tempnam($dir, 'refresh-');
        if ($temp === false) throw new RuntimeException('Cache temporary file failed');
        try {
            if (file_put_contents($temp, json_encode(['placeId' => $id, 'data' => $data], JSON_THROW_ON_ERROR)) === false || !rename($temp, $file)) throw new RuntimeException('Cache write failed');
        } finally { if (is_file($temp)) unlink($temp); }
        return $data;
    } catch (Throwable $e) {
        // Never log upstream bodies or credentials.
        error_log('MN Clockworks reviews: refresh failed (' . get_class($e) . ')');
        return cw_cached($file, 604800, $id) ?? cw_disabled();
    } finally { flock($lock, LOCK_UN); fclose($lock); }
}

if (!defined('CW_REVIEWS_TEST')) {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: public, max-age=3600');
    try {
        $config = is_file(__DIR__ . '/_reviews-config.php') ? require __DIR__ . '/_reviews-config.php' : [];
        echo json_encode(cw_reviews(is_array($config) ? $config : [], is_string($_GET['refresh'] ?? null) ? $_GET['refresh'] : null), JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    } catch (Throwable $e) { error_log('MN Clockworks reviews: configuration failure'); echo json_encode(cw_disabled()); }
}
