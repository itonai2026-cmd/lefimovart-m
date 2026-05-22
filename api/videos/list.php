<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/auth.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'GET') { json_response(['error' => 'Method not allowed'], 405); }

$payload = require_auth();
$user = get_current_user();
global $pdo;

$stmt = $pdo->prepare('SELECT id, prompt, model_used, status, video_url, created_at FROM videos WHERE user_email = ? ORDER BY created_at DESC LIMIT 50');
$stmt->execute([$user['email']]);
$videos = $stmt->fetchAll();

json_response(['ok' => true, 'videos' => $videos]);
