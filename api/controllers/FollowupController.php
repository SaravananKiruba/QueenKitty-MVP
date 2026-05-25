<?php
/**
 * FollowupController: the heart of the MVP (CLAUDE.md Feature 1).
 *
 * "10-second add-lead flow": POST /followups with name + phone + product +
 * date + short note will upsert the customer and create the follow-up in
 * one round-trip.
 *
 * All queries are tenant-scoped via Auth::userId().
 */

declare(strict_types=1);

final class FollowupController
{
    /**
     * GET /followups?scope=today|upcoming|overdue|all&status=pending|done
     */
    public function index(): void
    {
        $userId = Auth::userId();
        $scope  = (string) Request::query('scope', 'today');
        $status = (string) Request::query('status', '');

        $today = date('Y-m-d');
        $sql = 'SELECT f.id, f.customer_id, f.product_interest, f.followup_date,
                       f.status, f.notes, f.is_completed, f.completed_at,
                       f.created_at, f.updated_at,
                       c.name AS customer_name, c.phone AS customer_phone, c.area AS customer_area
                  FROM followups f
                  JOIN customers c ON c.id = f.customer_id AND c.user_id = f.user_id
                 WHERE f.user_id = ?';
        $params = [$userId];

        switch ($scope) {
            case 'today':
                $sql     .= " AND f.followup_date = ? AND f.status = 'pending'";
                $params[] = $today;
                break;
            case 'upcoming':
                $sql     .= " AND f.followup_date > ? AND f.status = 'pending'";
                $params[] = $today;
                break;
            case 'overdue':
                $sql     .= " AND f.followup_date < ? AND f.status = 'pending'";
                $params[] = $today;
                break;
            case 'done':
                $sql .= " AND f.status = 'done'";
                break;
            case 'all':
            default:
                // no extra clause
                break;
        }

        if ($status !== '' && $scope !== 'done') {
            $sql     .= ' AND f.status = ?';
            $params[] = $status;
        }

        $sql .= ' ORDER BY f.followup_date ASC, f.id DESC LIMIT 200';

        $stmt = db()->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        Response::success([
            'followups' => $rows,
            'counts'    => self::counts($userId, $today),
        ]);
    }

    /**
     * POST /followups
     * Body: { name, phone, product_interest, followup_date, notes?, area?, customer_id? }
     * If customer_id is omitted, customer is upserted by (user_id, phone).
     */
    public function store(): void
    {
        $userId = Auth::userId();

        $customerId = (int) Request::input('customer_id', 0);
        $product    = trim((string) Request::input('product_interest', ''));
        $date       = trim((string) Request::input('followup_date', ''));
        $notes      = trim((string) Request::input('notes', '')) ?: null;

        $errors = [];
        if ($product === '') { $errors['product_interest'] = 'Product is required'; }
        if (!self::isValidDate($date)) { $errors['followup_date'] = 'Valid date is required'; }

        if ($customerId > 0) {
            $check = db()->prepare('SELECT id FROM customers WHERE id = ? AND user_id = ? LIMIT 1');
            $check->execute([$customerId, $userId]);
            if (!$check->fetch()) { $errors['customer_id'] = 'Customer not found'; }
        } else {
            $name  = trim((string) Request::input('name', ''));
            $phone = preg_replace('/\D+/', '', (string) Request::input('phone', '')) ?? '';
            $area  = trim((string) Request::input('area', '')) ?: null;
            if ($name === '' || mb_strlen($name) < 2) { $errors['name']  = 'Name is required'; }
            if (!preg_match('/^\d{10,15}$/', $phone))  { $errors['phone'] = 'Valid phone is required'; }
        }

        if ($errors) { Response::error('Validation failed', 422, $errors); }

        if ($customerId === 0) {
            $customer   = CustomerController::findOrCreate($userId, $name, $phone, $area ?? null);
            $customerId = (int) $customer['id'];
        }

        $insert = db()->prepare(
            'INSERT INTO followups
                (customer_id, user_id, product_interest, followup_date, status, notes)
             VALUES (?, ?, ?, ?, "pending", ?)'
        );
        $insert->execute([$customerId, $userId, $product, $date, $notes]);
        $id = (int) db()->lastInsertId();

        Response::success(['followup' => self::fetchOne($userId, $id)], 'Follow-up created', 201);
    }

