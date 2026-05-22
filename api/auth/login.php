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
$password = $input['password'] ?? '';

if (empty($email) || empty($password)) {
    json_response(['error' => 'Email and password are required'], 400);
}

$result = login_user($email, $password);

if (!$result['ok']) {
    json_response($result, 400);
}

json_response(['ok' => true, 'token' => $result['token']]);
