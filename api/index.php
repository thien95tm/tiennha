<?php
declare(strict_types=1);

/**
 * Tienthuenha - PHP 8.2 REST API entry point
 */

spl_autoload_register(function (string $class): void {
    if (!str_starts_with($class, 'App\\')) return;
    $file = __DIR__ . '/lib/' . substr($class, 4) . '.php';
    if (is_file($file)) require $file;
});

use App\{Env, Response, Router};

Env::load(__DIR__ . '/.env');

// CORS
$origin = Env::get('CORS_ORIGIN', '*');
header("Access-Control-Allow-Origin: $origin");
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Max-Age: 86400');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Error handling → JSON
set_error_handler(function ($severity, $message, $file, $line): bool {
    if (!(error_reporting() & $severity)) return false;
    throw new ErrorException($message, 0, $severity, $file, $line);
});
set_exception_handler(function (Throwable $e): void {
    Response::error('Server error: ' . $e->getMessage(), 500, [
        'file' => basename($e->getFile()),
        'line' => $e->getLine(),
    ]);
});

// Path: strip /api prefix nếu có
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
$uri = preg_replace('#^.*/api#', '', $uri);
$uri = '/' . trim($uri, '/');
if ($uri === '/') $uri = '';

$router = new Router();

// Đăng ký endpoints
foreach (glob(__DIR__ . '/endpoints/*.php') as $file) {
    (require $file)($router);
}

$router->dispatch($_SERVER['REQUEST_METHOD'] ?? 'GET', $uri);
