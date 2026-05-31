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
    $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
    $per_page = 25;
    $offset = ($page - 1) * $per_page;

    $count_stmt = $pdo->query('SELECT COUNT(*) FROM videos');
    $total = (int)$count_stmt->fetchColumn();

    $stmt = $pdo->prepare(
        'SELECT user_email, image_path, prompt, model_used, resolution, duration, format, credits_deducted, completed_at, ip_address FROM videos ORDER BY created_at DESC LIMIT :limit OFFSET :offset'
    );
    $stmt->bindValue(':limit', $per_page, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    json_response([
        'ok' => true,
        'videos' => $stmt->fetchAll(),
        'total' => $total,
        'page' => $page,
        'per_page' => $per_page,
        'total_pages' => (int)ceil($total / $per_page),
    ]);
}

json_response(['error' => 'Method not allowed'], 405);
