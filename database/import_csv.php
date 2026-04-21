<?php
/**
 * Import dữ liệu cũ từ CSV vào Tienthuenha DB.
 * Chạy: php database/import_csv.php
 */
declare(strict_types=1);

const CSV_PATH = __DIR__ . '/../tong_hop_du_lieu_thue_nha_tat_ca_phong.csv';
const DB_HOST  = 'localhost';
const DB_NAME  = 'Tienthuenha';
const DB_USER  = 'root';
const DB_PASS  = '1';

// Map "Tên người Tên phòng" trong CSV → [tenant_name, room_code]
// Đã suy ra từ chỉ số điện liên tục giữa các tháng:
//   - t4_to: Huy (T9/24-T6/25) → Duyên (T8/25-now)
//   - t3_giua: Duyên Anh (T9/24-T7/25) → Truyền (T8/25-now)
const ROOM_MAP = [
    'Hiền tầng 4 giữa'      => ['Hiền',      't4_giua'],
    'Huy Tầng 4'            => ['Huy',       't4_to'],
    'Duyên tầng 4'          => ['Duyên',     't4_to'],
    'Linh tầng 4 bé'        => ['Linh',      't4_be'],
    'Duyên Anh tầng 3 giữa' => ['Duyên Anh', 't3_giua'],
    'Truyền tần 3 giữa'     => ['Truyền',    't3_giua'],
    'Anh Tuấn tầng 3 bé'    => ['Anh Tuấn',  't3_be'],
];

function parseMonth(string $s): string
{
    // "tháng 9-2024" → "2024-09"
    if (!preg_match('/(\d{1,2})-(\d{4})/u', $s, $m)) {
        throw new RuntimeException("Không parse được tháng: $s");
    }
    return sprintf('%04d-%02d', (int)$m[2], (int)$m[1]);
}

function normalizeRoomKey(string $s): string
{
    return trim(preg_replace('/\s+/u', ' ', $s));
}

$pdo = new PDO(
    sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', DB_HOST, DB_NAME),
    DB_USER, DB_PASS,
    [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]
);

// Reset bảng giao dịch (giữ rooms, room_pricing, admin_users)
$pdo->exec('SET FOREIGN_KEY_CHECKS=0');
$pdo->exec('TRUNCATE TABLE extra_fees');
$pdo->exec('TRUNCATE TABLE monthly_bills');
$pdo->exec('TRUNCATE TABLE room_assignments');
$pdo->exec('TRUNCATE TABLE tenants');
$pdo->exec('SET FOREIGN_KEY_CHECKS=1');
echo "✓ Đã clear bảng tenants, room_assignments, monthly_bills, extra_fees\n";

// Lấy room_id theo code
$rooms = [];
foreach ($pdo->query('SELECT id, code FROM rooms') as $r) {
    $rooms[$r['code']] = (int)$r['id'];
}

// --- Đọc CSV ---
$fp = fopen(CSV_PATH, 'r');
if (!$fp) throw new RuntimeException('Không đọc được CSV');
$header = fgetcsv($fp);

$rows = [];
while (($cols = fgetcsv($fp)) !== false) {
    if (count($cols) < 9 || $cols[0] === '') continue;
    $rows[] = $cols;
}
fclose($fp);
echo "✓ Đọc " . count($rows) . " dòng dữ liệu từ CSV\n";

// --- Tạo tenants ---
$tenantId = []; // name → id
$ins = $pdo->prepare('INSERT INTO tenants (name) VALUES (?)');
foreach (ROOM_MAP as $info) {
    [$name] = $info;
    if (isset($tenantId[$name])) continue;
    $ins->execute([$name]);
    $tenantId[$name] = (int)$pdo->lastInsertId();
}
echo "✓ Tạo " . count($tenantId) . " tenants: " . implode(', ', array_keys($tenantId)) . "\n";

// --- Sắp xếp dữ liệu theo (room_code, month) để track assignment ---
$pdo->beginTransaction();

