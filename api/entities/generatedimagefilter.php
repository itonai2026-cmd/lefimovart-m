<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/jwt.php';
require_once __DIR__ . '/../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$user = authenticateRequest();
if (!$user) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Unauthorized']);
    exit;
}

// Filter by user_email, order by -created_date (newest first), limit 50
try {
    $stmt = $pdo->prepare('
        SELECT id, image_url, prompt, created_at 
        FROM generated_images 
        WHERE user_email = :email 
        ORDER BY created_at DESC 
        LIMIT 50
    ');
    $stmt->execute([':email' => $user['email']]);
    $images = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'ok' => true,
        'data' => $images ?: []
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Filter failed: ' . $e->getMessage()]);
}
