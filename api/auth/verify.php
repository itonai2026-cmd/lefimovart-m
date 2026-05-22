<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/auth.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['error' => 'Method not allowed'], 405);
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    json_response(['error' => 'Invalid JSON'], 400);
}

$email = $input['email'] ?? '';
$code = $input['code'] ?? '';

if (empty($email) || empty($code)) {
    json_response(['error' => 'Email and code are required'], 400);
}

if (verify_email($email, $code)) {
    json_response(['ok' => true, 'message' => 'Email verified successfully']);
} else {
    json_response(['error' => 'Invalid verification code'], 400);
}
