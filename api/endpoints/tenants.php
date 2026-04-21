<?php
declare(strict_types=1);

use App\{Auth, Db, Response, Router};

return function (Router $r): void {

    // GET /tenants
    $r->add('GET', '/tenants', function (): void {
        Auth::require();
        Response::json(Db::pdo()->query('SELECT * FROM tenants ORDER BY name')->fetchAll());
    });

    // POST /tenants  { name, phone?, note? }
    $r->add('POST', '/tenants', function (array $p, array $body): void {
        Auth::require();
        $name = trim((string)($body['name'] ?? ''));
        if ($name === '') Response::error('Thiếu tên người thuê');
        $stmt = Db::pdo()->prepare('INSERT INTO tenants (name, phone, note) VALUES (?, ?, ?)');
        $stmt->execute([$name, $body['phone'] ?? null, $body['note'] ?? null]);
        Response::json(['id' => (int)Db::pdo()->lastInsertId()], 201);
    });

    // PUT /tenants/{id}
    $r->add('PUT', '/tenants/{id}', function (array $p, array $body): void {
        Auth::require();
        $allowed = ['name', 'phone', 'note'];
        $set = []; $vals = [];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $body)) { $set[] = "$f = ?"; $vals[] = $body[$f]; }
        }
        if (!$set) Response::error('Không có trường nào để cập nhật');
        $vals[] = (int)$p['id'];
        Db::pdo()->prepare('UPDATE tenants SET ' . implode(', ', $set) . ' WHERE id = ?')->execute($vals);
        Response::json(['updated' => true]);
    });

    // DELETE /tenants/{id}
    $r->add('DELETE', '/tenants/{id}', function (array $p): void {
        Auth::require();
        try {
            Db::pdo()->prepare('DELETE FROM tenants WHERE id = ?')->execute([(int)$p['id']]);
            Response::json(['deleted' => true]);
        } catch (PDOException $e) {
            Response::error('Không xoá được: tenant đang được tham chiếu', 409);
        }
    });
};
