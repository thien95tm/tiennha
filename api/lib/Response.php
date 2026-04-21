<?php
declare(strict_types=1);

namespace App;

final class Response
{
    public static function json(mixed $data, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(self::normalize($data), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    // MariaDB PDO driver thỉnh thoảng trả numeric string thay vì int (bất chấp
    // STRINGIFY_FETCHES=false). Cast recursive: chuỗi chỉ có ký tự số → int.
    private static function normalize(mixed $v): mixed
    {
        if (is_array($v)) {
            foreach ($v as $k => $item) $v[$k] = self::normalize($item);
            return $v;
        }
        if (is_string($v) && $v !== '' && preg_match('/^-?\d+$/', $v) && strlen($v) < 16) {
            return (int)$v;
        }
        return $v;
    }

    public static function error(string $message, int $status = 400, array $extra = []): never
    {
        self::json(['error' => $message] + $extra, $status);
    }
}
