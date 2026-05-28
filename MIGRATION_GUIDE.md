# QueenKitty MVP — Migration & Setup Guide

## 🎯 What's New?

### Seller Groups Architecture
QueenKitty now supports **multiple independent seller communities** within a single platform:

- **Tupperware Sellers** → Share Tupperware product catalog
- **Computer Parts Sellers** → Share computer parts catalog
- **Cosmetics Sellers** → Share cosmetics catalog

Each group has:
- Isolated product catalog
- Independent MLM hierarchy
- Separate group owner/admin
- Strict data isolation

### Product Visibility (3-Tier)
Products are now visible based on 3 levels:

| Level | user_id | group_id | Visible To |
|-------|---------|----------|------------|
| **Global** | NULL | NULL | ALL sellers, ALL groups |
| **Group** | NULL | 123 | All sellers in group 123 |
| **Custom** | 456 | 123 | Only seller 456 |

### Optimized UI/UX Flow
New smart data entry patterns (see CLAUDE.md):
- **Followup → Order**: Click "Done" → Quick order pre-filled → Save
- **Smart defaults**: Auto-fill from context (customer, product)
- **Progressive disclosure**: Show only needed fields
- **Mobile-first**: Large touch targets, autofocus

---

## 🚀 Running New Migrations

### Step 1: Run Database Migrations

```powershell
# Navigate to database folder
cd d:\BOOLA\QueenKitty MVP\database

# Run migration script (applies all pending migrations)
php migrate.php
```

**New migrations added**:
- `011_create_seller_groups.sql` — Seller groups table
- `012_add_group_id_to_users.sql` — Link users to groups
- `013_add_group_id_to_products.sql` — Link products to groups
- `014_seed_sample_seller_groups.sql` — Sample data (dev/testing only)

### Step 2: Verify Migrations

```powershell
# Check if tables were created
php ..\scripts\check_db.php
```

Expected output:
```
✓ seller_groups table exists
✓ users.group_id column added
✓ products.group_id column added
```

---

## 🗄️ Database Schema Changes

### New Table: `seller_groups`

```sql
CREATE TABLE `seller_groups` (
  `id` BIGINT UNSIGNED PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `owner_user_id` BIGINT UNSIGNED,  -- Group admin
  `category` VARCHAR(50),            -- 'tupperware', 'computer_parts', etc.
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP,
  `updated_at` TIMESTAMP
);
```

### Updated: `users` table

**Added column**:
```sql
ALTER TABLE `users`
ADD COLUMN `group_id` BIGINT UNSIGNED DEFAULT NULL
  COMMENT 'Seller group membership (NULL for admin)';
```

**Rules**:
- Admin users: `group_id = NULL` (platform-wide access)
- Sellers/Leaders: `group_id = REQUIRED` (belongs to specific group)

### Updated: `products` table

**Added column**:
```sql
ALTER TABLE `products`
ADD COLUMN `group_id` BIGINT UNSIGNED DEFAULT NULL
  COMMENT 'NULL = global product; set = group-specific product';
```

**Product Visibility Query** (implemented in ProductController):
```sql
SELECT * FROM products
WHERE is_active = 1
  AND (
    (user_id IS NULL AND group_id IS NULL)  -- Global products
    OR group_id = ?                          -- Group products
    OR user_id = ?                           -- Own custom products
  )
ORDER BY
  (user_id IS NULL AND group_id IS NULL) DESC,
  (group_id IS NOT NULL) DESC,
  product_name ASC
```

---

## 👥 Sample Data (Development Only)

Migration `014_seed_sample_seller_groups.sql` creates:

### Seller Groups
1. **Tupperware Sellers - Chennai** (ID: 1)
2. **Computer Parts Hub** (ID: 2)
3. **Beauty & Cosmetics Network** (ID: 3)

### Sample Products

**Tupperware (Group 1)**:
- Lunch Box 500ml — ₹150
- Water Bottle 1 Liter — ₹280
- Rice Keeper 5kg — ₹650

**Computer Parts (Group 2)**:
- Mechanical Keyboard RGB — ₹2,800
- Wireless Mouse Gaming — ₹950
- USB 3.0 Flash Drive 32GB — ₹450

**Cosmetics (Group 3)**:
- Moisturizing Face Cream 50ml — ₹680
- Vitamin C Serum 30ml — ₹950
- Lipstick Matte Finish — ₹350

### Assigning Sellers to Groups

```sql
-- Example: Assign existing sellers to groups
UPDATE users SET group_id = 1 WHERE phone = '9876543210';  -- Tupperware
UPDATE users SET group_id = 2 WHERE phone = '9876543220';  -- Computer Parts
UPDATE users SET group_id = 3 WHERE phone = '9876543230';  -- Cosmetics
```

---

## 🎨 Updated UI Components

### FollowupCard Enhancement
**Before**: Click "Done" → Followup marked complete
**After**: Click "Done" → Quick order sheet opens → Pre-filled customer + product → Save order → Followup auto-marked done

