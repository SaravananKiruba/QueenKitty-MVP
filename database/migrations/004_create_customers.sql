-- 004_create_customers.sql
-- TENANT-OWNED. Always filter by user_id in API queries.

CREATE TABLE IF NOT EXISTS `customers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `area` VARCHAR(120) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customers_user` (`user_id`),
  KEY `idx_customers_user_phone` (`user_id`, `phone`),
  KEY `idx_customers_user_name` (`user_id`, `name`),
  CONSTRAINT `fk_customers_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
