<?php
declare(strict_types=1);

use App\{Auth, Db, Response, Router};

return function (Router $r): void {

    // GET /rooms - list 5 phòng + người thuê hiện tại + giá hiện hành
    $r->add('GET', '/rooms', function (): void {
        Auth::require();
        $sql = "SELECT
                  r.id, r.code, r.name, r.floor, r.is_active, r.sort_order,
                  ra.tenant_id AS current_tenant_id,
                  t.name       AS current_tenant_name,
                  ra.start_date AS tenant_since,
                  rp.rent_amount, rp.water_fee, rp.electric_unit_price,
                  rp.effective_from AS pricing_from
                FROM rooms r
                LEFT JOIN room_assignments ra
                       ON ra.room_id = r.id AND ra.end_date IS NULL
                LEFT JOIN tenants t ON t.id = ra.tenant_id
                LEFT JOIN room_pricing rp
                       ON rp.id = (SELECT id FROM room_pricing
                                   WHERE room_id = r.id AND effective_from <= CURDATE()
                                   ORDER BY effective_from DESC LIMIT 1)
                ORDER BY r.sort_order";
        Response::json(Db::pdo()->query($sql)->fetchAll());
    });

    // GET /rooms/{id}
    $r->add('GET', '/rooms/{id}', function (array $p): void {
        Auth::require();
        $stmt = Db::pdo()->prepare('SELECT * FROM rooms WHERE id = ?');
        $stmt->execute([(int)$p['id']]);
        $row = $stmt->fetch();
        $row ? Response::json($row) : Response::error('Không tìm thấy phòng', 404);
    });

    // PUT /rooms/{id} - đổi name, floor, is_active, sort_order
    $r->add('PUT', '/rooms/{id}', function (array $p, array $body): void {
        Auth::require();
        $allowed = ['name', 'floor', 'is_active', 'sort_order'];
        $set = []; $vals = [];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $body)) { $set[] = "$f = ?"; $vals[] = $body[$f]; }
        }
        if (!$set) Response::error('Không có trường nào để cập nhật');
        $vals[] = (int)$p['id'];
        Db::pdo()->prepare('UPDATE rooms SET ' . implode(', ', $set) . ' WHERE id = ?')->execute($vals);
        Response::json(['updated' => true]);
    });
};
