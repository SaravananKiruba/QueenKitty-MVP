-- 014_seed_sample_seller_groups.sql
-- Sample data demonstrating multi-group architecture.
-- Run this ONLY in development/testing environments.
--
-- Creates:
--   - 3 seller groups (Tupperware, Computer Parts, Cosmetics)
--   - Sample products for each group
--   - Sample sellers in each group
--
-- PRODUCTION: Admin creates groups manually via admin UI (future)

-- ────────────────────────────────────────────────────────────────────────────
-- SELLER GROUPS
-- ────────────────────────────────────────────────────────────────────────────

INSERT IGNORE INTO `seller_groups` (`id`, `name`, `description`, `category`, `is_active`) VALUES
(1, 'Tupperware Sellers - Chennai', 'Direct sellers selling Tupperware kitchen products', 'tupperware', 1),
(2, 'Computer Parts Hub', 'Sellers specializing in computer components and accessories', 'computer_parts', 1),
(3, 'Beauty & Cosmetics Network', 'MLM network for cosmetics and beauty products', 'cosmetics', 1);

-- ────────────────────────────────────────────────────────────────────────────
-- GROUP PRODUCTS (user_id = NULL, group_id = specific group)
-- ────────────────────────────────────────────────────────────────────────────

-- Tupperware products (Group 1)
INSERT IGNORE INTO `products` (`group_id`, `product_name`, `product_code`, `category`, `mrp`, `default_price`) VALUES
(1, 'Lunch Box 500ml', 'TW-LB-500', 'kitchen', 200.00, 150.00),
(1, 'Water Bottle 1 Liter', 'TW-WB-1L', 'bottle', 350.00, 280.00),
(1, 'Rice Keeper 5kg', 'TW-RK-5KG', 'storage', 800.00, 650.00),
(1, 'Spice Container Set', 'TW-SC-SET', 'kitchen', 450.00, 380.00),
(1, 'Oil Dispenser 500ml', 'TW-OD-500', 'kitchen', 250.00, 200.00);

-- Computer Parts products (Group 2)
INSERT IGNORE INTO `products` (`group_id`, `product_name`, `product_code`, `category`, `mrp`, `default_price`) VALUES
(2, 'Mechanical Keyboard RGB', 'KB-MECH-RGB', 'other', 3500.00, 2800.00),
(2, 'Wireless Mouse Gaming', 'MS-WL-GAME', 'other', 1200.00, 950.00),
(2, 'USB 3.0 Flash Drive 32GB', 'USB-32GB', 'other', 600.00, 450.00),
(2, 'HDMI Cable 2m', 'HDMI-2M', 'other', 300.00, 220.00),
(2, 'Laptop Cooling Pad', 'LP-COOL-PAD', 'other', 1500.00, 1200.00);

-- Cosmetics products (Group 3)
INSERT IGNORE INTO `products` (`group_id`, `product_name`, `product_code`, `category`, `mrp`, `default_price`) VALUES
(3, 'Moisturizing Face Cream 50ml', 'CS-FC-50', 'other', 850.00, 680.00),
(3, 'Vitamin C Serum 30ml', 'CS-VC-30', 'other', 1200.00, 950.00),
(3, 'Lipstick Matte Finish', 'CS-LS-MAT', 'other', 450.00, 350.00),
(3, 'Nail Polish Set (5 colors)', 'CS-NP-SET', 'other', 600.00, 480.00),
(3, 'Eye Shadow Palette', 'CS-ES-PAL', 'other', 1800.00, 1450.00);

-- ────────────────────────────────────────────────────────────────────────────
-- GLOBAL PRODUCTS (user_id = NULL, group_id = NULL)
-- Visible to ALL sellers across ALL groups
-- ────────────────────────────────────────────────────────────────────────────

INSERT IGNORE INTO `products` (`product_name`, `product_code`, `category`, `mrp`, `default_price`) VALUES
('Generic Shopping Bag', 'GLOBAL-BAG', 'other', 50.00, 30.00),
('Gift Wrapping Paper Roll', 'GLOBAL-WRAP', 'other', 120.00, 90.00);

-- NOTE: To link sellers to groups, run:
-- UPDATE users SET group_id = 1 WHERE phone IN ('9876543210', '9876543211');  -- Tupperware
-- UPDATE users SET group_id = 2 WHERE phone IN ('9876543220', '9876543221');  -- Computer
-- UPDATE users SET group_id = 3 WHERE phone IN ('9876543230', '9876543231');  -- Cosmetics
