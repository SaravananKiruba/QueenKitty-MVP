<?php
/**
 * Dev router for PHP's built-in server (`php -S`).
 * Production uses Apache .htaccess instead.
 *
 *   php -S localhost:8000 server.php
 *
 * Routes:
 *   /api/*            -> api/index.php (front controller)
 *   real files        -> served as-is
 *   /uploads/*        -> served as-is
 *   anything else     -> public/index.html (SPA fallback)
 */

declare(strict_types=1);

$uri  = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';
$root = __DIR__;

// 1. API requests -> PHP front controller
if (str_starts_with($uri, '/api')) {
    require $root . '/api/index.php';
    return true;
}

// 2. Real static files (built SPA assets, uploads, favicons)
$candidates = [
    $root . '/public' . $uri,
    $root . $uri,
];
foreach ($candidates as $path) {
    if ($uri !== '/' && is_file($path)) {
        return false; // let the built-in server stream it
    }
}

// 3. SPA fallback
$spa = $root . '/public/index.html';
if (is_file($spa)) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($spa);
    return true;
}

// 4. No build yet — friendly notice (use `cd app && npm run dev` for the SPA)
header('Content-Type: text/html; charset=utf-8');
echo '<!doctype html><meta charset="utf-8"><title>QueenKitty API</title>'
   . '<body style="font-family:system-ui;padding:2rem;max-width:640px;margin:auto">'
   . '<h1>QueenKitty API is running</h1>'
   . '<p>The SPA has not been built yet. For development run:</p>'
   . '<pre>cd app &amp;&amp; npm install &amp;&amp; npm run dev</pre>'
   . '<p>API health: <a href="/api/health">/api/health</a></p>'
   . '</body>';
return true;
