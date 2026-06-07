<?php
/**
 * Base44 legacy authentication bridge.
 *
 * Passwords cannot be exported from Base44. For imported users that still have
 * no local password hash, we verify the submitted credentials against the old
 * Base44 app and then store a fresh local bcrypt hash.
 */

require_once __DIR__ . '/../config.php';

function base44_legacy_auth_configured(): bool {
    return BASE44_LEGACY_AUTH_ENABLED
        && BASE44_LEGACY_APP_ID !== ''
        && BASE44_LEGACY_BASE_URL !== ''
        && BASE44_LEGACY_LOGIN_PATH !== '';
}

function base44_legacy_login_url(): string {
    $path = str_replace('{appId}', rawurlencode(BASE44_LEGACY_APP_ID), BASE44_LEGACY_LOGIN_PATH);
    if (preg_match('/^https?:\/\//i', $path)) {
        return $path;
    }
    return BASE44_LEGACY_BASE_URL . '/' . ltrim($path, '/');
}

function authenticate_base44_legacy_user(string $email, string $password): array {
    if (!base44_legacy_auth_configured()) {
        return ['ok' => false, 'error' => 'Legacy Base44 auth is not configured.'];
    }

    $payload = json_encode(['email' => $email, 'password' => $password]);
    if ($payload === false) {
        return ['ok' => false, 'error' => 'Could not encode legacy auth payload.'];
    }

    $ch = curl_init(base44_legacy_login_url());
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_TIMEOUT, BASE44_LEGACY_TIMEOUT);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Accept: application/json',
        'X-App-Id: ' . BASE44_LEGACY_APP_ID,
    ]);

    $response = curl_exec($ch);
    $curlError = curl_error($ch);
    $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response === false) {
        error_log('Base44 legacy auth curl failed: ' . $curlError);
        return ['ok' => false, 'error' => 'Legacy auth request failed.'];
    }

    $data = json_decode($response, true);
    if ($httpCode < 200 || $httpCode >= 300 || !is_array($data)) {
        error_log('Base44 legacy auth rejected login for ' . $email . ' with HTTP ' . $httpCode);
        return ['ok' => false, 'error' => 'Legacy auth rejected credentials.'];
    }

    if (empty($data['access_token']) && empty($data['token'])) {
        error_log('Base44 legacy auth response missing token for ' . $email);
        return ['ok' => false, 'error' => 'Legacy auth response was incomplete.'];
    }

    return ['ok' => true, 'data' => $data];
}

/**
 * Extract a display name from a Base44 legacy auth response, if present.
 */
function base44_legacy_extract_name(array $data): string {
    $candidates = [
        $data['user']['full_name'] ?? null,
        $data['user']['name'] ?? null,
        $data['full_name'] ?? null,
        $data['name'] ?? null,
    ];
    foreach ($candidates as $candidate) {
        if (is_string($candidate) && trim($candidate) !== '') {
            return trim($candidate);
        }
    }
    return '';
}

/**
 * Provision a local account for a user that still exists only in Base44.
 *
 * Used at login time for users who registered on Base44 after the initial
 * import. The submitted credentials are verified against Base44; on success a
 * local verified account is created and the password is captured as bcrypt.
 *
 * @return array{ok: bool, user_id?: int, error?: string}
 */
function migrate_base44_user_on_login(string $email, string $password): array {
    global $pdo;

    if (!base44_legacy_auth_configured()) {
        return ['ok' => false, 'error' => 'Legacy Base44 auth is not configured.'];
    }

    $email = trim(strtolower($email));

    $legacyAuth = authenticate_base44_legacy_user($email, $password);
    if (!$legacyAuth['ok']) {
        return ['ok' => false, 'error' => $legacyAuth['error'] ?? 'Legacy auth rejected credentials.'];
    }

    $hash = password_hash($password, PASSWORD_BCRYPT);
    $name = base44_legacy_extract_name($legacyAuth['data'] ?? []);

    try {
        $ins = $pdo->prepare(
            'INSERT INTO users (email, password_hash, name, is_verified) VALUES (?, ?, ?, 1)'
        );
        $ins->execute([$email, $hash, $name]);
        return ['ok' => true, 'user_id' => (int)$pdo->lastInsertId()];
    } catch (Throwable $e) {
        // A concurrent request may have created the row first; reuse it.
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $existing = $stmt->fetch();
        if ($existing) {
            return ['ok' => true, 'user_id' => (int)$existing['id']];
        }
        error_log('Base44 user migration insert failed for ' . $email . ': ' . $e->getMessage());
        return ['ok' => false, 'error' => 'Could not create local account.'];
    }
}
