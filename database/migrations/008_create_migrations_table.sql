-- 008_create_migrations_table.sql
-- Tracks applied migrations so migrate.php is idempotent.

CREATE TABLE IF NOT EXISTS `_migrations` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `filename` VARCHAR(200) NOT NULL,
  `applied_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_migrations_filename` (`filename`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
