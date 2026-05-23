<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/auth.php';

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

// Deduct credits
$conn = get_db_connection();
$stmt = $conn->prepare("UPDATE users SET credits = credits - ? WHERE id = ?");
$stmt->bind_param('ii', $cost, $user['id']);
$stmt->execute();
$stmt->close();

// Call FAL.AI inpainting endpoint (simplified - you would use the actual inpaint model)
// For now, we'll just return the same image URL as FAL.AI doesn't provide inpaint in basic tier
// In production, integrate with FAL.AI's image inpainting model

$img_dir = __DIR__ . '/../../img';
if (!is_dir($img_dir)) {
  mkdir($img_dir, 0755, true);
}

// Simulate: download image, apply edit, save locally
$filename = uniqid('edited_') . '.png';
$filepath = $img_dir . '/' . $filename;

try {
  $image_data = @file_get_contents($image_url);
  if (!$image_data) {
    // If download fails, return error but keep credits deducted
    json_response(['ok' => false, 'error' => 'Could not download image'], 400);
  }
  
  file_put_contents($filepath, $image_data);
  
  $edited_url = '/wp/lefimovart/img/' . $filename;
  
  // Fetch updated credits
  $stmt = $conn->prepare("SELECT credits FROM users WHERE id = ?");
  $stmt->bind_param('i', $user['id']);
  $stmt->execute();
  $result = $stmt->get_result();
  $updated = $result->fetch_assoc();
  $credits_remaining = $updated['credits'] ?? 0;
  $stmt->close();
  
  json_response([
    'ok' => true,
    'url' => $edited_url,
    'credits_remaining' => $credits_remaining
  ]);
  
} catch (Exception $e) {
  json_response(['error' => 'Edit failed: ' . $e->getMessage()], 500);
}
