<?php
/**
 * Authentication Helpers
 * Login, Register, Google OAuth, Email Verification
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/jwt.php';
require_once __DIR__ . '/email.php';

function register_user(string $email, string $password, string $name = ''): array {
    global $pdo;
    
    $email = trim(strtolower($email));
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return ['ok' => false, 'error' => 'Invalid email address.'];
    }
    
    if (strlen($password) < 8) {
        return ['ok' => false, 'error' => 'Password must be at least 8 characters.'];
    }
    
    $exists = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $exists->execute([$email]);
    if ($exists->fetch()) {
        return ['ok' => false, 'error' => 'This email is already registered.'];
    }
    
    $hash = password_hash($password, PASSWORD_BCRYPT);
    $code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    
    $stmt = $pdo->prepare(
        'INSERT INTO users (email, password_hash, verification_code, name) VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([$email, $hash, $code, $name ?? '']);
    
    $userId = (int)$pdo->lastInsertId();
    
    send_verification_email($email, $code);
    
    return ['ok' => true, 'user_id' => $userId, 'email' => $email];
}

function verify_email(string $email, string $code): bool {
    global $pdo;
    
    $stmt = $pdo->prepare(
        'SELECT id FROM users WHERE email = ? AND verification_code = ? AND is_verified = 0'
    );
    $stmt->execute([trim(strtolower($email)), $code]);
    $user = $stmt->fetch();
    
    if (!$user) {
        return false;
    }
    
    $upd = $pdo->prepare('UPDATE users SET is_verified = 1, verification_code = NULL WHERE id = ?');
    $upd->execute([$user['id']]);
    return true;
}

function login_user(string $email, string $password): array {
    global $pdo;
    
    $email = trim(strtolower($email));
    
    $stmt = $pdo->prepare('SELECT id, password_hash, is_verified FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if (!$user || !password_verify($password, $user['password_hash'])) {
        return ['ok' => false, 'error' => 'Incorrect email or password.'];
    }
    
    if (!$user['is_verified']) {
        return ['ok' => false, 'error' => 'Account not verified. Please check your email.', 'needs_verify' => true];
    }
    
    $token = generate_jwt_token($user['id']);
    
    return ['ok' => true, 'token' => $token];
}

function google_oauth_login(string $code): array {
    global $pdo;
    
    if (empty(GOOGLE_CLIENT_ID) || empty(GOOGLE_CLIENT_SECRET)) {
        return ['ok' => false, 'error' => 'Google OAuth not configured'];
    }
    
    // Exchange code for tokens
    $token_response = curl_post('https://oauth2.googleapis.com/token', [
        'code' => $code,
        'client_id' => GOOGLE_CLIENT_ID,
        'client_secret' => GOOGLE_CLIENT_SECRET,
        'redirect_uri' => GOOGLE_REDIRECT_URI,
        'grant_type' => 'authorization_code',
    ]);
    
    if (!$token_response || !isset($token_response['access_token'])) {
        return ['ok' => false, 'error' => 'Failed to exchange code for token'];
    }
    
    // Get user info from Google
    $headers = ['Authorization' => 'Bearer ' . $token_response['access_token']];
    $user_info = curl_get('https://www.googleapis.com/oauth2/v2/userinfo', $headers);
    
    if (!$user_info || !isset($user_info['email'])) {
        return ['ok' => false, 'error' => 'Failed to get user info from Google'];
    }
    
    $email = trim(strtolower($user_info['email']));
    $google_id = $user_info['id'];
    $name = $user_info['name'] ?? '';
    
    // Find or create user
    $stmt = $pdo->prepare('SELECT id, is_verified FROM users WHERE email = ? OR google_id = ?');
    $stmt->execute([$email, $google_id]);
    $user = $stmt->fetch();
    
    if ($user) {
        // Update google_id if not set
        if (!$user['is_verified']) {
            $upd = $pdo->prepare('UPDATE users SET is_verified = 1, google_id = ? WHERE email = ?');
            $upd->execute([$google_id, $email]);
        }
        $user_id = $user['id'];
    } else {
        // Create new user
        $stmt = $pdo->prepare(
            'INSERT INTO users (email, google_id, name, is_verified, credits) VALUES (?, ?, ?, 1, 40)'
        );
        $stmt->execute([$email, $google_id, $name]);
        $user_id = (int)$pdo->lastInsertId();
    }
    
    $token = generate_jwt_token($user_id);
    
    return ['ok' => true, 'token' => $token, 'email' => $email];
}

function generate_jwt_token(int $user_id): string {
    $stmt = $GLOBALS['pdo']->prepare('SELECT id, email, credits, role FROM users WHERE id = ?');
    $stmt->execute([$user_id]);
    $user = $stmt->fetch();
    
    if (!$user) {
        throw new Exception('User not found');
    }
    
    return jwt_encode([
        'user_id' => $user['id'],
        'email' => $user['email'],
        'credits' => (int)$user['credits'],
        'role' => $user['role'],
    ]);
}

function get_authenticated_user(): ?array {
    global $pdo;
    
    $payload = verify_jwt();
    if (!$payload) {
        return null;
    }
    
    $stmt = $pdo->prepare('SELECT id, email, credits, role, name FROM users WHERE id = ?');
    $stmt->execute([$payload['user_id']]);
    return $stmt->fetch();
}

function logout_user(): void {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    session_destroy();
}

function create_password_reset(string $email): bool {
    global $pdo;
    
    $email = trim(strtolower($email));
    
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    if (!$user) {
        return true; // Silent - don't reveal if email exists
    }
    
    $token = bin2hex(random_bytes(32));
    $expires = date('Y-m-d H:i:s', strtotime('+15 minutes'));
    
    $pdo->prepare('DELETE FROM password_resets WHERE email = ?')->execute([$email]);
    $pdo->prepare(
        'INSERT INTO password_resets (user_id, email, token, expires_at) VALUES (?, ?, ?, ?)'
    )->execute([$user['id'], $email, $token, $expires]);
    
    $link = rtrim(APP_URL, '/') . BASE_PATH . '/reset-password?token=' . $token;
    send_reset_email($email, $link);
    
    return true;
}

function reset_password(string $token, string $newPassword): array {
    global $pdo;
    
    if (strlen($newPassword) < 8) {
        return ['ok' => false, 'error' => 'Password must be at least 8 characters.'];
    }
    
    $stmt = $pdo->prepare(
        'SELECT email FROM password_resets WHERE token = ? AND expires_at > NOW()'
    );
    $stmt->execute([$token]);
    $row = $stmt->fetch();
    
    if (!$row) {
        return ['ok' => false, 'error' => 'Invalid or expired link.'];
    }
    
    $hash = password_hash($newPassword, PASSWORD_BCRYPT);
    $pdo->prepare('UPDATE users SET password_hash = ? WHERE email = ?')
        ->execute([$hash, $row['email']]);
    $pdo->prepare('DELETE FROM password_resets WHERE email = ?')
        ->execute([$row['email']]);
    
    return ['ok' => true];
}

// Helper curl functions
function curl_get(string $url, array $headers = []): ?array {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    if (!empty($headers)) {
        $header_array = [];
        foreach ($headers as $key => $value) {
            $header_array[] = "$key: $value";
        }
        curl_setopt($ch, CURLOPT_HTTPHEADER, $header_array);
    }
    
    $response = curl_exec($ch);
    $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpcode !== 200) {
        return null;
    }
    
    return json_decode($response, true);
}

function curl_post(string $url, array $data): ?array {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $response = curl_exec($ch);
    $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpcode !== 200) {
        return null;
    }
    
    return json_decode($response, true);
}
