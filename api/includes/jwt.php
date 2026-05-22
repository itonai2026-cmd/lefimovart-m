<?php
/**
 * JWT Helper Functions
 * Simple JWT encoding/decoding without external libraries
 */

function jwt_encode($payload, $secret = JWT_SECRET, $expire = JWT_EXPIRE) {
    $header = [
        'typ' => 'JWT',
        'alg' => 'HS256'
    ];
    
    $issuedAt = time();
    $expire = $issuedAt + $expire;
    
    $payload['iat'] = $issuedAt;
    $payload['exp'] = $expire;
    
    $headerEncoded = base64url_encode(json_encode($header));
    $payloadEncoded = base64url_encode(json_encode($payload));
    
    $signatureInput = $headerEncoded . '.' . $payloadEncoded;
    $signature = base64url_encode(hash_hmac('sha256', $signatureInput, $secret, true));
    
    return $signatureInput . '.' . $signature;
}

function jwt_decode($token, $secret = JWT_SECRET) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return null;
    }
    
    list($headerEncoded, $payloadEncoded, $signatureEncoded) = $parts;
    
    $signatureInput = $headerEncoded . '.' . $payloadEncoded;
    $signature = base64url_encode(hash_hmac('sha256', $signatureInput, $secret, true));
    
    if (!hash_equals($signature, $signatureEncoded)) {
        return null;
    }
    
    $payload = json_decode(base64url_decode($payloadEncoded), true);
    
    if (!$payload) {
        return null;
    }
    
    if (isset($payload['exp']) && $payload['exp'] < time()) {
        return null;
    }
    
    return $payload;
}

function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode($data) {
    return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', 4 - (strlen($data) % 4)));
}

function get_jwt_from_header() {
    $headers = getallheaders();
    $auth_header = $headers['Authorization'] ?? '';
    
    if (preg_match('/Bearer\s+(.*)$/i', $auth_header, $matches)) {
        return $matches[1];
    }
    
    return null;
}

function verify_jwt() {
    $token = get_jwt_from_header();
    if (!$token) {
        return null;
    }
    
    return jwt_decode($token);
}

function require_auth() {
    $payload = verify_jwt();
    if (!$payload) {
        http_response_code(401);
        json_response(['error' => 'Unauthorized']);
    }
    return $payload;
}
