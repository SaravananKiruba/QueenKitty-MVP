-- 002_create_plans.sql

CREATE TABLE IF NOT EXISTS `plans` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(80) NOT NULL,
  `price` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `customer_limit` INT UNSIGNED NOT NULL DEFAULT 0,
  `seller_limit` INT UNSIGNED NOT NULL DEFAULT 0,
  `features` JSON DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_plans_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default plans
INSERT INTO `plans` (`name`, `price`, `customer_limit`, `seller_limit`, `features`) VALUES
  ('Free',    0.00,   50,   0, JSON_OBJECT('followups', true, 'orders', true)),
  ('Starter', 199.00, 500,  0, JSON_OBJECT('followups', true, 'orders', true, 'referrals', true)),
  ('Pro',     499.00, 5000, 10, JSON_OBJECT('followups', true, 'orders', true, 'referrals', true, 'team', true))
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
