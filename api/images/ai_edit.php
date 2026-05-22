<?php
/**
 * AI image editing via FAL.AI.
 * POST { prompt, image_url }
 * Deducts credits, returns edited image URL.
 */
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/auth.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_response(['error' => 'Method not allowed'], 405); }

$payload = require_auth();
$input = json_decode(file_get_contents('php://input'), true);

$prompt = $input['prompt'] ?? '';
$image_url = $input['image_url'] ?? '';
if (empty($prompt)) { json_response(['error' => 'Prompt required'], 400); }
if (empty($image_url)) { json_response(['error' => 'Image URL required'], 400); }

$cost = 4; // same as 1024 generation
$user = get_authenticated_user();
if (!$user || $user['credits'] < $cost) { json_response(['error' => 'Insufficient credits'], 400); }

$fal_payload = [
    'prompt' => 'Edit the provided image: ' . $prompt . '. Keep all other aspects of the image unchanged. Do not generate a new image.',
    'image_url' => $image_url,
];

$ch = curl_init('https://fal.run/' . IMAGE_EDIT_MODEL);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($fal_payload),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Key ' . FAL_AI_API_KEY
    ],
    CURLOPT_TIMEOUT => 120
]);
$response = curl_exec($ch);
curl_close($ch);

$result = json_decode($response, true);
if (!$result || !isset($result['images'][0])) {
    json_response(['error' => 'AI edit failed', 'debug' => $result], 500);
}

$edited_url = $result['images'][0]['url'] ?? '';

global $pdo;
$upd = $pdo->prepare('UPDATE users SET credits = credits - ? WHERE id = ?');
$upd->execute([$cost, $user['id']]);

json_response([
    'ok' => true,
    'url' => $edited_url,
    'credits_remaining' => $user['credits'] - $cost
]);
