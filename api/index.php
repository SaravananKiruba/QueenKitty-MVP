<?php
/**
 * QueenKitty API front controller.
 * All /api/* requests are routed here via api/.htaccess.
 */

declare(strict_types=1);

// Boot
require __DIR__ . '/config/config.php';
require __DIR__ . '/config/database.php';
require __DIR__ . '/core/Response.php';
require __DIR__ . '/core/Request.php';
require __DIR__ . '/core/Cors.php';
require __DIR__ . '/core/Auth.php';
require __DIR__ . '/core/Router.php';

// Autoload controllers (tiny, MVP-friendly — no Composer)
spl_autoload_register(function (string $class): void {
    $file = __DIR__ . '/controllers/' . $class . '.php';
    if (is_file($file)) {
        require $file;
    }
});

// Error reporting: visible locally, silent in production.
if (env('APP_ENV') === 'local') {
    ini_set('display_errors', '1');
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', '0');
    error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED);
}

set_exception_handler(function (Throwable $e): void {
    error_log('[QueenKitty] Uncaught: ' . $e->getMessage());
    if (env('APP_ENV') === 'local') {
        Response::error($e->getMessage(), 500, [
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ]);
    }
    Response::error('Internal server error', 500);
});

Cors::handle();

$router = new Router();
require __DIR__ . '/routes.php';
$router->dispatch();
