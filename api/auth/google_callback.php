<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/auth.php';

set_cors_headers();

$code = $_GET['code'] ?? '';
$state = $_GET['state'] ?? '';

if (empty($code)) {
    json_response(['error' => 'No authorization code provided'], 400);
}

$result = google_oauth_login($code);

if (!$result['ok']) {
    json_response($result, 400);
}

// Redirect to frontend with token
$redirect_url = rtrim(APP_URL, '/') . BASE_PATH . '/?token=' . urlencode($result['token']);
header('Location: ' . $redirect_url);
exit;
