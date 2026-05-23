<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/auth.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_response(['error' => 'Method not allowed'], 405); }

$payload = require_auth();
$input = json_decode(file_get_contents('php://input'), true);

$image_url = $input['image_url'] ?? '';
$prompt = $input['prompt'] ?? 'Edited image';

if (empty($image_url)) {
  json_response(['error' => 'image_url required'], 400);
}

$user = get_authenticated_user();
$conn = get_db_connection();

$stmt = $conn->prepare("INSERT INTO generated_images (user_id, image_url, prompt, created_at) VALUES (?, ?, ?, NOW())");
$stmt->bind_param('iss', $user['id'], $image_url, $prompt);

if ($stmt->execute()) {
  json_response(['ok' => true, 'id' => $stmt->insert_id]);
} else {
  json_response(['error' => 'Failed to save: ' . $conn->error], 500);
}

$stmt->close();
