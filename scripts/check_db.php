<?php
// Quick sanity check after migration. Safe to delete anytime.
require __DIR__ . '/../api/config/config.php';
require __DIR__ . '/../api/config/database.php';

$pdo = db();

echo "Tables:" . PHP_EOL;
foreach ($pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN) as $t) {
    echo "  $t" . PHP_EOL;
}

echo PHP_EOL . "Plans:" . PHP_EOL;
foreach ($pdo->query('SELECT id, name, price, customer_limit FROM plans')->fetchAll() as $r) {
    echo "  #{$r['id']}  {$r['name']}  Rs{$r['price']}  (customers: {$r['customer_limit']})" . PHP_EOL;
}

echo PHP_EOL . "Applied migrations:" . PHP_EOL;
foreach ($pdo->query('SELECT filename, applied_at FROM _migrations ORDER BY id')->fetchAll() as $r) {
    echo "  {$r['filename']}  ({$r['applied_at']})" . PHP_EOL;
}
