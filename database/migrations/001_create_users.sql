-- 001_create_users.sql
-- Sellers, team leaders, and super admins all live here.
-- role: 'seller' | 'leader' | 'admin'
-- status: 'active' | 'suspended' | 'pending'

CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(120) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `email` VARCHAR(160) DEFAULT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('seller','leader','admin') NOT NULL DEFAULT 'seller',
  `parent_user_id` BIGINT UNSIGNED DEFAULT NULL,
  `plan_id` BIGINT UNSIGNED DEFAULT NULL,
  `referral_code` VARCHAR(16) DEFAULT NULL,
  `referred_by` BIGINT UNSIGNED DEFAULT NULL,
  `status` ENUM('active','suspended','pending') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_users_phone` (`phone`),
  UNIQUE KEY `uniq_users_referral_code` (`referral_code`),
  KEY `idx_users_parent` (`parent_user_id`),
  KEY `idx_users_referred_by` (`referred_by`),
  KEY `idx_users_plan` (`plan_id`),
  KEY `idx_users_role_status` (`role`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
