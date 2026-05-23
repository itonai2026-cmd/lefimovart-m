<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/auth.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_response(['error' => 'Method not allowed'], 405); }

$payload = require_auth();
$input = !empty($_POST) ? $_POST : (json_decode(file_get_contents('php://input'), true) ?: []);

$prompt = $input['prompt'] ?? '';
$model = $input['model'] ?? 'wan_fast';
$duration = intval($input['duration'] ?? 8);

global $MODELS_CONFIG, $pdo;
if (trim($prompt) === '') { json_response(['error' => 'Prompt required'], 400); }
if (!isset($MODELS_CONFIG[$model])) { json_response(['error' => 'Invalid model'], 400); }
if (FAL_AI_API_KEY === '') { json_response(['error' => 'FAL.ai video generation is not configured'], 500); }

$config = $MODELS_CONFIG[$model];
$cost = $config['base_credit_cost'];
$user = get_authenticated_user();

if (!$user || $user['credits'] < $cost) { json_response(['error' => 'Insufficient credits'], 400); }

// Call FAL.AI
$fal_payload = [
    'prompt' => $prompt,
    $config['duration_param'] => $config['duration_map'][$duration] ?? 81,
];
if ($config['fps_default']) $fal_payload['fps'] = $config['fps_default'];

$ch = curl_init($config['api_endpoint']);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($fal_payload),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Key ' . FAL_AI_API_KEY
    ],
    CURLOPT_TIMEOUT => 30
]);
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error = curl_error($ch);
curl_close($ch);

$result = json_decode($response, true);
if ($http_code < 200 || $http_code >= 300 || !$result || !isset($result['request_id'])) {
    json_response(['error' => $result['detail'] ?? ($curl_error ?: 'Video generation failed')], 502);
}

// Save to DB with status_url for polling
$vid_dir = __DIR__ . '/../../vid';
if (!is_dir($vid_dir)) mkdir($vid_dir, 0755, true);

$stmt = $pdo->prepare('INSERT INTO videos (user_id, user_email, prompt, model_used, resolution, duration, format, video_url, credits_deducted, status, queue_id, status_url, response_url, api_endpoint) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
$stmt->execute([
    $user['id'],
    $user['email'],
    $prompt,
    $model,
    '1080p',
    $duration,
    'mp4',
    '',
    $cost,
    'processing',
    $result['request_id'],
    $result['status_url'] ?? '',
    $result['response_url'] ?? '',
    $config['api_endpoint']
]);
$vid_id = $pdo->lastInsertId();

// Deduct credits
$upd = $pdo->prepare('UPDATE users SET credits = credits - ? WHERE id = ?');
$upd->execute([$cost, $user['id']]);

json_response([
    'ok' => true,
    'video_id' => $vid_id,
    'status' => 'processing',
    'queue_id' => $result['request_id'],
    'credits_remaining' => $user['credits'] - $cost
]);
