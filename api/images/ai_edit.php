<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/openai_images.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_response(['error' => 'Method not allowed'], 405); }

$payload = require_auth();
$input = json_decode(file_get_contents('php://input'), true);

$prompt = $input['prompt'] ?? '';
$image_url = $input['image_url'] ?? '';

if (empty($prompt) || empty($image_url)) {
  json_response(['error' => 'Prompt and image_url required'], 400);
}

// Cost for AI edit
$cost = 4;
$user = get_authenticated_user();
if (!$user || $user['credits'] < $cost) {
  json_response(['error' => 'Insufficient credits'], 400);
}

try {
  $image_data = openai_edit_image(local_image_path($image_url), $prompt);
  $edited_url = save_image_bytes($image_data, 'edited_');

  global $pdo;
  $pdo->beginTransaction();
  $stmt = $pdo->prepare('UPDATE users SET credits = credits - ? WHERE id = ? AND credits >= ?');
  $stmt->execute([$cost, $user['id'], $cost]);
  if ($stmt->rowCount() !== 1) {
    throw new RuntimeException('Insufficient credits');
  }
  $stmt = $pdo->prepare('SELECT credits FROM users WHERE id = ?');
  $stmt->execute([$user['id']]);
  $credits_remaining = (int)$stmt->fetchColumn();
  $pdo->commit();

  json_response([
    'ok' => true,
    'url' => $edited_url,
    'credits_remaining' => $credits_remaining
  ]);
  
} catch (Throwable $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  json_response(['error' => 'Edit failed: ' . $e->getMessage()], 502);
}
