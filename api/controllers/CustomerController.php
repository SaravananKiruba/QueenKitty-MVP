<?php
/**
 * CustomerController: tenant-scoped customer CRUD.
 * Every query MUST filter by Auth::userId() (CLAUDE.md multi-tenant rule).
 */

declare(strict_types=1);

final class CustomerController
{
    public function index(): void
    {
        $userId = Auth::userId();
        $q      = trim((string) Request::query('q', ''));

        $sql    = 'SELECT id, name, phone, area, notes, created_at, updated_at
                   FROM customers WHERE user_id = ?';
        $params = [$userId];

        if ($q !== '') {
            $sql     .= ' AND (name LIKE ? OR phone LIKE ?)';
            $like     = '%' . $q . '%';
            $params[] = $like;
            $params[] = $like;
        }
        $sql .= ' ORDER BY name ASC LIMIT 200';

        $stmt = db()->prepare($sql);
        $stmt->execute($params);
        Response::success(['customers' => $stmt->fetchAll()]);
    }

    public function show(string $id): void
    {
        $userId = Auth::userId();
        $stmt   = db()->prepare(
            'SELECT id, name, phone, area, notes, created_at, updated_at
             FROM customers WHERE id = ? AND user_id = ? LIMIT 1'
        );
        $stmt->execute([(int) $id, $userId]);
        $row = $stmt->fetch();
        if (!$row) { Response::error('Customer not found', 404); }
        Response::success(['customer' => $row]);
    }

    public function store(): void
    {
        $userId = Auth::userId();
        [$name, $phone, $area, $notes, $errors] = self::validatePayload();
        if ($errors) { Response::error('Validation failed', 422, $errors); }

        $row = self::findOrCreate($userId, $name, $phone, $area, $notes);
        Response::success(['customer' => $row], 'Customer saved', 201);
    }

    public function update(string $id): void
    {
        $userId = Auth::userId();
        $id     = (int) $id;

        $existing = self::ownedById($userId, $id);
        if (!$existing) { Response::error('Customer not found', 404); }

        $fields = [];
        $params = [];

        if (Request::input('name') !== null) {
            $name = trim((string) Request::input('name'));
            if (mb_strlen($name) < 2) { Response::error('Name is too short', 422); }
            $fields[] = 'name = ?';
            $params[] = $name;
        }
        if (Request::input('phone') !== null) {
            $phone = preg_replace('/\D+/', '', (string) Request::input('phone')) ?? '';
            if (!preg_match('/^\d{10,15}$/', $phone)) { Response::error('Invalid phone', 422); }
            $fields[] = 'phone = ?';
            $params[] = $phone;
        }
        if (Request::input('area') !== null) {
            $fields[] = 'area = ?';
            $params[] = trim((string) Request::input('area')) ?: null;
        }
        if (Request::input('notes') !== null) {
            $fields[] = 'notes = ?';
            $params[] = trim((string) Request::input('notes')) ?: null;
        }
        if (!$fields) { Response::error('Nothing to update', 422); }

        $params[] = $id;
        $params[] = $userId;
        db()->prepare('UPDATE customers SET ' . implode(', ', $fields)
            . ' WHERE id = ? AND user_id = ?')->execute($params);

        Response::success(['customer' => self::ownedById($userId, $id)], 'Customer updated');
    }

    public function destroy(string $id): void
    {
        $userId = Auth::userId();
        $stmt   = db()->prepare('DELETE FROM customers WHERE id = ? AND user_id = ?');
        $stmt->execute([(int) $id, $userId]);
        if ($stmt->rowCount() === 0) { Response::error('Customer not found', 404); }
        Response::success(null, 'Customer deleted');
    }

