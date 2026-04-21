<?php
declare(strict_types=1);

namespace App;

final class Auth
{
    public static function require(): array
    {
        $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        if (!preg_match('/^Bearer\s+(.+)$/i', $h, $m)) {
            Response::error('Missing token', 401);
        }
        $payload = Jwt::decode($m[1], Env::get('JWT_SECRET', ''));
        if ($payload === null) {
            Response::error('Invalid or expired token', 401);
        }
        return $payload;
    }
}
