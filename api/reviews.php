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
    ], 'reviews' => $reviews];
}

function cw_reviews(array $config, ?callable $fetch = null): array {
    if (($config['legal_pages_live'] ?? false) !== true || empty($config['api_key']) || empty($config['place_id'])) return cw_disabled();
    $id = (string)$config['place_id'];
    try {
        // Fixture and transport injection are CLI-only, never request-controlled.
        if (PHP_SAPI === 'cli' && ($fixture = getenv('CW_REVIEWS_FIXTURE'))) {
            $raw = json_decode((string)@file_get_contents($fixture), true, 512, JSON_THROW_ON_ERROR);
        } elseif (PHP_SAPI === 'cli' && $fetch) {
            $raw = $fetch();
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
        if (!is_array($raw) || isset($raw['error']) || empty($raw['id'])) throw new RuntimeException('Invalid Places response');
        return cw_normalize($raw, (int)($config['max_reviews'] ?? 5));
    } catch (Throwable $e) {
        // Never log upstream bodies or credentials.
        error_log('MN Clockworks reviews: request failed');
        return cw_disabled();
    }
}

if (!defined('CW_REVIEWS_TEST')) {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    try {
        $config = is_file(__DIR__ . '/_reviews-config.php') ? require __DIR__ . '/_reviews-config.php' : [];
        echo json_encode(cw_reviews(is_array($config) ? $config : []), JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    } catch (Throwable $e) { error_log('MN Clockworks reviews: configuration failure'); echo json_encode(cw_disabled()); }
}