    /**
     * PATCH /followups/{id}
     * Body: { status?, followup_date?, notes?, product_interest? }
     * Common shortcuts: done, snooze (pass new followup_date), reopen.
     */
    public function update(string $id): void
    {
        $userId = Auth::userId();
        $id     = (int) $id;

        $existing = self::fetchOne($userId, $id);
        if (!$existing) { Response::error('Follow-up not found', 404); }

        $fields = [];
        $params = [];

        if (Request::input('status') !== null) {
            $status = (string) Request::input('status');
            if (!in_array($status, ['pending', 'done', 'snoozed', 'cancelled'], true)) {
                Response::error('Invalid status', 422);
            }
            $fields[] = 'status = ?';
            $params[] = $status;
            $fields[] = 'is_completed = ?';
            $params[] = $status === 'done' ? 1 : 0;
            $fields[] = 'completed_at = ' . ($status === 'done' ? 'CURRENT_TIMESTAMP' : 'NULL');
        }

        if (Request::input('followup_date') !== null) {
            $date = (string) Request::input('followup_date');
            if (!self::isValidDate($date)) { Response::error('Invalid date', 422); }
            $fields[] = 'followup_date = ?';
            $params[] = $date;
        }

        if (Request::input('notes') !== null) {
            $fields[] = 'notes = ?';
            $params[] = trim((string) Request::input('notes')) ?: null;
        }

        if (Request::input('product_interest') !== null) {
            $product = trim((string) Request::input('product_interest'));
            if ($product === '') { Response::error('Product cannot be empty', 422); }
            $fields[] = 'product_interest = ?';
            $params[] = $product;
        }

        if (!$fields) { Response::error('Nothing to update', 422); }

        $params[] = $id;
        $params[] = $userId;
        $sql = 'UPDATE followups SET ' . implode(', ', $fields)
             . ' WHERE id = ? AND user_id = ?';
        db()->prepare($sql)->execute($params);

        Response::success(['followup' => self::fetchOne($userId, $id)], 'Follow-up updated');
    }

    /**
     * Convenience endpoints. Saves a round-trip from the mobile UI.
     * POST /followups/{id}/done
     * POST /followups/{id}/snooze   body: { days?: int, followup_date?: string }
     */
    public function complete(string $id): void
    {
        $userId = Auth::userId();
        $id     = (int) $id;

        $stmt = db()->prepare(
            'UPDATE followups
                SET status = "done", is_completed = 1, completed_at = CURRENT_TIMESTAMP
              WHERE id = ? AND user_id = ?'
        );
        $stmt->execute([$id, $userId]);
        if ($stmt->rowCount() === 0) { Response::error('Follow-up not found', 404); }

        Response::success(['followup' => self::fetchOne($userId, $id)], 'Marked done');
    }

    public function snooze(string $id): void
    {
        $userId = Auth::userId();
        $id     = (int) $id;

        $date = (string) Request::input('followup_date', '');
        if (!self::isValidDate($date)) {
            $days = max(1, (int) Request::input('days', 1));
            $date = date('Y-m-d', strtotime("+{$days} days"));
        }

        $stmt = db()->prepare(
            'UPDATE followups SET followup_date = ?, status = "pending",
                    is_completed = 0, completed_at = NULL
              WHERE id = ? AND user_id = ?'
        );
        $stmt->execute([$date, $id, $userId]);
        if ($stmt->rowCount() === 0) { Response::error('Follow-up not found', 404); }

        Response::success(['followup' => self::fetchOne($userId, $id)], 'Snoozed to ' . $date);
    }

    public function destroy(string $id): void
    {
        $userId = Auth::userId();
        $stmt   = db()->prepare('DELETE FROM followups WHERE id = ? AND user_id = ?');
        $stmt->execute([(int) $id, $userId]);
        if ($stmt->rowCount() === 0) { Response::error('Follow-up not found', 404); }
        Response::success(null, 'Follow-up deleted');
    }

    // --- helpers -----------------------------------------------------

    private static function fetchOne(int $userId, int $id): ?array
    {
        $stmt = db()->prepare(
            'SELECT f.id, f.customer_id, f.product_interest, f.followup_date,
                    f.status, f.notes, f.is_completed, f.completed_at,
                    f.created_at, f.updated_at,
                    c.name AS customer_name, c.phone AS customer_phone, c.area AS customer_area
               FROM followups f
               JOIN customers c ON c.id = f.customer_id AND c.user_id = f.user_id
              WHERE f.id = ? AND f.user_id = ? LIMIT 1'
        );
        $stmt->execute([$id, $userId]);
        return $stmt->fetch() ?: null;
    }

    private static function counts(int $userId, string $today): array
    {
        $stmt = db()->prepare(
            'SELECT
                SUM(CASE WHEN followup_date = ?  AND status = "pending" THEN 1 ELSE 0 END) AS today,
                SUM(CASE WHEN followup_date > ?  AND status = "pending" THEN 1 ELSE 0 END) AS upcoming,
                SUM(CASE WHEN followup_date < ?  AND status = "pending" THEN 1 ELSE 0 END) AS overdue,
                SUM(CASE WHEN status = "done" THEN 1 ELSE 0 END) AS done
             FROM followups WHERE user_id = ?'
        );
        $stmt->execute([$today, $today, $today, $userId]);
        $row = $stmt->fetch() ?: [];
        return [
            'today'    => (int) ($row['today']    ?? 0),
            'upcoming' => (int) ($row['upcoming'] ?? 0),
            'overdue'  => (int) ($row['overdue']  ?? 0),
            'done'     => (int) ($row['done']     ?? 0),
        ];
    }

    private static function isValidDate(string $d): bool
    {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $d)) { return false; }
        $dt = DateTime::createFromFormat('Y-m-d', $d);
        return $dt && $dt->format('Y-m-d') === $d;
    }
}
