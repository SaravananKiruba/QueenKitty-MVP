-- 006_create_orders.sql
-- TENANT-OWNED. Always filter by user_id.
-- product_category is used for repeat-order reminder rules (kitchen=90d, bottle=120d, storage=180d).

CREATE TABLE IF NOT EXISTS `orders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `customer_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `product_name` VARCHAR(160) DEFAULT NULL,
  `product_category` ENUM('kitchen','bottle','storage','other') NOT NULL DEFAULT 'other',
  `amount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `paid_amount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `pending_amount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `order_date` DATE NOT NULL,
  `next_repeat_date` DATE DEFAULT NULL,
  `payment_reminder_date` DATE DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_orders_user_date` (`user_id`, `order_date`),
  KEY `idx_orders_user_pending` (`user_id`, `pending_amount`),
  KEY `idx_orders_user_repeat` (`user_id`, `next_repeat_date`),
  KEY `idx_orders_customer` (`customer_id`),
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_orders_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
