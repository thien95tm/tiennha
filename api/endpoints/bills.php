<?php
declare(strict_types=1);

use App\{Auth, Db, Response, Router};

return function (Router $r): void {

    // Helper: tính toán field computed cho 1 bill
    $enrich = function (array $bill, array $extras = []): array {
        $diff = (int)$bill['electric_current'] - (int)$bill['electric_prev'];
        $electric = $diff * (int)$bill['electric_unit_price'];
        $extraSum = array_sum(array_map(fn($e) => (int)$e['amount'], $extras));
        $bill['electric_diff']   = $diff;
        $bill['electric_amount'] = $electric;
        $bill['extras']          = $extras;
        $bill['extras_total']    = $extraSum;
        $bill['total']           = $electric + (int)$bill['water_fee'] + (int)$bill['rent_amount'] + $extraSum;
        return $bill;
    };

    // GET /bills?month=YYYY-MM  hoặc  ?room_id=X
    $r->add('GET', '/bills', function () use ($enrich): void {
        Auth::require();
        $sql = "SELECT b.*, r.name AS room_name, r.code AS room_code, t.name AS tenant_name
                FROM monthly_bills b
                JOIN rooms r ON r.id = b.room_id
                LEFT JOIN tenants t ON t.id = b.tenant_id";
        $where = []; $vals = [];
        if (!empty($_GET['month']))   { $where[] = 'b.month = ?';   $vals[] = $_GET['month']; }
        if (!empty($_GET['room_id'])) { $where[] = 'b.room_id = ?'; $vals[] = (int)$_GET['room_id']; }
        if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
        $sql .= ' ORDER BY b.month DESC, r.sort_order';
        $stmt = Db::pdo()->prepare($sql);
        $stmt->execute($vals);
        $bills = $stmt->fetchAll();

        if (!$bills) Response::json([]);

        // Lấy extras cho tất cả bill trong 1 query
        $ids = array_column($bills, 'id');
        $in  = implode(',', array_fill(0, count($ids), '?'));
        $extrasByBill = [];
        $stmt2 = Db::pdo()->prepare("SELECT * FROM extra_fees WHERE bill_id IN ($in) ORDER BY id");
        $stmt2->execute($ids);
        foreach ($stmt2->fetchAll() as $e) $extrasByBill[$e['bill_id']][] = $e;

        Response::json(array_map(fn($b) => $enrich($b, $extrasByBill[$b['id']] ?? []), $bills));
    });

    // GET /bills/months  - danh sách các tháng có bill (đặt TRƯỚC /bills/{id})
    $r->add('GET', '/bills/months', function (): void {
        Auth::require();
        $rows = Db::pdo()->query('SELECT DISTINCT month FROM monthly_bills ORDER BY month DESC')->fetchAll();
        Response::json(array_column($rows, 'month'));
    });

    // GET /bills/suggest?room_id=X&month=YYYY-MM
    // Trả về gợi ý: chỉ số điện trước (= current của tháng trước), giá hiện hành, tenant đang thuê
    $r->add('GET', '/bills/suggest', function (): void {
        Auth::require();
        $roomId = (int)($_GET['room_id'] ?? 0);
        $month  = $_GET['month'] ?? '';
        if (!$roomId || $month === '') Response::error('Thiếu room_id/month');

        $pdo = Db::pdo();
        // Bill tháng gần nhất trước đó của phòng này
        $prev = $pdo->prepare(
            'SELECT electric_current FROM monthly_bills
             WHERE room_id = ? AND month < ?
             ORDER BY month DESC LIMIT 1'
        );
        $prev->execute([$roomId, $month]);
        $electricPrev = (int)($prev->fetchColumn() ?: 0);

        // Pricing hiệu lực
        $date = $month . '-01';
        $pr = $pdo->prepare(
            'SELECT rent_amount, water_fee, electric_unit_price FROM room_pricing
             WHERE room_id = ? AND effective_from <= ?
             ORDER BY effective_from DESC LIMIT 1'
        );
        $pr->execute([$roomId, $date]);
        $pricing = $pr->fetch() ?: null;

        // Tenant đang thuê tại thời điểm
        $tn = $pdo->prepare(
            "SELECT t.id, t.name FROM room_assignments ra
             JOIN tenants t ON t.id = ra.tenant_id
             WHERE ra.room_id = ?
               AND ra.start_date <= ?
               AND (ra.end_date IS NULL OR ra.end_date >= ?)
             ORDER BY ra.start_date DESC LIMIT 1"
        );
        $tn->execute([$roomId, $date, $date]);
        $tenant = $tn->fetch() ?: null;

        Response::json([
            'electric_prev' => $electricPrev,
            'pricing'       => $pricing,
            'tenant'        => $tenant,
        ]);
    });

    // GET /bills/{id}
    $r->add('GET', '/bills/{id}', function (array $p) use ($enrich): void {
        Auth::require();
        $stmt = Db::pdo()->prepare(
            "SELECT b.*, r.name AS room_name, r.code AS room_code, t.name AS tenant_name
             FROM monthly_bills b
             JOIN rooms r ON r.id = b.room_id
             LEFT JOIN tenants t ON t.id = b.tenant_id
             WHERE b.id = ?"
        );
        $stmt->execute([(int)$p['id']]);
        $bill = $stmt->fetch();
        if (!$bill) Response::error('Không tìm thấy bill', 404);

        $stmtE = Db::pdo()->prepare('SELECT * FROM extra_fees WHERE bill_id = ? ORDER BY id');
        $stmtE->execute([$bill['id']]);
        Response::json($enrich($bill, $stmtE->fetchAll()));
    });

    // POST /bills  { room_id, month, electric_prev, electric_current, electric_unit_price?, water_fee?, rent_amount?, tenant_id?, note?, extras?: [{description, amount}] }
    // Field optional => auto-fill từ pricing/tenant hiện hành
    $r->add('POST', '/bills', function (array $p, array $body): void {
        Auth::require();
        $roomId = (int)($body['room_id'] ?? 0);
        $month  = (string)($body['month'] ?? '');
        if (!$roomId || $month === '') Response::error('Thiếu room_id/month');
        if (!isset($body['electric_current'])) Response::error('Thiếu electric_current');

        $pdo = Db::pdo();
        $date = $month . '-01';

        // Auto-fill từ pricing nếu không truyền
        if (!isset($body['water_fee']) || !isset($body['rent_amount']) || !isset($body['electric_unit_price'])) {
            $pr = $pdo->prepare(
                'SELECT rent_amount, water_fee, electric_unit_price FROM room_pricing
                 WHERE room_id = ? AND effective_from <= ?
                 ORDER BY effective_from DESC LIMIT 1'
            );
            $pr->execute([$roomId, $date]);
            $pricing = $pr->fetch();
            if (!$pricing) Response::error('Phòng chưa có bảng giá tại thời điểm này', 422);
            $body['water_fee']           ??= $pricing['water_fee'];
            $body['rent_amount']         ??= $pricing['rent_amount'];
            $body['electric_unit_price'] ??= $pricing['electric_unit_price'];
        }

        // Auto electric_prev từ tháng trước nếu không truyền
        if (!isset($body['electric_prev'])) {
            $prev = $pdo->prepare(
                'SELECT electric_current FROM monthly_bills
                 WHERE room_id = ? AND month < ?
                 ORDER BY month DESC LIMIT 1'
            );
            $prev->execute([$roomId, $month]);
            $body['electric_prev'] = (int)($prev->fetchColumn() ?: 0);
        }

        // Auto tenant_id
        if (!isset($body['tenant_id'])) {
            $tn = $pdo->prepare(
                "SELECT tenant_id FROM room_assignments
                 WHERE room_id = ? AND start_date <= ? AND (end_date IS NULL OR end_date >= ?)
                 ORDER BY start_date DESC LIMIT 1"
            );
            $tn->execute([$roomId, $date, $date]);
            $body['tenant_id'] = $tn->fetchColumn() ?: null;
        }

        $pdo->beginTransaction();
        try {
            $ins = $pdo->prepare(
                'INSERT INTO monthly_bills
                  (room_id, tenant_id, month, electric_prev, electric_current,
                   electric_unit_price, water_fee, rent_amount, note)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $ins->execute([
                $roomId,
                $body['tenant_id'],
                $month,
                (int)$body['electric_prev'],
                (int)$body['electric_current'],
                (int)$body['electric_unit_price'],
                (int)$body['water_fee'],
                (int)$body['rent_amount'],
                $body['note'] ?? null,
            ]);
            $billId = (int)$pdo->lastInsertId();

            if (!empty($body['extras']) && is_array($body['extras'])) {
                $insE = $pdo->prepare('INSERT INTO extra_fees (bill_id, description, amount) VALUES (?, ?, ?)');
                foreach ($body['extras'] as $e) {
                    $insE->execute([$billId, $e['description'] ?? '', (int)($e['amount'] ?? 0)]);
                }
            }
            $pdo->commit();
            Response::json(['id' => $billId], 201);
        } catch (PDOException $e) {
            $pdo->rollBack();
            if ($e->getCode() === '23000') {
                Response::error('Phòng này đã có bill cho tháng ' . $month, 409);
            }
            throw $e;
        }
    });

    // POST /bills/bulk  { month, items: [{room_id, electric_current, electric_prev?, note?, extras?}] }
    // Auto fill các field còn lại từ pricing + assignment
    $r->add('POST', '/bills/bulk', function (array $p, array $body): void {
        Auth::require();
        $month = (string)($body['month'] ?? '');
        $items = $body['items'] ?? [];
        if ($month === '' || !is_array($items) || !$items) Response::error('Thiếu month hoặc items');

        $pdo = Db::pdo();
        $date = $month . '-01';
        $created = []; $errors = [];

        $pdo->beginTransaction();
        try {
            foreach ($items as $idx => $it) {
                $roomId = (int)($it['room_id'] ?? 0);
                $electricCurrent = (int)($it['electric_current'] ?? -1);
                if (!$roomId || $electricCurrent < 0) { $errors[] = "Item $idx: thiếu room_id/electric_current"; continue; }

                // Pricing hiệu lực
                $pr = $pdo->prepare(
                    'SELECT rent_amount, water_fee, electric_unit_price FROM room_pricing
                     WHERE room_id = ? AND effective_from <= ? ORDER BY effective_from DESC LIMIT 1'
                );
                $pr->execute([$roomId, $date]);
                $pricing = $pr->fetch();
                if (!$pricing) { $errors[] = "Item $idx: phòng $roomId chưa có bảng giá"; continue; }

                // electric_prev
                $electricPrev = $it['electric_prev'] ?? null;
                if ($electricPrev === null) {
                    $q = $pdo->prepare('SELECT electric_current FROM monthly_bills WHERE room_id = ? AND month < ? ORDER BY month DESC LIMIT 1');
                    $q->execute([$roomId, $month]);
                    $electricPrev = (int)($q->fetchColumn() ?: 0);
                } else {
                    $electricPrev = (int)$electricPrev;
                }

                // tenant_id
                $tn = $pdo->prepare(
                    "SELECT tenant_id FROM room_assignments
                     WHERE room_id = ? AND start_date <= ? AND (end_date IS NULL OR end_date >= ?)
                     ORDER BY start_date DESC LIMIT 1"
                );
                $tn->execute([$roomId, $date, $date]);
                $tenantId = $tn->fetchColumn() ?: null;

                $ins = $pdo->prepare(
                    'INSERT INTO monthly_bills
                      (room_id, tenant_id, month, electric_prev, electric_current,
                       electric_unit_price, water_fee, rent_amount, note)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
                );
                try {
                    $ins->execute([
                        $roomId, $tenantId, $month,
                        $electricPrev, $electricCurrent,
                        (int)($it['electric_unit_price'] ?? $pricing['electric_unit_price']),
                        (int)($it['water_fee'] ?? $pricing['water_fee']),
                        (int)($it['rent_amount'] ?? $pricing['rent_amount']),
                        $it['note'] ?? null,
                    ]);
                } catch (PDOException $e) {
                    if ($e->getCode() === '23000') {
                        $errors[] = "Item $idx: đã có bill cho phòng $roomId tháng $month";
                        continue;
                    }
                    throw $e;
                }

                $billId = (int)$pdo->lastInsertId();
                if (!empty($it['extras']) && is_array($it['extras'])) {
                    $insE = $pdo->prepare('INSERT INTO extra_fees (bill_id, description, amount) VALUES (?, ?, ?)');
                    foreach ($it['extras'] as $e) {
                        $insE->execute([$billId, $e['description'] ?? '', (int)($e['amount'] ?? 0)]);
                    }
                }
                $created[] = ['id' => $billId, 'room_id' => $roomId];
            }

            if ($errors && !$created) {
                $pdo->rollBack();
                Response::error('Tất cả item đều lỗi', 422, ['errors' => $errors]);
            }
            $pdo->commit();
            Response::json(['created' => $created, 'errors' => $errors]);
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    });

    // PUT /bills/{id}
    $r->add('PUT', '/bills/{id}', function (array $p, array $body): void {
        Auth::require();
        $allowed = ['electric_prev', 'electric_current', 'electric_unit_price',
                    'water_fee', 'rent_amount', 'tenant_id', 'note'];
        $set = []; $vals = [];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $body)) { $set[] = "$f = ?"; $vals[] = $body[$f]; }
        }
        if (!$set) Response::error('Không có trường nào để cập nhật');
        $vals[] = (int)$p['id'];
        Db::pdo()->prepare('UPDATE monthly_bills SET ' . implode(', ', $set) . ' WHERE id = ?')->execute($vals);
        Response::json(['updated' => true]);
    });

    // DELETE /bills/{id}
    $r->add('DELETE', '/bills/{id}', function (array $p): void {
        Auth::require();
        Db::pdo()->prepare('DELETE FROM monthly_bills WHERE id = ?')->execute([(int)$p['id']]);
        Response::json(['deleted' => true]);
    });

    // POST /bills/{id}/extras  { description, amount }
    $r->add('POST', '/bills/{id}/extras', function (array $p, array $body): void {
        Auth::require();
        $desc = trim((string)($body['description'] ?? ''));
        $amt  = (int)($body['amount'] ?? 0);
        if ($desc === '' || $amt === 0) Response::error('Thiếu description/amount');
        Db::pdo()->prepare('INSERT INTO extra_fees (bill_id, description, amount) VALUES (?, ?, ?)')
                 ->execute([(int)$p['id'], $desc, $amt]);
        Response::json(['id' => (int)Db::pdo()->lastInsertId()], 201);
    });

    // DELETE /bills/extras/{id}
    $r->add('DELETE', '/bills/extras/{id}', function (array $p): void {
        Auth::require();
        Db::pdo()->prepare('DELETE FROM extra_fees WHERE id = ?')->execute([(int)$p['id']]);
        Response::json(['deleted' => true]);
    });

};
