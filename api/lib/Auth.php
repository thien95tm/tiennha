<?php
declare(strict_types=1);

namespace App;

final class Auth
{
    public static function require(): array
    {
        $h = self::getAuthHeader();
        if (!preg_match('/^Bearer\s+(.+)$/i', $h, $m)) {
            Response::error('Missing token', 401);
        }
        $payload = Jwt::decode($m[1], Env::get('JWT_SECRET', ''));
        if ($payload === null) {
            Response::error('Invalid or expired token', 401);
        }
        return $payload;
    }

    // Apache/LiteSpeed/FPM đặt Authorization vào các key khác nhau — duyệt hết.
    private static function getAuthHeader(): string
    {
        $candidates = [
            'HTTP_AUTHORIZATION',
            'REDIRECT_HTTP_AUTHORIZATION',
        ];
        foreach ($candidates as $k) {
            if (!empty($_SERVER[$k])) return (string)$_SERVER[$k];
        }
        if (function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            foreach ($headers as $k => $v) {
                if (strcasecmp($k, 'Authorization') === 0) return (string)$v;
            }
        }
        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            foreach ($headers as $k => $v) {
                if (strcasecmp($k, 'Authorization') === 0) return (string)$v;
            }
        }
        return '';
    }
}
