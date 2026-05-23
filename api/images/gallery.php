<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/auth.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$payload = require_auth();
$user = get_authenticated_user();
global $pdo;

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->prepare('SELECT id, image_url, prompt, created_at FROM generated_images WHERE user_email = ? AND status = ? AND image_url IS NOT NULL ORDER BY created_at DESC LIMIT 50');
    $stmt->execute([$user['email'], 'ready']);
    $images = $stmt->fetchAll();
    json_response(['ok' => true, 'images' => $images]);
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = $input['id'] ?? 0;
    $stmt = $pdo->prepare('DELETE FROM generated_images WHERE id = ? AND user_email = ?');
    $stmt->execute([$id, $user['email']]);
    json_response(['ok' => true]);
}

json_response(['error' => 'Method not allowed'], 405);
