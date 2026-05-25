<?php
/**
 * OrderController: lightweight order + payment tracking.
 * NOT an accounting system (CLAUDE.md Feature 3).
 *
 * pending_amount is always derived = amount - paid_amount, clamped to >= 0.
 * Every query MUST filter by Auth::userId().
 */

declare(strict_types=1);

final class OrderController
{
    /**
     * GET /orders?scope=pending|all|due_today|customer&customer_id=&q=
     */
    public function index(): void
    {
        $userId = Auth::userId();
        $scope  = (string) Request::query('scope', 'all');
        $today  = date('Y-m-d');

        $sql = 'SELECT o.id, o.customer_id, o.product_name, o.product_category,
                       o.amount, o.paid_amount, o.pending_amount,
                       o.order_date, o.next_repeat_date, o.payment_reminder_date,
                       o.created_at, o.updated_at,
                       c.name AS customer_name, c.phone AS customer_phone
                  FROM orders o
                  JOIN customers c ON c.id = o.customer_id AND c.user_id = o.user_id
                 WHERE o.user_id = ?';
        $params = [$userId];

        switch ($scope) {
            case 'pending':
                $sql .= ' AND o.pending_amount > 0';
                break;
            case 'due_today':
                $sql     .= ' AND o.pending_amount > 0 AND (o.payment_reminder_date IS NULL OR o.payment_reminder_date <= ?)';
                $params[] = $today;
                break;
            case 'customer':
                $cid = (int) Request::query('customer_id', 0);
                if ($cid <= 0) { Response::error('customer_id required', 422); }
                $sql     .= ' AND o.customer_id = ?';
                $params[] = $cid;
                break;
            case 'all':
            default:
                break;
        }

        $q = trim((string) Request::query('q', ''));
        if ($q !== '') {
            $sql     .= ' AND (c.name LIKE ? OR c.phone LIKE ?)';
            $like     = '%' . $q . '%';
            $params[] = $like;
            $params[] = $like;
        }

        // Pending first (most urgent), then by reminder/order date.
        $sql .= ' ORDER BY (o.pending_amount > 0) DESC,
                          COALESCE(o.payment_reminder_date, o.order_date) ASC,
                          o.id DESC
                  LIMIT 200';

        $stmt = db()->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        Response::success([
            'orders'  => $rows,
            'summary' => self::summary($userId, $today),
        ]);
    }

    public function show(string $id): void
    {
        $userId = Auth::userId();
        $row    = self::fetchOne($userId, (int) $id);
        if (!$row) { Response::error('Order not found', 404); }
        Response::success(['order' => $row]);
    }