$insBill = $pdo->prepare(
    'INSERT INTO monthly_bills
     (room_id, tenant_id, month, electric_prev, electric_current, electric_unit_price,
      water_fee, rent_amount, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
$insExtra = $pdo->prepare(
    'INSERT INTO extra_fees (bill_id, description, amount) VALUES (?, ?, ?)'
);

// Track assignment: room_code => [tenant_name, first_month, last_month]
$activeAssign = [];   // room_code => [tenant_name, start_month, last_month]
$allAssigns   = [];   // các đoạn đã đóng

$skipped = 0; $billsCreated = 0; $extrasCreated = 0;

foreach ($rows as $cols) {
    [$thang, $phongRaw, $ePrev, $eCur, $eSo, $eAmt, $water, $rent, $tong] = $cols;
    $key = normalizeRoomKey($phongRaw);
    if (!isset(ROOM_MAP[$key])) {
        echo "⚠  Bỏ qua phòng không nhận diện: $phongRaw\n";
        $skipped++;
        continue;
    }
    [$tenantName, $roomCode] = ROOM_MAP[$key];
    $month   = parseMonth($thang);
    $roomId  = $rooms[$roomCode];
    $tnId    = $tenantId[$tenantName];

    $ePrev = (int)round((float)$ePrev);
    $eCur  = (int)round((float)$eCur);
    $diff  = $eCur - $ePrev;
    $eAmt  = (int)round((float)$eAmt);
    $unit  = $diff > 0 ? (int)round($eAmt / $diff) : 4000;

    $water = $water === '' ? 145000 : (int)round((float)$water);
    $rent  = (int)round((float)$rent);

    $insBill->execute([$roomId, $tnId, $month, $ePrev, $eCur, $unit, $water, $rent, null]);
    $billId = (int)$pdo->lastInsertId();
    $billsCreated++;

    // Tính phí phát sinh = Tổng - (điện + nước + phòng) nếu > 0
    $tongInt = (int)round((float)$tong);
    $expected = $eAmt + $water + $rent;
    if ($tongInt - $expected > 0) {
        $insExtra->execute([$billId, 'Khoản chênh lệch (import từ CSV)', $tongInt - $expected]);
        $extrasCreated++;
    }

    // Track assignment
    if (!isset($activeAssign[$roomCode])) {
        $activeAssign[$roomCode] = [$tenantName, $month, $month];
    } else {
        [$curTenant, $startM, $lastM] = $activeAssign[$roomCode];
        if ($curTenant !== $tenantName) {
            // Đổi người: đóng đoạn cũ
            $allAssigns[] = [$roomCode, $curTenant, $startM, $lastM];
            $activeAssign[$roomCode] = [$tenantName, $month, $month];
        } else {
            $activeAssign[$roomCode][2] = $month;
        }
    }
}

// --- Insert assignments ---
$insAssign = $pdo->prepare(
    'INSERT INTO room_assignments (room_id, tenant_id, start_date, end_date, note) VALUES (?, ?, ?, ?, ?)'
);

// Đoạn đã đóng
foreach ($allAssigns as [$roomCode, $tenantName, $startM, $lastM]) {
    $start = $startM . '-01';
    // end_date = ngày cuối tháng "lastM"
    $end = (new DateTimeImmutable($lastM . '-01'))->format('Y-m-t');
    $insAssign->execute([$rooms[$roomCode], $tenantId[$tenantName], $start, $end, 'Import từ CSV']);
}
// Đoạn còn active (end_date = NULL)
foreach ($activeAssign as $roomCode => [$tenantName, $startM, $lastM]) {
    $start = $startM . '-01';
    $insAssign->execute([$rooms[$roomCode], $tenantId[$tenantName], $start, null, 'Đang thuê - import từ CSV']);
}

$pdo->commit();

echo "\n=== KẾT QUẢ ===\n";
echo "Bills tạo:        $billsCreated\n";
echo "Extra fees tạo:   $extrasCreated\n";
echo "Assignments tạo:  " . (count($allAssigns) + count($activeAssign)) . "\n";
echo "Bỏ qua:           $skipped\n";

// Kiểm tra
echo "\n--- Đang thuê hiện tại ---\n";
$stmt = $pdo->query(
    "SELECT r.name AS phong, t.name AS nguoi, ra.start_date
     FROM room_assignments ra
     JOIN rooms r   ON r.id = ra.room_id
     JOIN tenants t ON t.id = ra.tenant_id
     WHERE ra.end_date IS NULL
     ORDER BY r.sort_order"
);
foreach ($stmt as $r) {
    printf("  %-15s | %-12s | từ %s\n", $r['phong'], $r['nguoi'], $r['start_date']);
}
