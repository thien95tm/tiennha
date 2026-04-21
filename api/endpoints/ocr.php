<?php
declare(strict_types=1);

use App\{Auth, Db, Env, Response, Router};

// Prompt dùng chung cho OCR công tơ
const OCR_METER_PROMPT = <<<TXT
Đây là ảnh công tơ điện cơ học Việt Nam (EMIC/Gelex, 1 pha 2 dây).
Dãy số hiển thị có các bánh xe cơ: bên TRÁI là 5 bánh xe màu TRẮNG/ĐEN (phần nguyên kWh, hàng 10000-1-1000-100-10-1), bên PHẢI cùng có 1 bánh xe màu ĐỎ hoặc khung đỏ (phần thập phân 1/10 kWh).

Nhiệm vụ: đọc CHỈ phần nguyên kWh (các chữ số ĐEN/TRẮNG). **TUYỆT ĐỐI BỎ QUA bánh xe màu đỏ**, dù nó hiện số gì.

Ví dụ:
- Màn hình "0 2 0 0 5" (đen) + "7" (đỏ) → reading = 2005
- Màn hình "0 4 6 4 3" (đen) + "5" (đỏ) → reading = 4643
- Màn hình "1 0 4 1 1" (đen) + "." (đỏ mờ) → reading = 10411

Bỏ qua các nhãn: Số SX, số tem kiểm định, năm sản xuất, "kWh", "1/10", chỉ số hàng (10000/1000/...).

Trả JSON duy nhất, không giải thích:
{"reading": <số nguyên>, "confidence": "high"|"medium"|"low"}
TXT;

// Gọi Gemini cho 1 ảnh (base64 + mime)
function gemini_ocr_single(string $apiKey, string $b64, string $mime): array
{
    $payload = json_encode([
        'contents' => [[
            'parts' => [
                ['text' => OCR_METER_PROMPT],
                ['inline_data' => ['mime_type' => $mime, 'data' => $b64]],
            ],
        ]],
        'generationConfig' => ['temperature' => 0, 'responseMimeType' => 'application/json'],
    ]);
    $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=$apiKey";
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 30,
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code !== 200) return ['error' => "HTTP $code", 'raw' => substr((string)$resp, 0, 300)];
    $data = json_decode((string)$resp, true);
    $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';
    $parsed = json_decode($text, true);
    if (!is_array($parsed) || !isset($parsed['reading'])) return ['error' => 'parse_fail', 'raw_text' => $text];
    return [
        'reading'    => (int)$parsed['reading'],
        'confidence' => $parsed['confidence'] ?? 'medium',
    ];
}

// Gọi Gemini song song cho nhiều ảnh qua curl_multi
function gemini_ocr_batch(string $apiKey, array $images): array
{
    // Sequential + retry backoff khi 429/502/503 (free tier RPM thấp, API đôi khi overload)
    $results = [];
    foreach ($images as $i => [$b64, $mime]) {
        for ($attempt = 1; $attempt <= 4; $attempt++) {
            $r = gemini_ocr_single($apiKey, $b64, $mime);
            if (!isset($r['error'])) { $results[$i] = $r; break; }
            $err = $r['error'] ?? '';
            $retryable = in_array($err, ['HTTP 429', 'HTTP 502', 'HTTP 503', 'HTTP 504'], true);
            if ($retryable && $attempt < 4) { sleep(2 * $attempt); continue; }
            $results[$i] = $r; break;
        }
    }
    return $results;
}

// Match mỗi reading với phòng có prev gần nhất (diff dương, hợp lý)
function match_readings_to_rooms(array $readings, array $roomPrev): array
{
    // $roomPrev: [room_id => ['prev' => int, 'name' => string, 'code' => string]]
    $matches = [];
    $usedRooms = [];
    // Sort readings theo reading desc để gán phòng có chỉ số lớn nhất trước
    $indexed = $readings;
    uasort($indexed, fn($a, $b) => ($b['reading'] ?? 0) <=> ($a['reading'] ?? 0));
    foreach ($indexed as $i => $r) {
        if (!isset($r['reading'])) { $matches[$i] = null; continue; }
        $best = null; $bestDiff = PHP_INT_MAX;
        foreach ($roomPrev as $rid => $info) {
            if (in_array($rid, $usedRooms, true)) continue;
            $diff = $r['reading'] - $info['prev'];
            if ($diff < 0 || $diff > 1000) continue; // không hợp lý
            if ($diff < $bestDiff) { $bestDiff = $diff; $best = $rid; }
        }
        if ($best !== null) {
            $usedRooms[] = $best;
            $matches[$i] = [
                'room_id'     => $best,
                'room_name'   => $roomPrev[$best]['name'],
                'room_code'   => $roomPrev[$best]['code'],
                'prev'        => $roomPrev[$best]['prev'],
                'diff'        => $bestDiff,
            ];
        } else {
            $matches[$i] = null;
        }
    }
    // Khôi phục thứ tự gốc
    ksort($matches);
    return $matches;
}

