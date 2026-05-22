<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/auth.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_response(['error' => 'Method not allowed'], 405); }

$payload = require_auth();
$input = json_decode(file_get_contents('php://input'), true);

$prompt = $input['prompt'] ?? '';
$resolution = $input['resolution'] ?? '1024';
if (empty($prompt)) { json_response(['error' => 'Prompt required'], 400); }

// Cost calculation
$cost_map = ['512' => 2, '1024' => 4];
$cost = $cost_map[$resolution] ?? 4;
$user = get_current_user();
if (!$user || $user['credits'] < $cost) { json_response(['error' => 'Insufficient credits'], 400); }

// Call FAL.AI
$fal_payload = [
    'prompt' => $prompt,
    'image_size' => [
        '512' => '512x512',
        '1024' => '1024x1024'
    ][$resolution] ?? '1024x1024'
];

$ch = curl_init(FAL_AI_BASE_URL . '/' . IMAGE_GEN_MODEL);
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
curl_close($ch);

$result = json_decode($response, true);
if (!$result || !isset($result['images'][0])) {
    json_response(['error' => 'AI generation failed'], 500);
}

$image_url = $result['images'][0]['url'] ?? '';

// Save to DB and deduct credits
global $pdo;
$stmt = $pdo->prepare('INSERT INTO generated_images (user_email, image_url, prompt) VALUES (?, ?, ?)');
$stmt->execute([$user['email'], $image_url, $prompt]);
$img_id = $pdo->lastInsertId();

$upd = $pdo->prepare('UPDATE users SET credits = credits - ? WHERE id = ?');
$upd->execute([$cost, $user['id']]);

json_response([
    'ok' => true,
    'image' => [
        'id' => $img_id,
        'url' => $image_url,
        'prompt' => $prompt
    ],
    'credits_remaining' => $user['credits'] - $cost
]);
