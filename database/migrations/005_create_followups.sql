-- 005_create_followups.sql
-- TENANT-OWNED. Always filter by user_id.

CREATE TABLE IF NOT EXISTS `followups` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `customer_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `product_interest` VARCHAR(160) DEFAULT NULL,
  `followup_date` DATE NOT NULL,
  `status` ENUM('pending','done','snoozed','cancelled') NOT NULL DEFAULT 'pending',
  `notes` TEXT DEFAULT NULL,
  `is_completed` TINYINT(1) NOT NULL DEFAULT 0,
  `reminder_sent` TINYINT(1) NOT NULL DEFAULT 0,
  `completed_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_followups_user_date` (`user_id`, `followup_date`),
  KEY `idx_followups_user_status` (`user_id`, `status`),
  KEY `idx_followups_customer` (`customer_id`),
  CONSTRAINT `fk_followups_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_followups_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
