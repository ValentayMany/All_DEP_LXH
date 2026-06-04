<?php

function jwt_encode(array $payload, string $secret, int $expiresIn = 28800): string
{
    $header = ['alg' => 'HS256', 'typ' => 'JWT'];
    $payload['exp'] = time() + $expiresIn;
    $segments = [
        base64url_encode(json_encode($header)),
        base64url_encode(json_encode($payload)),
    ];
    $signing = implode('.', $segments);
    $signature = hash_hmac('sha256', $signing, $secret, true);
    $segments[] = base64url_encode($signature);
    return implode('.', $segments);
}

function jwt_decode(string $token, string $secret): ?array
{
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return null;
    }
    [$headerB64, $payloadB64, $sigB64] = $parts;
    $signing = $headerB64 . '.' . $payloadB64;
    $expected = base64url_encode(hash_hmac('sha256', $signing, $secret, true));
    if (!hash_equals($expected, $sigB64)) {
        return null;
    }
    $payload = json_decode(base64url_decode($payloadB64), true);
    if (!is_array($payload)) {
        return null;
    }
    if (isset($payload['exp']) && time() >= (int) $payload['exp']) {
        return null;
    }
    return $payload;
}

function base64url_encode(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode(string $data): string
{
    $pad = strlen($data) % 4;
    if ($pad) {
        $data .= str_repeat('=', 4 - $pad);
    }
    return base64_decode(strtr($data, '-_', '+/')) ?: '';
}

function require_auth(): array
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/Bearer\s+(\S+)/i', $header, $m)) {
        json_response(['success' => false, 'message' => 'Unauthorized'], 401);
    }
    $secret = env('JWT_SECRET');
    if (!$secret) {
        json_response(['success' => false, 'message' => 'JWT_SECRET not configured'], 500);
    }
    $user = jwt_decode($m[1], $secret);
    if (!$user) {
        json_response(['success' => false, 'message' => 'Invalid token'], 401);
    }
    return $user;
}