**Flow**:
```
Followup Card
  └─ "Done" button
      └─ AddOrderSheet (opens)
          ├─ Customer (pre-filled, read-only)
          ├─ Product (pre-filled from followup.product_interest)
          ├─ Amount (autofocus)
          └─ Save → Marks followup as complete
```

### AddOrderSheet Enhancement
**New Props**:
- `customer` — Pre-fill customer details (hide name/phone fields)
- `prefillProduct` — Pre-fill product from followup context

**Smart Defaults**:
- Order date defaults to today
- Product auto-fills from context
- Quantity autofocused for fast entry

---

## 📝 Admin Workflow (Current MVP)

### Creating Seller Groups

**Manual (via SQL)**:
```sql
INSERT INTO seller_groups (name, description, category) VALUES
('My Seller Group', 'Description here', 'product_category');
```

**Future**: Admin UI at `/admin/groups` (post-MVP)

### Uploading Group Products

**Manual (via SQL)**:
```sql
-- Group-level products (all sellers in group see this)
INSERT INTO products (group_id, product_name, category, default_price) VALUES
(1, 'Product Name', 'kitchen', 500.00);

-- Global products (ALL sellers across ALL groups see this)
INSERT INTO products (product_name, category, default_price) VALUES
('Generic Product', 'other', 100.00);
```

**Future**: Admin UI for CSV upload (post-MVP)

---

## 🔐 Security & Data Isolation

### Tenant Safety Rules

**ProductController** (implemented):
```php
// ✅ CORRECT: 3-tier visibility
$sql = 'SELECT * FROM products
        WHERE is_active = 1
          AND (
            (user_id IS NULL AND group_id IS NULL)  -- Global
            OR group_id = ?                          -- Group
            OR user_id = ?                           -- Own
          )';

// ❌ WRONG: Exposes all products
$sql = 'SELECT * FROM products WHERE is_active = 1';
```

**Other Controllers** (customers, orders, followups):
```php
// ✅ ALWAYS filter by authenticated user
WHERE user_id = ?
```

### MLM Hierarchy Queries

**Team Leader viewing downline metrics**:
```sql
-- Aggregated metrics only (no customer private data)
SELECT COUNT(*) as total_orders
FROM orders
WHERE user_id = ?              -- Own orders
   OR user_id IN (             -- Downline orders
        SELECT id FROM users
        WHERE parent_user_id = ?
   )
```

---

## 🚧 Post-MVP Roadmap

Features NOT in current MVP (see CLAUDE.md):

### Admin Features
- [ ] Seller group management UI (`/admin/groups`)
- [ ] Product CSV upload (`/admin/products`)
- [ ] Bulk seller onboarding
- [ ] Group analytics dashboard

### Seller Features
- [ ] Repeat order quick-action (one-tap reorder)
- [ ] Payment reminders automation
- [ ] WhatsApp integration (send reminders)
- [ ] Customer timeline enhancements

### Technical
- [ ] Redis caching (product catalog)
- [ ] Background jobs (payment reminders)
- [ ] OTP authentication
- [ ] Progressive Web App (offline support)

---

## 📚 Documentation References

**Updated Files**:
- ✅ `CLAUDE.md` — Complete architectural rules
- ✅ `database/migrations/011-014` — New migrations
- ✅ `api/controllers/ProductController.php` — Group-aware queries
- ✅ `app/src/components/FollowupCard.jsx` — Quick order flow
- ✅ `app/src/components/AddOrderSheet.jsx` — Smart pre-fill

**Key Sections in CLAUDE.md**:
- User Roles & Hierarchy
- Seller Groups & Product Architecture
- Product Management Strategy
- UI/UX Flow Optimization
- Database Design (updated)

---

## ❓ FAQ

### Q: Do existing sellers need to be assigned to groups?
**A**: Yes. Run:
```sql
UPDATE users SET group_id = 1 WHERE id IN (seller_ids);
```

### Q: Can a seller belong to multiple groups?
**A**: No. One seller = One group. This ensures data isolation and clear product visibility.

### Q: Can products be shared across groups?
**A**: Yes, via **global products** (`user_id = NULL, group_id = NULL`). These are visible to ALL sellers.

### Q: How does the MLM hierarchy work?
**A**: Use `parent_user_id` to link sellers within the SAME group. Team leaders can view aggregate metrics (not private customer data).

### Q: When will admin UI be available?
**A**: Post-MVP. Current MVP uses manual SQL for group/product management.

---

## 🎯 Next Steps

1. ✅ Run migrations: `php database/migrate.php`
2. ✅ Assign sellers to groups: `UPDATE users SET group_id = ?`
3. ✅ Upload group products: `INSERT INTO products (group_id, ...)`
4. ✅ Test product visibility in React app
5. ✅ Test quick order flow (Followup → Done → Order)

---

**Last Updated**: 2026-05-28
**Version**: MVP v1.1 (Seller Groups Architecture)
