<?php
declare(strict_types=1);

use App\{Auth, Db, Response, Router};

return function (Router $r): void {

    // GET /pricing?room_id=X  - lịch sử bảng giá
    $r->add('GET', '/pricing', function (): void {
        Auth::require();
        $sql = 'SELECT * FROM room_pricing';
        $vals = [];
        if (!empty($_GET['room_id'])) { $sql .= ' WHERE room_id = ?'; $vals[] = (int)$_GET['room_id']; }
        $sql .= ' ORDER BY room_id, effective_from DESC';
        $stmt = Db::pdo()->prepare($sql);
        $stmt->execute($vals);
        Response::json($stmt->fetchAll());
    });

    // GET /pricing/current?room_id=X&date=YYYY-MM-DD  - giá hiệu lực tại thời điểm
    $r->add('GET', '/pricing/current', function (): void {
        Auth::require();
        $roomId = (int)($_GET['room_id'] ?? 0);
        $date   = $_GET['date'] ?? date('Y-m-d');
        if (!$roomId) Response::error('Thiếu room_id');
        $stmt = Db::pdo()->prepare(
            'SELECT * FROM room_pricing
             WHERE room_id = ? AND effective_from <= ?
             ORDER BY effective_from DESC LIMIT 1'
        );
        $stmt->execute([$roomId, $date]);
        $row = $stmt->fetch();
        $row ? Response::json($row) : Response::error('Chưa có giá', 404);
    });

    // POST /pricing  { room_id, rent_amount, water_fee, electric_unit_price, effective_from, note? }
    $r->add('POST', '/pricing', function (array $p, array $body): void {
        Auth::require();
        $req = ['room_id', 'rent_amount', 'water_fee', 'electric_unit_price', 'effective_from'];
        foreach ($req as $k) if (!isset($body[$k])) Response::error("Thiếu $k");
        $stmt = Db::pdo()->prepare(
            'INSERT INTO room_pricing (room_id, rent_amount, water_fee, electric_unit_price, effective_from, note)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            (int)$body['room_id'],
            (int)$body['rent_amount'],
            (int)$body['water_fee'],
            (int)$body['electric_unit_price'],
            $body['effective_from'],
            $body['note'] ?? null,
        ]);
        Response::json(['id' => (int)Db::pdo()->lastInsertId()], 201);
    });

    // DELETE /pricing/{id}
    $r->add('DELETE', '/pricing/{id}', function (array $p): void {
        Auth::require();
        Db::pdo()->prepare('DELETE FROM room_pricing WHERE id = ?')->execute([(int)$p['id']]);
        Response::json(['deleted' => true]);
    });
};
