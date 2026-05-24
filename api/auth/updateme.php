<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

$payload = require_auth();
$user = get_authenticated_user();
if (!$user) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Unauthorized']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

try {
    $credits = max(0, (int)($data['credits'] ?? 0));
    $stmt = $pdo->prepare('UPDATE users SET credits = :credits WHERE id = :id');
    $stmt->execute([
        ':credits' => $credits,
        ':id' => $user['id']
    ]);

    $fresh = get_authenticated_user();

    echo json_encode([
        'ok' => true,
        'user' => $fresh
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Update failed: ' . $e->getMessage()]);
}