    /**
     * GET /customers/{id}/timeline
     * Unified, descending event feed: customer creation, follow-ups, orders, payments.
     * Built per CLAUDE.md Feature 2 — "Customer Timeline reduces memory dependency".
     */
    public function timeline(string $id): void
    {
        $userId = Auth::userId();
        $id     = (int) $id;

        $customer = self::ownedById($userId, $id);
        if (!$customer) { Response::error('Customer not found', 404); }

        $events = [];

        // 1. Customer created
        $events[] = [
            'type'     => 'customer_added',
            'at'       => $customer['created_at'],
            'title'    => 'Customer added',
            'subtitle' => $customer['area'] ? 'From ' . $customer['area'] : null,
        ];

        // 2. Follow-ups (created + completed = two events when applicable)
        $f = db()->prepare(
            'SELECT id, product_interest, followup_date, status, notes,
                    is_completed, completed_at, created_at
             FROM followups
             WHERE customer_id = ? AND user_id = ?
             ORDER BY created_at DESC LIMIT 100'
        );
        $f->execute([$id, $userId]);
        foreach ($f->fetchAll() as $row) {
            $events[] = [
                'type'     => 'followup_created',
                'at'       => $row['created_at'],
                'title'    => 'Follow-up planned: ' . $row['product_interest'],
                'subtitle' => $row['notes'] ? '"' . $row['notes'] . '"' : 'For ' . $row['followup_date'],
                'meta'     => ['followup_id' => (int) $row['id'], 'date' => $row['followup_date']],
            ];
            if ($row['is_completed'] && $row['completed_at']) {
                $events[] = [
                    'type'     => 'followup_done',
                    'at'       => $row['completed_at'],
                    'title'    => 'Follow-up completed',
                    'subtitle' => $row['product_interest'],
                    'meta'     => ['followup_id' => (int) $row['id']],
                ];
            }
        }

        // 3. Orders
        $o = db()->prepare(
            'SELECT id, product_name, product_category, amount, paid_amount,
                    pending_amount, order_date, created_at
             FROM orders
             WHERE customer_id = ? AND user_id = ?
             ORDER BY created_at DESC LIMIT 100'
        );
        $o->execute([$id, $userId]);
        foreach ($o->fetchAll() as $row) {
            $amt = (float) $row['amount'];
            $events[] = [
                'type'     => 'order_placed',
                'at'       => $row['created_at'],
                'title'    => 'Bought ' . ($row['product_name'] ?: ucfirst($row['product_category'])),
                'subtitle' => $amt > 0 ? '₹' . self::money($amt) . ' on ' . $row['order_date'] : 'On ' . $row['order_date'],
                'meta'     => ['order_id' => (int) $row['id']],
            ];
            if ((float) $row['pending_amount'] > 0) {
                $events[] = [
                    'type'     => 'payment_pending',
                    'at'       => $row['created_at'],
                    'title'    => 'Payment pending',
                    'subtitle' => '₹' . self::money((float) $row['pending_amount']) . ' of ₹' . self::money($amt),
                    'meta'     => ['order_id' => (int) $row['id']],
                ];
            }
        }

        // Sort descending by `at`
        usort($events, fn($a, $b) => strcmp((string) $b['at'], (string) $a['at']));

        // Summary stats
        $stats = self::customerStats($userId, $id);

        Response::success([
            'customer' => $customer,
            'events'   => $events,
            'stats'    => $stats,
        ]);
    }

    private static function ownedById(int $userId, int $id): ?array
    {
        $stmt = db()->prepare(
            'SELECT id, name, phone, area, notes, created_at, updated_at
             FROM customers WHERE id = ? AND user_id = ? LIMIT 1'
        );
        $stmt->execute([$id, $userId]);
        return $stmt->fetch() ?: null;
    }

    private static function customerStats(int $userId, int $customerId): array
    {
        $fp = db()->prepare(
            "SELECT
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS open_followups,
                SUM(CASE WHEN status = 'done'    THEN 1 ELSE 0 END) AS done_followups
             FROM followups WHERE customer_id = ? AND user_id = ?"
        );
        $fp->execute([$customerId, $userId]);
        $fStats = $fp->fetch() ?: [];

        $op = db()->prepare(
            'SELECT
                COUNT(*) AS total_orders,
                COALESCE(SUM(amount), 0)         AS total_value,
                COALESCE(SUM(pending_amount), 0) AS pending_total,
                MAX(order_date)                  AS last_order_date
             FROM orders WHERE customer_id = ? AND user_id = ?'
        );
        $op->execute([$customerId, $userId]);
        $oStats = $op->fetch() ?: [];

        return [
            'open_followups'  => (int) ($fStats['open_followups'] ?? 0),
            'done_followups'  => (int) ($fStats['done_followups'] ?? 0),
            'total_orders'    => (int) ($oStats['total_orders']   ?? 0),
            'total_value'     => (float) ($oStats['total_value']    ?? 0),
            'pending_total'   => (float) ($oStats['pending_total']  ?? 0),
            'last_order_date' => $oStats['last_order_date'] ?? null,
        ];
    }

    private static function money(float $n): string
    {
        return number_format($n, 2, '.', ',');
    }

    /**
     * Find an existing customer (by user_id + phone) or insert a new one.
     * Reused by FollowupController for the 10-second add flow.
     */
    public static function findOrCreate(
        int $userId,
        string $name,
        string $phone,
        ?string $area = null,
        ?string $notes = null
    ): array {
        $pdo = db();
        $stmt = $pdo->prepare(
            'SELECT id, name, phone, area, notes, created_at, updated_at
             FROM customers WHERE user_id = ? AND phone = ? LIMIT 1'
        );
        $stmt->execute([$userId, $phone]);
        $existing = $stmt->fetch();
        if ($existing) {
            return $existing;
        }

        $insert = $pdo->prepare(
            'INSERT INTO customers (user_id, name, phone, area, notes)
             VALUES (?, ?, ?, ?, ?)'
        );
        $insert->execute([$userId, $name, $phone, $area, $notes]);
        $id = (int) $pdo->lastInsertId();

        $get = $pdo->prepare(
            'SELECT id, name, phone, area, notes, created_at, updated_at
             FROM customers WHERE id = ?'
        );
        $get->execute([$id]);
        return $get->fetch();
    }

    /**
     * @return array{0:string,1:string,2:?string,3:?string,4:array<string,string>}
     */
    private static function validatePayload(): array
    {
        $name  = trim((string) Request::input('name', ''));
        $phone = preg_replace('/\D+/', '', (string) Request::input('phone', '')) ?? '';
        $area  = trim((string) Request::input('area', '')) ?: null;
        $notes = trim((string) Request::input('notes', '')) ?: null;

        $errors = [];
        if ($name === '' || mb_strlen($name) < 2) { $errors['name']  = 'Name is required'; }
        if (!preg_match('/^\d{10,15}$/', $phone))  { $errors['phone'] = 'Valid phone is required'; }

        return [$name, $phone, $area, $notes, $errors];
    }
}
