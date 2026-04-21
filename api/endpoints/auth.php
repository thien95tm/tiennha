<?php
declare(strict_types=1);

use App\{Db, Env, Jwt, Response, Router};

return function (Router $r): void {

    // POST /auth/login  { username, password }
    $r->add('POST', '/auth/login', function (array $params, array $body): void {
        $u = (string)($body['username'] ?? '');
        $p = (string)($body['password'] ?? '');
        if ($u === '' || $p === '') Response::error('Thiếu username/password');

        $stmt = Db::pdo()->prepare('SELECT id, username, password_hash FROM admin_users WHERE username = ?');
        $stmt->execute([$u]);
        $user = $stmt->fetch();
        if (!$user || !password_verify($p, $user['password_hash'])) {
            Response::error('Sai tài khoản hoặc mật khẩu', 401);
        }

        $ttl = (int)Env::get('JWT_TTL', '86400');
        $token = Jwt::encode([
            'sub'  => (int)$user['id'],
            'name' => $user['username'],
            'iat'  => time(),
            'exp'  => time() + $ttl,
        ], Env::get('JWT_SECRET', ''));

        Response::json([
            'token'      => $token,
            'expires_in' => $ttl,
            'user'       => ['id' => (int)$user['id'], 'username' => $user['username']],
        ]);
    });

    // GET /auth/me
    $r->add('GET', '/auth/me', function (): void {
        $payload = App\Auth::require();
        Response::json(['id' => $payload['sub'], 'username' => $payload['name']]);
    });
};