return function (Router $r): void {

    // POST /ocr/meter  (multipart/form-data: image=<file>)
    // Trả về: { reading: int, confidence: string }
    $r->add('POST', '/ocr/meter', function (): void {
        Auth::require();

        $apiKey = Env::get('GEMINI_API_KEY', '');
        if ($apiKey === '') Response::error('GEMINI_API_KEY chưa cấu hình', 500);

        if (empty($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
            Response::error('Thiếu file ảnh (field name=image)');
        }
        $file = $_FILES['image'];
        if ($file['size'] > 10 * 1024 * 1024) Response::error('Ảnh tối đa 10MB');

        $mime = mime_content_type($file['tmp_name']) ?: 'image/jpeg';
        if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp', 'image/heic'], true)) {
            Response::error('Định dạng không hỗ trợ (dùng JPG/PNG/WebP)');
        }

        $b64 = base64_encode(file_get_contents($file['tmp_name']));
        $result = gemini_ocr_single($apiKey, $b64, $mime);
        if (isset($result['error'])) Response::error('Gemini: ' . $result['error'], 502, $result);
        Response::json($result + ['raw_text' => '']);
    });

    // POST /ocr/meter/bulk  (multipart: image[]=<file>..., month=YYYY-MM)
    // Trả về: { results: [{index, reading, confidence, match: {room_id, room_name, prev, diff}|null, preview_index}] }
    $r->add('POST', '/ocr/meter/bulk', function (): void {
        Auth::require();

        $apiKey = Env::get('GEMINI_API_KEY', '');
        if ($apiKey === '') Response::error('GEMINI_API_KEY chưa cấu hình', 500);

        $month = $_POST['month'] ?? '';
        if ($month === '') Response::error('Thiếu month (YYYY-MM)');

        if (empty($_FILES['images']) || !is_array($_FILES['images']['tmp_name'])) {
            Response::error('Thiếu mảng ảnh (field name=images[])');
        }
        $files = $_FILES['images'];
        $images = [];
        $count = count($files['tmp_name']);
        for ($i = 0; $i < $count; $i++) {
            if ($files['error'][$i] !== UPLOAD_ERR_OK) continue;
            if ($files['size'][$i] > 10 * 1024 * 1024) Response::error("Ảnh $i > 10MB");
            $mime = mime_content_type($files['tmp_name'][$i]) ?: 'image/jpeg';
            if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp', 'image/heic'], true)) {
                Response::error("Ảnh $i định dạng không hỗ trợ");
            }
            $images[$i] = [base64_encode(file_get_contents($files['tmp_name'][$i])), $mime];
        }
        if (!$images) Response::error('Không có ảnh hợp lệ');

        // Gọi Gemini song song
        $ocrResults = gemini_ocr_batch($apiKey, $images);

        // Lấy chỉ số cũ của mỗi phòng active: ưu tiên bill < month, sau đó bill gần nhất bất kỳ
        $pdo = Db::pdo();
        $stmt = $pdo->prepare(
            "SELECT r.id, r.code, r.name,
                    COALESCE(
                      (SELECT electric_current FROM monthly_bills WHERE room_id = r.id AND month < ? ORDER BY month DESC LIMIT 1),
                      (SELECT electric_current FROM monthly_bills WHERE room_id = r.id ORDER BY month DESC LIMIT 1),
                      0
                    ) AS prev
             FROM rooms r WHERE r.is_active = 1"
        );
        $stmt->execute([$month]);
        $roomPrev = [];
        foreach ($stmt as $row) {
            $roomPrev[(int)$row['id']] = [
                'prev' => (int)$row['prev'],
                'name' => $row['name'],
                'code' => $row['code'],
            ];
        }

        $matches = match_readings_to_rooms($ocrResults, $roomPrev);

        $out = [];
        foreach ($ocrResults as $i => $res) {
            $out[] = [
                'index'      => $i,
                'reading'    => $res['reading'] ?? null,
                'confidence' => $res['confidence'] ?? null,
                'error'      => $res['error'] ?? null,
                'match'      => $matches[$i],
            ];
        }

        // Thông tin bổ sung: 5 phòng với prev để frontend cho user đổi match
        $rooms = [];
        foreach ($roomPrev as $rid => $info) {
            $rooms[] = ['id' => $rid, 'name' => $info['name'], 'code' => $info['code'], 'prev' => $info['prev']];
        }

        Response::json(['results' => $out, 'rooms' => $rooms]);
    });
};
