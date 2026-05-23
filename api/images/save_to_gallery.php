<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/auth.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_response(['error' => 'Method not allowed'], 405); }

$payload = require_auth();
$input = !empty($_POST) ? $_POST : (json_decode(file_get_contents('php://input'), true) ?: []);

$image_url = $input['image_url'] ?? '';
$prompt = $input['prompt'] ?? 'Edited image';

if (empty($image_url)) {
  json_response(['error' => 'image_url required'], 400);
}

$user = get_authenticated_user();
if (!$user) { json_response(['error' => 'Unauthorized'], 401); }

try {
  global $pdo;
  $stmt = $pdo->prepare(
    'INSERT INTO generated_images
      (user_id, user_email, image_url, prompt, resolution, status, credits_deducted, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)'
  );
  $stmt->execute([$user['id'], $user['email'], $image_url, $prompt, 'edited', 'ready']);
  json_response(['ok' => true, 'id' => $pdo->lastInsertId()]);
} catch (Throwable $e) {
  json_response(['error' => 'Failed to save image.'], 500);
}
