<?php
/**
 * Route declarations. Imported by index.php after framework boot.
 * Keep this file the single source of truth for the public API surface.
 */

declare(strict_types=1);

/** @var Router $router */

// --- Public ----------------------------------------------------------
$router->get('/health', function () {
    return ['status' => 'ok', 'time' => date('c')];
});

// --- Auth ------------------------------------------------------------
$router->post('/auth/signup', [new AuthController(), 'signup']);
$router->post('/auth/login',  [new AuthController(), 'login']);
$router->get('/auth/me',      [new AuthController(), 'me']);

// --- Customers -------------------------------------------------------
$router->get('/customers',                  [new CustomerController(), 'index']);
$router->post('/customers',                 [new CustomerController(), 'store']);
$router->get('/customers/{id}',             [new CustomerController(), 'show']);
$router->patch('/customers/{id}',           [new CustomerController(), 'update']);
$router->delete('/customers/{id}',          [new CustomerController(), 'destroy']);
$router->get('/customers/{id}/timeline',    [new CustomerController(), 'timeline']);

// --- Follow-ups (Feature 1) ------------------------------------------
$router->get('/followups',                  [new FollowupController(), 'index']);
$router->post('/followups',                 [new FollowupController(), 'store']);
$router->patch('/followups/{id}',           [new FollowupController(), 'update']);
$router->post('/followups/{id}/done',       [new FollowupController(), 'complete']);
$router->post('/followups/{id}/snooze',     [new FollowupController(), 'snooze']);
$router->delete('/followups/{id}',          [new FollowupController(), 'destroy']);

// --- Orders / Payments (Feature 3) -----------------------------------
$router->get('/orders',                     [new OrderController(), 'index']);
$router->post('/orders',                    [new OrderController(), 'store']);
$router->get('/orders/{id}',                [new OrderController(), 'show']);
$router->patch('/orders/{id}',              [new OrderController(), 'update']);
$router->post('/orders/{id}/payment',       [new OrderController(), 'recordPayment']);
$router->post('/orders/{id}/snooze',        [new OrderController(), 'snoozeReminder']);
$router->delete('/orders/{id}',             [new OrderController(), 'destroy']);

// --- Repeat-order reminders (Feature 4) ------------------------------
$router->get('/repeats',                    [new RepeatController(), 'index']);
$router->post('/repeats/{id}/snooze',       [new RepeatController(), 'snooze']);
$router->post('/repeats/{id}/dismiss',      [new RepeatController(), 'dismiss']);

// --- Settings (Feature 4 — configurable cadences) --------------------
$router->get('/settings',                   [new SettingsController(), 'show']);
$router->patch('/settings',                 [new SettingsController(), 'update']);

// --- Products (Feature 2 — product master + search) ------------------
$router->get('/products',                   [new ProductController(), 'index']);
$router->post('/products',                  [new ProductController(), 'store']);
$router->patch('/products/{id}',            [new ProductController(), 'update']);
$router->delete('/products/{id}',           [new ProductController(), 'destroy']);
