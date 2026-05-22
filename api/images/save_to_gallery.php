<?php
/**
 * Save an edited image to the user's gallery.
 * POST { image_url, prompt }
 */
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/auth.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_response(['error' => 'Method not allowed'], 405); }

$payload = require_auth();
$input = json_decode(file_get_contents('php://input'), true);

$image_url = $input['image_url'] ?? '';
$prompt = $input['prompt'] ?? 'Edited image';
if (empty($image_url)) { json_response(['error' => 'Image URL required'], 400); }

$user = get_authenticated_user();

global $pdo;
$stmt = $pdo->prepare('INSERT INTO generated_images (user_id, user_email, image_url, prompt) VALUES (?, ?, ?, ?)');
$stmt->execute([$user['id'], $user['email'], $image_url, $prompt]);
$img_id = $pdo->lastInsertId();

json_response([
    'ok' => true,
    'image' => [
        'id' => $img_id,
        'url' => $image_url,
        'prompt' => $prompt
    ]
]);
