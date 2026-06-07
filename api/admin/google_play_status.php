<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../payments/google_play_payment.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'GET') { json_response(['error' => 'Method not allowed'], 405); }

$payload = require_auth();
$current_user = get_authenticated_user();
if (!$current_user) { json_response(['error' => 'Unauthorized'], 401); }
if (($current_user['role'] ?? 'user') !== 'admin') { json_response(['error' => 'Forbidden'], 403); }

// Determine where the service account credentials would come from, without
// ever exposing the key material itself.
$source = 'none';
$file_readable = null;
if (!empty(GOOGLE_PLAY_SERVICE_ACCOUNT_JSON)) {
    $source = 'json';
} elseif (!empty(GOOGLE_PLAY_SERVICE_ACCOUNT_FILE)) {
    $source = 'file';
    $file_readable = is_readable(GOOGLE_PLAY_SERVICE_ACCOUNT_FILE);
}

[$account, $account_error] = google_play_service_account();

$client_email = null;
$project_id = null;
if ($account) {
    $client_email = $account['client_email'] ?? null;
    $project_id = $account['project_id'] ?? null;
}

// Only attempt the live OAuth handshake if the credentials parsed correctly.
$token_ok = false;
$token_error = null;
if (!$account_error) {
    [$token, $token_error] = google_play_access_token();
    $token_ok = !empty($token);
}

$configured = empty($account_error) && $token_ok;

json_response([
    'ok' => true,
    'configured' => $configured,
    'package_name' => GOOGLE_PLAY_PACKAGE_NAME,
    'product_ids' => GOOGLE_PLAY_PRODUCT_IDS,
    'service_account' => [
        'source' => $source,
        'file_path' => $source === 'file' ? GOOGLE_PLAY_SERVICE_ACCOUNT_FILE : null,
        'file_readable' => $file_readable,
        'client_email' => $client_email,
        'project_id' => $project_id,
        'parse_error' => $account_error,
    ],
    'token_ok' => $token_ok,
    'token_error' => $token_error,
]);
