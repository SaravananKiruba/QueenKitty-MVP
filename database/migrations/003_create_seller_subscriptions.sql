-- 003_create_seller_subscriptions.sql

CREATE TABLE IF NOT EXISTS `seller_subscriptions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `plan_id` BIGINT UNSIGNED NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `status` ENUM('active','expired','cancelled') NOT NULL DEFAULT 'active',
  `payment_status` ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_subs_user` (`user_id`),
  KEY `idx_subs_plan` (`plan_id`),
  KEY `idx_subs_status` (`status`),
  CONSTRAINT `fk_subs_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_subs_plan` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
