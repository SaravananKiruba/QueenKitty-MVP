<?php
/**
 * Tiny method+path router with {param} placeholders.
 *
 * Usage:
 *   $r = new Router();
 *   $r->get('/customers', [CustomerController::class, 'index']);
 *   $r->post('/customers/{id}/notes', fn($id) => ...);
 *   $r->dispatch();
 */

declare(strict_types=1);

final class Router
{
    /** @var array<string, array<string, array{0: callable|array, 1: string}>> */
    private array $routes = [];

    public function get(string $path, $handler): void    { $this->add('GET',    $path, $handler); }
    public function post(string $path, $handler): void   { $this->add('POST',   $path, $handler); }
    public function put(string $path, $handler): void    { $this->add('PUT',    $path, $handler); }
    public function patch(string $path, $handler): void  { $this->add('PATCH',  $path, $handler); }
    public function delete(string $path, $handler): void { $this->add('DELETE', $path, $handler); }

    private function add(string $method, string $path, $handler): void
    {
        $path = rtrim($path, '/') ?: '/';
        // Build regex: /customers/{id} -> #^/customers/(?P<id>[^/]+)$#
        $regex = preg_replace('#\{([a-zA-Z_][a-zA-Z0-9_]*)\}#', '(?P<$1>[^/]+)', $path);
        $this->routes[$method][$path] = [
            'handler' => $handler,
            'regex'   => '#^' . $regex . '$#',
        ];
    }

    public function dispatch(): void
    {
        $method = Request::method();
        $path   = Request::path();

        if ($method === 'OPTIONS') {
            // CORS preflight already handled by CORS layer in index.php
            http_response_code(204);
            exit;
        }

        $candidates = $this->routes[$method] ?? [];
        foreach ($candidates as $route) {
            if (preg_match($route['regex'], $path, $matches)) {
                $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
                try {
                    $result = call_user_func_array($route['handler'], array_values($params));
                    // Allow handlers to return arrays for convenience.
                    if (is_array($result)) {
                        Response::success($result);
                    }
                } catch (Throwable $e) {
                    self::handleException($e);
                }
                return;
            }
        }

        Response::error('Route not found: ' . $method . ' ' . $path, 404);
    }

    private static function handleException(Throwable $e): void
    {
        if (env('APP_ENV') === 'local') {
            Response::error($e->getMessage(), 500, [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
        }
        error_log('[QueenKitty] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
        Response::error('Internal server error', 500);
    }
}