    /**
     * POST /orders
     * Body:
     *   customer_id  (or name+phone for upsert)
     *   product_name
     *   product_category (kitchen|bottle|storage|other) - optional
     *   amount, paid_amount (default 0)
     *   order_date (default today)
     *   payment_reminder_date (optional)
     */
    public function store(): void
    {
        $userId = Auth::userId();

        $customerId = (int) Request::input('customer_id', 0);
        $product    = trim((string) Request::input('product_name', ''));
        $category   = self::normalizeCategory((string) Request::input('product_category', 'other'));
        $amount     = self::money(Request::input('amount', 0));
        $paid       = self::money(Request::input('paid_amount', 0));
        $orderDate  = trim((string) Request::input('order_date', '')) ?: date('Y-m-d');
        $reminder   = trim((string) Request::input('payment_reminder_date', '')) ?: null;

        $errors = [];
        if ($product === '')      { $errors['product_name'] = 'Product is required'; }
        if ($amount <= 0)         { $errors['amount']       = 'Amount must be greater than 0'; }
        if ($paid < 0)            { $errors['paid_amount']  = 'Paid cannot be negative'; }
        if ($paid > $amount)      { $errors['paid_amount']  = 'Paid cannot exceed order amount'; }
        if (!self::isValidDate($orderDate)) { $errors['order_date'] = 'Invalid order date'; }
        if ($reminder !== null && !self::isValidDate($reminder)) {
            $errors['payment_reminder_date'] = 'Invalid reminder date';
        }

        if ($customerId > 0) {
            $check = db()->prepare('SELECT id FROM customers WHERE id = ? AND user_id = ? LIMIT 1');
            $check->execute([$customerId, $userId]);
            if (!$check->fetch()) { $errors['customer_id'] = 'Customer not found'; }
        } else {
            $name  = trim((string) Request::input('name', ''));
            $phone = preg_replace('/\D+/', '', (string) Request::input('phone', '')) ?? '';
            if ($name === '' || mb_strlen($name) < 2) { $errors['name']  = 'Name is required'; }
            if (!preg_match('/^\d{10,15}$/', $phone))  { $errors['phone'] = 'Valid phone is required'; }
        }

        if ($errors) { Response::error('Validation failed', 422, $errors); }

        if ($customerId === 0) {
            $customer   = CustomerController::findOrCreate($userId, $name, $phone);
            $customerId = (int) $customer['id'];
        }

        $pending = max(0.0, $amount - $paid);

        // Default repeat-date by category (Feature 4 — configurable per seller).
        $repeatDays = UserSettings::repeatDaysFor($userId, $category);
        $nextRepeat = $repeatDays > 0
            ? date('Y-m-d', strtotime($orderDate . " +{$repeatDays} days"))
            : null;

        // Default payment reminder: today+7 if pending and no explicit date given.
        if ($reminder === null && $pending > 0) {
            $reminder = date('Y-m-d', strtotime('+7 days'));
        }

        $insert = db()->prepare(
            'INSERT INTO orders
                (customer_id, user_id, product_name, product_category,
                 amount, paid_amount, pending_amount,
                 order_date, next_repeat_date, payment_reminder_date)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $insert->execute([
            $customerId, $userId, $product, $category,
            $amount, $paid, $pending,
            $orderDate, $nextRepeat, $reminder,
        ]);
        $id = (int) db()->lastInsertId();

        Response::success(['order' => self::fetchOne($userId, $id)], 'Order saved', 201);
    }

    public function update(string $id): void
    {
        $userId = Auth::userId();
        $id     = (int) $id;

        $existing = self::fetchOne($userId, $id);
        if (!$existing) { Response::error('Order not found', 404); }

        $fields = [];
        $params = [];

        if (Request::input('product_name') !== null) {
            $p = trim((string) Request::input('product_name'));
            if ($p === '') { Response::error('Product cannot be empty', 422); }
            $fields[] = 'product_name = ?';
            $params[] = $p;
        }
        if (Request::input('product_category') !== null) {
            $fields[] = 'product_category = ?';
            $params[] = self::normalizeCategory((string) Request::input('product_category'));
        }

        $newAmount = $existing['amount'];
        $newPaid   = $existing['paid_amount'];

        if (Request::input('amount') !== null) {
            $newAmount = self::money(Request::input('amount'));
            if ($newAmount <= 0) { Response::error('Amount must be > 0', 422); }
            $fields[] = 'amount = ?';
            $params[] = $newAmount;
        }
        if (Request::input('paid_amount') !== null) {
            $newPaid = self::money(Request::input('paid_amount'));
            if ($newPaid < 0) { Response::error('Paid cannot be negative', 422); }
            $fields[] = 'paid_amount = ?';
            $params[] = $newPaid;
        }
        if (Request::input('amount') !== null || Request::input('paid_amount') !== null) {
            $newPaid = min((float) $newPaid, (float) $newAmount);
            $pending = max(0.0, (float) $newAmount - (float) $newPaid);
            $fields[] = 'pending_amount = ?';
            $params[] = $pending;
        }

        if (Request::input('order_date') !== null) {
            $d = (string) Request::input('order_date');
            if (!self::isValidDate($d)) { Response::error('Invalid order date', 422); }
            $fields[] = 'order_date = ?';
            $params[] = $d;
        }
        if (Request::input('payment_reminder_date') !== null) {
            $d = trim((string) Request::input('payment_reminder_date'));
            if ($d !== '' && !self::isValidDate($d)) { Response::error('Invalid reminder date', 422); }
            $fields[] = 'payment_reminder_date = ?';
            $params[] = $d === '' ? null : $d;
        }
        if (Request::input('next_repeat_date') !== null) {
            $d = trim((string) Request::input('next_repeat_date'));
            if ($d !== '' && !self::isValidDate($d)) { Response::error('Invalid repeat date', 422); }
            $fields[] = 'next_repeat_date = ?';
            $params[] = $d === '' ? null : $d;
        }

        if (!$fields) { Response::error('Nothing to update', 422); }

        $params[] = $id;
        $params[] = $userId;
        db()->prepare('UPDATE orders SET ' . implode(', ', $fields)
            . ' WHERE id = ? AND user_id = ?')->execute($params);

        Response::success(['order' => self::fetchOne($userId, $id)], 'Order updated');
    }

    /**
     * POST /orders/{id}/payment
     * Body: { amount: number, mark_paid?: bool }
     * Records a payment by INCREMENTING paid_amount.
     */
    public function recordPayment(string $id): void
    {
        $userId = Auth::userId();
        $id     = (int) $id;

        $existing = self::fetchOne($userId, $id);
        if (!$existing) { Response::error('Order not found', 404); }

        $markPaid = (bool) Request::input('mark_paid', false);
        $delta    = self::money(Request::input('amount', 0));

        if ($markPaid) {
            $newPaid = (float) $existing['amount'];
        } else {
            if ($delta <= 0) { Response::error('Payment amount must be > 0', 422); }
            $newPaid = min((float) $existing['amount'], (float) $existing['paid_amount'] + $delta);
        }
        $newPending = max(0.0, (float) $existing['amount'] - $newPaid);

        $stmt = db()->prepare(
            'UPDATE orders
                SET paid_amount = ?, pending_amount = ?,
                    payment_reminder_date = CASE WHEN ? = 0 THEN NULL ELSE payment_reminder_date END
              WHERE id = ? AND user_id = ?'
        );
        $stmt->execute([$newPaid, $newPending, $newPending, $id, $userId]);

        Response::success(['order' => self::fetchOne($userId, $id)], 'Payment recorded');
    }

    /**
     * POST /orders/{id}/snooze   body: { days?, payment_reminder_date? }
     */
    public function snoozeReminder(string $id): void
    {
        $userId = Auth::userId();
        $id     = (int) $id;

        $date = trim((string) Request::input('payment_reminder_date', ''));
        if (!self::isValidDate($date)) {
            $days = max(1, (int) Request::input('days', 3));
            $date = date('Y-m-d', strtotime("+{$days} days"));
        }

        $stmt = db()->prepare(
            'UPDATE orders SET payment_reminder_date = ?
              WHERE id = ? AND user_id = ?'
        );
        $stmt->execute([$date, $id, $userId]);
        if ($stmt->rowCount() === 0) { Response::error('Order not found', 404); }

        Response::success(['order' => self::fetchOne($userId, $id)], 'Reminder snoozed to ' . $date);
    }

    public function destroy(string $id): void
    {
        $userId = Auth::userId();
        $stmt   = db()->prepare('DELETE FROM orders WHERE id = ? AND user_id = ?');
        $stmt->execute([(int) $id, $userId]);
        if ($stmt->rowCount() === 0) { Response::error('Order not found', 404); }
        Response::success(null, 'Order deleted');
    }

    // --- helpers -----------------------------------------------------

    private static function fetchOne(int $userId, int $id): ?array
    {
        $stmt = db()->prepare(
            'SELECT o.id, o.customer_id, o.product_name, o.product_category,
                    o.amount, o.paid_amount, o.pending_amount,
                    o.order_date, o.next_repeat_date, o.payment_reminder_date,
                    o.created_at, o.updated_at,
                    c.name AS customer_name, c.phone AS customer_phone
               FROM orders o
               JOIN customers c ON c.id = o.customer_id AND c.user_id = o.user_id
              WHERE o.id = ? AND o.user_id = ? LIMIT 1'
        );
        $stmt->execute([$id, $userId]);
        return $stmt->fetch() ?: null;
    }

    private static function summary(int $userId, string $today): array
    {
        $stmt = db()->prepare(
            'SELECT
                COUNT(*)                                              AS total_orders,
                COALESCE(SUM(pending_amount), 0)                      AS total_pending,
                SUM(CASE WHEN pending_amount > 0 THEN 1 ELSE 0 END)   AS pending_count,
                SUM(CASE WHEN pending_amount > 0
                          AND (payment_reminder_date IS NULL OR payment_reminder_date <= ?)
                         THEN 1 ELSE 0 END)                            AS due_today_count
             FROM orders WHERE user_id = ?'
        );
        $stmt->execute([$today, $userId]);
        $row = $stmt->fetch() ?: [];
        return [
            'total_orders'     => (int)   ($row['total_orders']     ?? 0),
            'total_pending'    => (float) ($row['total_pending']    ?? 0),
            'pending_count'    => (int)   ($row['pending_count']    ?? 0),
            'due_today_count'  => (int)   ($row['due_today_count']  ?? 0),
        ];
    }

    private static function isValidDate(string $d): bool
    {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $d)) { return false; }
        $dt = DateTime::createFromFormat('Y-m-d', $d);
        return $dt && $dt->format('Y-m-d') === $d;
    }

    private static function normalizeCategory(string $c): string
    {
        $c = strtolower(trim($c));
        return in_array($c, ['kitchen', 'bottle', 'storage', 'other'], true) ? $c : 'other';
    }

    private static function money($n): float
    {
        return round((float) $n, 2);
    }
}
