<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/auth.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$payload = require_auth();
$current_user = get_authenticated_user();
if (!$current_user) { json_response(['error' => 'Unauthorized'], 401); }
if (($current_user['role'] ?? 'user') !== 'admin') { json_response(['error' => 'Forbidden'], 403); }

global $pdo;

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->query('SELECT id, email, name, credits, role, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT 500');
    json_response(['ok' => true, 'users' => $stmt->fetchAll()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $user_id = isset($input['user_id']) ? (int)$input['user_id'] : 0;
    $credits = isset($input['credits']) ? (int)$input['credits'] : null;

    if ($user_id <= 0 || $credits === null || $credits < 0) {
        json_response(['error' => 'Invalid user or credits value'], 400);
    }

    $stmt = $pdo->prepare('UPDATE users SET credits = ? WHERE id = ?');
    $stmt->execute([$credits, $user_id]);

    $stmt = $pdo->prepare('SELECT id, email, name, credits, role, created_at, updated_at FROM users WHERE id = ?');
    $stmt->execute([$user_id]);
    $updated = $stmt->fetch();

    if (!$updated) {
        json_response(['error' => 'User not found'], 404);
    }

    json_response(['ok' => true, 'user' => $updated]);
}

json_response(['error' => 'Method not allowed'], 405);
