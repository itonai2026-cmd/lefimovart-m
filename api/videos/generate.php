<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/auth.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_response(['error' => 'Method not allowed'], 405); }

$payload = require_auth();
$input = !empty($_POST) ? $_POST : (json_decode(file_get_contents('php://input'), true) ?: []);

$prompt = trim($input['prompt'] ?? '');
$model = $input['model'] ?? 'wan_27';
$duration = intval($input['duration'] ?? 8);
$aspect_ratio = $input['aspect_ratio'] ?? '16:9';
$resolution = trim($input['resolution'] ?? '');
$image_url = trim($input['image_url'] ?? '');

global $MODELS_CONFIG, $pdo;
if ($prompt === '' && $image_url === '') { json_response(['error' => 'Prompt or image required'], 400); }
if (!isset($MODELS_CONFIG[$model])) { json_response(['error' => 'Invalid model'], 400); }
if (FAL_AI_API_KEY === '') { json_response(['error' => 'FAL.ai video generation is not configured'], 500); }

$config = $MODELS_CONFIG[$model];

$allowed_ratios = $config['aspect_ratios'] ?? ['16:9', '9:16', '1:1'];
if (!in_array($aspect_ratio, $allowed_ratios)) {
    $aspect_ratio = '16:9';
}

// Resolve resolution — fall back to first available for this model
$available_res = $config['resolutions'] ?? ['default'];
if ($resolution === '' || !in_array($resolution, $available_res)) {
    $resolution = $available_res[0];
}

// Look up dynamic credit cost from cost_table
$cost_table = $config['cost_table'] ?? [];
$cost = $cost_table[$resolution][$duration]
     ?? $cost_table[$resolution][8]
     ?? reset($cost_table)[$duration]
     ?? 4;

$user = get_authenticated_user();
if (!$user || $user['credits'] < $cost) { json_response(['error' => 'Insufficient credits'], 400); }

$is_i2v = ($image_url !== '');

// Use resolution-specific endpoint if endpoint_map exists
$ep_key_t2v = 'api_endpoint';
$ep_key_i2v = 'api_endpoint_i2v';
if (isset($config['endpoint_map'][$resolution])) {
    $endpoint = $is_i2v
        ? $config['endpoint_map'][$resolution][$ep_key_i2v]
        : $config['endpoint_map'][$resolution][$ep_key_t2v];
} else {
    $endpoint = $is_i2v ? $config[$ep_key_i2v] : $config[$ep_key_t2v];
}

$fal_payload = [];

if ($prompt !== '') {
    $fal_payload['prompt'] = $prompt;
}

$duration_value = $config['duration_map'][$duration] ?? $config['duration_map'][8] ?? 8;
$fal_payload[$config['duration_param']] = $duration_value;

if ($is_i2v) {
    $fal_payload['image_url'] = $image_url;
}

// Send resolution to Fal.ai only when the model supports it (not 'default')
if ($resolution !== 'default') {
    $fal_payload['resolution'] = $resolution;
}

$fal_payload['aspect_ratio'] = $aspect_ratio;

if ($config['fps_default']) {
    $fal_payload['frame_rate'] = $config['fps_default'];
}

if (!empty($config['extra_params'])) {
    $fal_payload = array_merge($fal_payload, $config['extra_params']);
}

$ch = curl_init($endpoint);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($fal_payload),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Key ' . FAL_AI_API_KEY
    ],
    CURLOPT_CONNECTTIMEOUT => 15,
    CURLOPT_TIMEOUT => 60
]);
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_errno = curl_errno($ch);
$curl_error = curl_error($ch);
curl_close($ch);

$result = json_decode($response, true);
if ($http_code < 200 || $http_code >= 300 || !$result || !isset($result['request_id'])) {
    $message = $result['detail'] ?? '';
    if ($message === '') {
        $message = $curl_errno === CURLE_OPERATION_TIMEDOUT
            ? 'Video provider took too long to accept the request. Please try again.'
            : ($curl_error ?: 'Video generation failed');
    }
    json_response(['error' => $message], 502);
}

$vid_dir = __DIR__ . '/../../vid';
if (!is_dir($vid_dir)) mkdir($vid_dir, 0755, true);

$ip_address = $_SERVER['HTTP_X_FORWARDED_FOR']
    ?? $_SERVER['HTTP_X_REAL_IP']
    ?? $_SERVER['REMOTE_ADDR']
    ?? null;
if ($ip_address !== null) {
    $ip_address = trim(strtok($ip_address, ','));
}

$stmt = $pdo->prepare('INSERT INTO videos (user_id, user_email, prompt, image_path, model_used, resolution, duration, format, video_url, credits_deducted, status, queue_id, status_url, response_url, api_endpoint, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
$stmt->execute([
    $user['id'],
    $user['email'],
    $prompt,
    $is_i2v ? $image_url : null,
    $model,
    $resolution,
    $duration,
    'mp4',
    '',
    $cost,
    'processing',
    $result['request_id'],
    $result['status_url'] ?? '',
    $result['response_url'] ?? '',
    $endpoint,
    $ip_address
]);
$vid_id = $pdo->lastInsertId();

$upd = $pdo->prepare('UPDATE users SET credits = credits - ? WHERE id = ?');
$upd->execute([$cost, $user['id']]);

json_response([
    'ok' => true,
    'video_id' => $vid_id,
    'status' => 'processing',
    'queue_id' => $result['request_id'],
    'credits_remaining' => $user['credits'] - $cost
]);
