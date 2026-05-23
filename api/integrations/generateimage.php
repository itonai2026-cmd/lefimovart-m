<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/jwt.php';
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

$user = authenticateRequest();
if (!$user) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Unauthorized']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

try {
    // Use existing generate.php logic or external API
    // For now, delegate to images/generate.php internally
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => 'http://localhost/wp/lefimovart/api/images/generate.php',
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $_SERVER['HTTP_AUTHORIZATION'] ?? ''
        ],
        CURLOPT_POSTFIELDS => json_encode($data),
        CURLOPT_RETURNTRANSFER => true
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200) {
        $result = json_decode($response, true);
        echo json_encode($result);
    } else {
        http_response_code($httpCode);
        echo json_encode(['ok' => false, 'error' => 'Image generation failed']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Generation failed: ' . $e->getMessage()]);
}
