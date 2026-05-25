<?php
/**
 * QueenKitty migration runner.
 *
 * Usage:
 *   php database/migrate.php
 *
 * Applies every *.sql file in database/migrations in filename order,
 * skipping any already recorded in `_migrations`. Idempotent.
 */

declare(strict_types=1);

require __DIR__ . '/../api/config/config.php';
require __DIR__ . '/../api/config/database.php';

$pdo = db();

// Bootstrap the migrations tracking table first (safe to run repeatedly).
$bootstrap = __DIR__ . '/migrations/008_create_migrations_table.sql';
if (is_file($bootstrap)) {
    $pdo->exec(file_get_contents($bootstrap));
}

$applied = $pdo->query('SELECT filename FROM _migrations')->fetchAll(PDO::FETCH_COLUMN);
$applied = array_flip($applied);

$files = glob(__DIR__ . '/migrations/*.sql');
sort($files, SORT_STRING);

$ran = 0;
foreach ($files as $file) {
    $name = basename($file);
    if (isset($applied[$name])) {
        echo "  skip   $name\n";
        continue;
    }

    $sql = file_get_contents($file);
    if ($sql === false || trim($sql) === '') {
        echo "  empty  $name\n";
        continue;
    }

    try {
        $pdo->exec($sql);
        $stmt = $pdo->prepare('INSERT INTO _migrations (filename) VALUES (?)');
        $stmt->execute([$name]);
        echo "  apply  $name\n";
        $ran++;
    } catch (Throwable $e) {
        fwrite(STDERR, "FAILED $name: " . $e->getMessage() . "\n");
        exit(1);
    }
}

echo "\nDone. Applied $ran migration(s).\n";
