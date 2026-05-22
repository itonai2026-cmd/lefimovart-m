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

if (empty($email)) {
    json_response(['error' => 'Email is required'], 400);
}

create_password_reset($email);

json_response(['ok' => true, 'message' => 'If this email exists, you will receive a password reset link']);
