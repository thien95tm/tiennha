<?php
declare(strict_types=1);

use App\{Auth, Db, Response, Router};

return function (Router $r): void {

    // GET /assignments?room_id=X  (lịch sử người thuê của 1 phòng)
    $r->add('GET', '/assignments', function (): void {
        Auth::require();
        $sql = "SELECT ra.*, t.name AS tenant_name, r.name AS room_name
                FROM room_assignments ra
                JOIN tenants t ON t.id = ra.tenant_id
                JOIN rooms r   ON r.id = ra.room_id";
        $vals = [];
        if (!empty($_GET['room_id'])) { $sql .= ' WHERE ra.room_id = ?'; $vals[] = (int)$_GET['room_id']; }
        $sql .= ' ORDER BY ra.start_date DESC';
        $stmt = Db::pdo()->prepare($sql);
        $stmt->execute($vals);
        Response::json($stmt->fetchAll());
    });

    // POST /assignments  { room_id, tenant_id, start_date, note? }
    // Tự động đóng assignment cũ (set end_date = start_date - 1)
    $r->add('POST', '/assignments', function (array $p, array $body): void {
        Auth::require();
        $roomId   = (int)($body['room_id']   ?? 0);
        $tenantId = (int)($body['tenant_id'] ?? 0);
        $start    = (string)($body['start_date'] ?? '');
        if (!$roomId || !$tenantId || $start === '') Response::error('Thiếu room_id/tenant_id/start_date');

        $pdo = Db::pdo();
        $pdo->beginTransaction();

        // Đóng assignment đang mở của phòng
        $end = (new DateTimeImmutable($start))->modify('-1 day')->format('Y-m-d');
        $pdo->prepare('UPDATE room_assignments SET end_date = ? WHERE room_id = ? AND end_date IS NULL')
            ->execute([$end, $roomId]);

        $pdo->prepare(
            'INSERT INTO room_assignments (room_id, tenant_id, start_date, end_date, note) VALUES (?, ?, ?, NULL, ?)'
        )->execute([$roomId, $tenantId, $start, $body['note'] ?? null]);

        $pdo->commit();
        Response::json(['id' => (int)$pdo->lastInsertId()], 201);
    });

    // PUT /assignments/{id}  - sửa start_date / end_date / note
    $r->add('PUT', '/assignments/{id}', function (array $p, array $body): void {
        Auth::require();
        $allowed = ['start_date', 'end_date', 'note'];
        $set = []; $vals = [];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $body)) { $set[] = "$f = ?"; $vals[] = $body[$f]; }
        }
        if (!$set) Response::error('Không có trường nào để cập nhật');
        $vals[] = (int)$p['id'];
        Db::pdo()->prepare('UPDATE room_assignments SET ' . implode(', ', $set) . ' WHERE id = ?')->execute($vals);
        Response::json(['updated' => true]);
    });
};
