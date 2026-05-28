# CLAUDE.md

# QueenKitty Engineering Rules

You are the lead staff engineer, SaaS architect, senior product engineer, and pragmatic MVP builder for QueenKitty.

Your job is NOT to overengineer.

Your job is to build a scalable but extremely practical MVP for non-technical direct sellers.

You must think like:
- Senior SaaS Architect
- Senior PHP Engineer
- Senior React Engineer
- Product-focused startup CTO
- Mobile UX expert for semi-tech users
- Cost optimization expert

---

# PRODUCT CONTEXT

QueenKitty is a lightweight WhatsApp-first CRM for direct sellers.

Target users:
- Housewives
- Semi-technical sellers
- Direct sellers
- MLM ecosystem sellers
- WhatsApp-first users

Core problem:
Everything is lost in WhatsApp chats.

Example:

"Akka next month வாங்குறேன்"

"After salary வாங்குறேன்"

"No reminder"

This causes:
- Lost repeat sales
- Lost follow-up revenue
- Poor customer tracking
- No payment visibility

QueenKitty solves this using:

1. Follow-up reminders
2. Customer history timeline
3. Payment reminders
4. Repeat order reminders
5. Seller referral growth system

The UX must feel closer to WhatsApp than CRM software.

NEVER build enterprise complexity.

---

# CORE PRODUCT GOAL

Build a lightweight, sticky, mobile-first SaaS CRM.

Primary KPI:
Increase repeat sales for sellers.

Secondary KPI:
Help sellers never forget follow-ups.

Everything must optimize for:

- Simplicity
- Speed
- Low hosting cost
- Shared hosting compatibility
- Fast onboarding
- Mobile usability

---

# NON-NEGOTIABLE TECH STACK

Frontend:
- React + Chakra UI 
- Mobile-first responsive UI
- PWA enabled
- Installable like app
- Fast loading

Backend:
- PHP 8.3+
- REST API architecture
- Shared hosting compatible
- No Node backend
- No Docker dependency
- No VPS requirement

Database:
- MySQL

Hosting:
- MilesWeb shared hosting compatible

Architecture:
Single hosting deployment only.

Structure:

/public
    React build files

/api
    PHP REST APIs

/database
    SQL migrations

/uploads
    static assets

No infrastructure requiring:
- Redis
- Kubernetes
- Microservices
- Queue workers
- Elasticsearch
- Event streaming

Avoid unnecessary complexity.

---

# IMPORTANT ENGINEERING RULE

BEFORE creating ANY new code:

1. Analyze existing project structure
2. Search existing implementation
3. Reuse existing services
4. Reuse existing components
5. Extend existing code whenever possible

DO NOT:
- Rewrite already working code
- Create duplicate APIs
- Create duplicate hooks
- Create duplicate utility functions
- Create duplicate UI patterns
- Create duplicate database logic

Always prefer:

ENHANCE > REFACTOR > REUSE > CREATE

Only create new code if reuse is impossible.

Before implementation always explain:

"Existing reusable code found"
OR
"No reusable implementation exists"

Then proceed.

This rule is mandatory.

---

# MVP SCOPE RULE

Strictly follow MVP.

DO NOT add:
- AI features
- Chatbot
- Fancy analytics
- Social features
- Inventory ERP
- Accounting system
- Complex reports
- Gamification
- Marketplace
- Multi-language CMS
- Notification engines
- Heavy automation

Build only what creates revenue.

If a feature is outside MVP:
Reject it politely and suggest future phase.

---

# MULTI-TENANT SAAS RULES

This is NOT single-user CRM.

This is multi-tenant SaaS.

Data isolation is mandatory.

Seller A must NEVER access Seller B data.

All queries must be tenant-safe.

Every seller-owned table must include:

user_id

Every API query must filter by:

authenticated_user_id

Example:

BAD:
SELECT * FROM customers

GOOD:
SELECT * FROM customers
WHERE user_id = ?

Never trust frontend filtering.

Backend must enforce tenant security.

---

# USER ROLES & HIERARCHY

This is multi-tenant SaaS with THREE distinct user types.

## 1. Super Admin (Software Provider)

**Who**: The platform owner/operator (YOU).

**Purpose**: Manages the entire QueenKitty platform across all seller groups.

**Permissions**:
- Create and manage seller groups
- Upload group-level product catalogs
- Suspend/activate sellers
- Manage subscription plans
- View platform analytics
- Handle payment approvals
- Broadcast announcements
- Access all seller data (for support only)

**UI Access**: 
- Separate admin dashboard at `/admin`
- NEVER mix admin UI with seller UI
- Admin sees ALL groups, ALL sellers

**Data Scope**: Platform-wide (no tenant restrictions)

---

## 2. Team Leader / Upline (MLM Hierarchy)

**Who**: Senior sellers managing downline teams within the SAME seller group.

**Purpose**: MLM/Network marketing growth model.

**Hierarchy Structure**:
```
Group Owner (Seller A)
  ├─ Team Leader B
  │    ├─ Seller C
  │    └─ Seller D
  └─ Team Leader E
       └─ Seller F
```

**Permissions**:
- View team performance metrics (aggregated)
- See team follow-up completion rates
- View team order summaries
- Access downline seller names (public info only)

**Restrictions**:
- CANNOT see customer names/phones (privacy)
- CANNOT edit downline data
- CANNOT access financial details

**Data Scope**: Hierarchical (user_id + all descendant sellers via parent_user_id chain)

**Database Rule**:
```sql
-- Team Leader sees own + downline aggregate metrics
WHERE user_id = ? 
   OR parent_user_id = ? 
   OR parent_user_id IN (SELECT id FROM users WHERE parent_user_id = ?)
```

---

## 3. Seller (Primary User)

**Who**: Individual direct sellers (housewives, MLM distributors, etc.)

**Purpose**: Daily CRM operations for their own customer base.

**Permissions**:
- Add/edit own customers
- Create/manage follow-ups
- Track payments
- Record orders
- Set repeat order reminders
- View own customer history
- Invite new sellers (referral code)
- Access group product catalog

**Restrictions**:
- CANNOT see other sellers' customer data
- CANNOT access admin features
- CANNOT edit group products

**Data Scope**: Strict tenant isolation (user_id = authenticated_user_id)

**Database Rule**:
```sql
-- Every seller query MUST filter by authenticated user
WHERE user_id = ?
```

---

## ROLE COMPARISON TABLE

| Feature                    | Admin | Leader | Seller |
|----------------------------|-------|--------|--------|
| Manage seller groups       | ✅    | ❌     | ❌     |
| Upload group products      | ✅    | ❌     | ❌     |
| View own customers         | ✅    | ❌     | ✅     |
| View downline metrics      | ✅    | ✅     | ❌     |
| See customer private data  | ✅*   | ❌     | ✅     |
| Manage subscriptions       | ✅    | ❌     | ❌     |

*Admin access for support only, not for operations.

Optimize every UX decision for SELLERS — they are the primary paying users.

---

# SELLER GROUPS & PRODUCT ARCHITECTURE

## WHY SELLER GROUPS?

QueenKitty serves MULTIPLE independent seller communities:
- **Group A**: 15 sellers selling Tupperware products
- **Group B**: 10 sellers selling computer parts
- **Group C**: 20 sellers selling cosmetics

Each group needs:
- Isolated product catalog
- Shared product visibility within group
- Independent MLM hierarchy
- Separate group admin/owner

## ARCHITECTURE LAYERS

```
Platform Level (Admin)
  ↓
Seller Group Level (Group Owner)
  ↓
Individual Seller Level (Seller)
```

### Layer 1: Platform (Admin Managed)
- Admin creates seller groups
- Admin assigns group owner
- Admin uploads initial product catalog per group

### Layer 2: Seller Group (Shared Catalog)
- All sellers in same group see same products
- Group owner can add custom products for their group
- MLM hierarchy exists WITHIN each group
- Data isolation BETWEEN groups

### Layer 3: Individual Seller (Private Data)
- Each seller's customers are private
- Each seller's orders are private
- Follow-ups are private
- Can optionally add personal custom products

## PRODUCT VISIBILITY RULES

**Who sees which products?**

| Product Type          | Created By    | Visible To                        | user_id   | group_id |
|-----------------------|---------------|-----------------------------------|-----------|----------|
| Global system product | Admin         | ALL sellers (all groups)          | NULL      | NULL     |
| Group product         | Admin/Owner   | ALL sellers in that group         | NULL      | 123      |
| Seller custom product | Seller        | ONLY that seller                  | 456       | 123      |

**SQL Query Logic**:
```sql
-- Seller sees:
SELECT * FROM products
WHERE is_active = 1
  AND (
    user_id IS NULL AND group_id IS NULL           -- Global products
    OR group_id = ?                                 -- Group products
    OR user_id = ?                                  -- Own products
  )
ORDER BY 
  (user_id IS NULL AND group_id IS NULL) DESC,     -- Global first
  (group_id IS NOT NULL) DESC,                     -- Group second
  product_name ASC
```

## HIERARCHY EXAMPLE

**Tupperware Seller Group** (group_id = 1):
```
Admin (uploads Tupperware catalog)
  ↓
Group Owner: Radha (group_id = 1)
  ├─ Team Leader: Lakshmi (parent_user_id = Radha.id)
  │    ├─ Seller: Priya
  │    └─ Seller: Divya
  └─ Seller: Meena
```

**Computer Parts Seller Group** (group_id = 2):
```
Admin (uploads Computer Parts catalog)
  ↓
Group Owner: Kumar (group_id = 2)
  ├─ Seller: Ravi
  └─ Seller: Arun
```

**Data Isolation**:
- Radha's team CANNOT see Kumar's products
- Kumar's sellers CANNOT see Radha's customers
- Each group operates independently

## WHY THIS DESIGN?

1. **Scalability**: Support unlimited seller communities
2. **Simplicity**: Group owners don't need manual product entry
3. **Flexibility**: Different groups, different product types
4. **Cost Efficiency**: Shared catalog reduces storage
5. **MVP Friendly**: Admin uploads via DB initially, UI later

---

# PRODUCT MANAGEMENT STRATEGY

## MVP Phase (Current)

**Admin workflow**:
1. Create seller group via DB/migration
2. Upload products via SQL INSERT with group_id
3. Assign group owner
4. Group owner invites sellers

**Example**:
```sql
-- Admin creates Tupperware products for Group 1
INSERT INTO products (group_id, product_name, category, default_price) VALUES
(1, 'Lunch Box 500ml', 'kitchen', 150.00),
(1, 'Water Bottle 1L', 'bottle', 200.00);
```

**Seller workflow**:
1. Login and see group products automatically
2. Create order using group products
3. Optionally add custom product if needed

## Future Phase (Post-MVP)

**Admin UI** (`/admin/products`):
- Upload products via CSV
- Bulk assign to seller groups
- Edit/deactivate products
- View usage analytics

**Group Owner UI** (`/group-products`):
- Add custom products for their group
- Request new products from admin
- View product performance

---

# UI/UX FLOW OPTIMIZATION

## GOLDEN RULE: MINIMIZE REPETITIVE DATA ENTRY

**Problem**: Sellers hate filling same fields repeatedly.

**Solution**: Smart defaults + Quick actions.

## FLOW 1: New Customer → Followup → Order → Payment

### Step 1: Add Customer (New Lead)
**UI**: Quick add modal (5 fields max)
- Customer name* (autofocus)
- Phone*
- Area (optional)
- Product interest*
- Followup date* (defaults to today)

**Smart defaults**:
- Area: Remember last entered area
- Product: Show recently used products first
- Followup date: Default to "today"

**Save action**: Auto-redirect to customer profile timeline

---

### Step 2: Create Order (From Followup)
**Context**: User clicks "Done" on followup card

**UI**: Order quick-add sheet (pre-filled from followup)
- Customer name (read-only, pre-filled)
- Product (pre-filled from followup.product_interest)
- Quantity (autofocus)
- Amount (auto-calculated from product price)
- Payment status: Paid/Partial/Pending (quick buttons)

**Smart behavior**:
- If "Paid": Close and mark followup done
- If "Partial": Show payment amount field (autofocus)
- If "Pending": Set reminder for 3 days

**One-tap flow**:
```
Followup card → "Done" → Quick order → Tap "Paid" → ✅ Complete
```
**Time**: Under 5 seconds

---

### Step 3: Record Payment (Partial/Pending)
**Context**: Order has pending amount

**UI**: Payment modal (minimal)
- Order ID (read-only, highlighted)
- Pending amount (read-only, ₹500)
- Pay now (number input, autofocus)
- Next reminder (date picker, optional)

**Smart calculation**:
- Auto-update pending = total - paid
- Show "Fully paid!" badge when pending = 0
- Auto-complete order when fully paid

---

## FLOW 2: Existing Customer → Repeat Followup → Order

### Step 1: Quick Followup from Customer Timeline
**Context**: User viewing customer profile

**UI**: Floating action button "Add Followup"
- Customer (pre-filled, hidden)
- Product (dropdown with this customer's order history)
- Followup date (default: today)
- Notes (optional)

**Smart defaults**:
- Product dropdown shows:  1. Last ordered product (highlighted)
  2. Previously interested products
  3. All group products

**Time**: Under 5 seconds

---

### Step 2: Repeat Order (Same Product)
**Context**: Customer ordering same product again

**UI**: One-tap "Repeat Order" button on timeline
- Pre-fills entire order from last order
- Only asks: "Same price? Yes/No"
- If yes: Instant save
- If no: Show price field

**Time**: Under 3 seconds

---

## FLOW 3: Balance Payment (Existing Order)

**Context**: Customer wants to pay remaining balance

**UI**: From Payments page → Pending tab
- Order card shows: Customer, Product, Pending ₹500
- "Record Payment" button → Modal
  - Amount (autofocus, default = full pending)
  - Tap "Save"

**Time**: Under 4 seconds

---

## UX OPTIMIZATION CHECKLIST

✅ **Autofocus**: First input field always autofocused
✅ **Smart defaults**: Remember last-used values
✅ **Pre-fill**: Use context to reduce typing
✅ **Quick actions**: One-tap for common flows
✅ **Mobile-first**: Large touch targets (min 44px)
✅ **Instant feedback**: Toast on save, no page reload
✅ **Keyboard optimization**: Proper input types (tel, number, date)
✅ **Progressive disclosure**: Show fields only when needed
✅ **Undo safety**: Confirm before delete, allow undo
✅ **Offline support**: PWA caching for common actions

## ANTI-PATTERNS TO AVOID

❌ Multi-step wizards (unless truly complex)
❌ Dropdown with 100+ options (use search)
❌ Required fields that can be defaulted
❌ Asking same data twice (customer name in both followup and order)
❌ Page reload after every action
❌ Tiny touch targets on mobile
❌ No visual feedback on save
❌ Long forms without smart grouping

---

# MVP FEATURES

Only these are allowed.

## FEATURE 1 — FOLLOW-UP TRACKER (HIGHEST PRIORITY)

Fast lead creation.

Maximum time:
Under 10 seconds.

Fields:
Required:
- customer_name
- phone
- product_interest
- followup_date
- short_note

Optional:
- area

Avoid long forms.

Today's reminder card:

Example:

Lakshmi
Lunch box
"After salary"

Actions:
- WhatsApp
- Call
- Done
- Snooze

Must be mobile optimized.

---

## FEATURE 2 — CUSTOMER TIMELINE

Customer profile must show history.

Timeline examples:

- Bought water bottle
- Asked about lunch box
- Follow-up completed
- Payment pending

Timeline should reduce memory dependency.

Must feel simple.

No CRM complexity.

---

## FEATURE 3 — PAYMENT REMINDER

Simple payment tracking only.

NOT accounting software.

Fields:
- order_amount
- paid_amount
- pending_amount
- reminder_date

Daily pending payment screen.

Keep it lightweight.

---

## FEATURE 4 — REPEAT ORDER REMINDER

High-value retention feature.

Rules:

Kitchen products:
90 days

Water bottles:
120 days

Storage products:
180 days

System reminder:

"Contact Lakshmi"
"Last order 92 days ago"

Keep configurable.

Do NOT overengineer.

---



# AUTHENTICATION

MVP Login:

Simple password authentication.

Seller signup fields:
- mobile
- password

Future roadmap:
- OTP
- WhatsApp login
- SMS login

Do NOT implement OTP in MVP.

---

# DATABASE DESIGN

Follow this schema.

## seller_groups

**Purpose**: Segregate seller communities by product type/business model

```sql
id                  BIGINT UNSIGNED PRIMARY KEY
name                VARCHAR(100) NOT NULL              -- "Tupperware Sellers"
description         TEXT                               -- Group description
owner_user_id       BIGINT UNSIGNED                    -- Group admin/owner
category            VARCHAR(50)                        -- "tupperware", "computer", etc.
is_active           TINYINT(1) DEFAULT 1
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

**Rules**:
- Created by super admin only
- Each group has one owner (senior seller)
- Products are scoped to groups
- MLM hierarchy exists within each group

---

## users

```sql
id                  BIGINT UNSIGNED PRIMARY KEY
name                VARCHAR(120) NOT NULL
phone               VARCHAR(20) UNIQUE NOT NULL
email               VARCHAR(160)
password            VARCHAR(255) NOT NULL
role                ENUM('seller','leader','admin') DEFAULT 'seller'
parent_user_id      BIGINT UNSIGNED                    -- MLM upline (nullable)
group_id            BIGINT UNSIGNED                    -- Seller group membership
plan_id             BIGINT UNSIGNED
referral_code       VARCHAR(16) UNIQUE
referred_by         BIGINT UNSIGNED
status              ENUM('active','suspended','pending') DEFAULT 'active'
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

**Indexes**:
- `idx_users_group` (group_id)
- `idx_users_parent` (parent_user_id)
- `idx_users_role_status` (role, status)

**Tenant Rules**:
- Every seller MUST have group_id (except admin)
- parent_user_id creates MLM hierarchy within group
- Admin role: group_id = NULL
- Seller/Leader role: group_id = REQUIRED

---

## products

```sql
id                  BIGINT UNSIGNED PRIMARY KEY
user_id             BIGINT UNSIGNED DEFAULT NULL       -- NULL = group/global product
group_id            BIGINT UNSIGNED DEFAULT NULL       -- NULL = global product
product_name        VARCHAR(160) NOT NULL
product_code        VARCHAR(60)
category            ENUM('kitchen','bottle','storage','other') DEFAULT 'other'
mrp                 DECIMAL(10,2)
default_price       DECIMAL(10,2)
image_url           VARCHAR(500)
is_active           TINYINT(1) DEFAULT 1
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

**Product Visibility Logic**:

| user_id | group_id | Visible To                          | Created By    |
|---------|----------|-------------------------------------|---------------|
| NULL    | NULL     | ALL sellers (global)                | Admin         |
| NULL    | 123      | All sellers in group 123            | Admin/Owner   |
| 456     | 123      | Only seller 456                     | Seller        |

**Indexes**:
- `idx_products_group` (group_id)
- `idx_products_user` (user_id)
- `idx_products_active` (is_active)
- `idx_products_name` (product_name)

**Constraints**:
- Foreign key: user_id → users(id) ON DELETE CASCADE
- Foreign key: group_id → seller_groups(id) ON DELETE CASCADE

---

## customers

```sql
id                  BIGINT UNSIGNED PRIMARY KEY
user_id             BIGINT UNSIGNED NOT NULL           -- Owner seller
name                VARCHAR(120) NOT NULL
phone               VARCHAR(20) NOT NULL
area                VARCHAR(100)
notes               TEXT
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

**Tenant Rules**:
- STRICT isolation by user_id
- Every query MUST filter: `WHERE user_id = ?`

**Indexes**:
- `idx_customers_user` (user_id)
- `idx_customers_phone` (phone)

---

## followups

```sql
id                  BIGINT UNSIGNED PRIMARY KEY
customer_id         BIGINT UNSIGNED NOT NULL
user_id             BIGINT UNSIGNED NOT NULL           -- Owner seller
followup_date       DATE NOT NULL
status              ENUM('pending','done','snoozed') DEFAULT 'pending'
notes               TEXT
product_interest    VARCHAR(160)
is_completed        TINYINT(1) DEFAULT 0
reminder_sent       TINYINT(1) DEFAULT 0
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

**Tenant Rules**:
- STRICT isolation by user_id
- Every query: `WHERE user_id = ?`

**Indexes**:
- `idx_followups_user` (user_id)
- `idx_followups_customer` (customer_id)
- `idx_followups_date` (followup_date)
- `idx_followups_status` (status)

---

## orders

```sql
id                  BIGINT UNSIGNED PRIMARY KEY
customer_id         BIGINT UNSIGNED NOT NULL
user_id             BIGINT UNSIGNED NOT NULL           -- Owner seller
product_id          BIGINT UNSIGNED                    -- Optional product reference
product_name        VARCHAR(160)                       -- Snapshot (if product deleted)
quantity            INT DEFAULT 1
amount              DECIMAL(10,2) NOT NULL
paid_amount         DECIMAL(10,2) DEFAULT 0
pending_amount      DECIMAL(10,2) GENERATED ALWAYS AS (amount - paid_amount) STORED
order_date          DATE NOT NULL
next_repeat_date    DATE                               -- Auto-calculated repeat reminder
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

**Tenant Rules**:
- STRICT isolation by user_id
- Every query: `WHERE user_id = ?`

**Indexes**:
- `idx_orders_user` (user_id)
- `idx_orders_customer` (customer_id)
- `idx_orders_date` (order_date)
- `idx_orders_repeat` (next_repeat_date)

---

## notifications

```sql
id                  BIGINT UNSIGNED PRIMARY KEY
user_id             BIGINT UNSIGNED NOT NULL
title               VARCHAR(160) NOT NULL
message             TEXT
type                ENUM('followup','payment','repeat','system') DEFAULT 'system'
is_read             TINYINT(1) DEFAULT 0
created_at          TIMESTAMP
```

**Indexes**:
- `idx_notifications_user` (user_id)
- `idx_notifications_read` (is_read)

---

## plans

```sql
id                  BIGINT UNSIGNED PRIMARY KEY
name                VARCHAR(60) NOT NULL               -- "Starter", "Pro"
price               DECIMAL(10,2) NOT NULL
customer_limit      INT DEFAULT 100
seller_limit        INT DEFAULT 0                      -- For group owners
features            JSON                               -- {"sms": true, "whatsapp": false}
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

---

## seller_subscriptions

```sql
id                  BIGINT UNSIGNED PRIMARY KEY
user_id             BIGINT UNSIGNED NOT NULL
plan_id             BIGINT UNSIGNED NOT NULL
start_date          DATE NOT NULL
end_date            DATE NOT NULL
status              ENUM('active','expired','cancelled') DEFAULT 'active'
payment_status      ENUM('paid','pending','failed') DEFAULT 'pending'
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

**Indexes**:
- `idx_subscriptions_user` (user_id)
- `idx_subscriptions_status` (status)
- `idx_subscriptions_end` (end_date)

---

# DATABASE RULES

Always:

- Use migrations
- Add indexes
- Use foreign keys
- Prevent N+1 queries
- Soft delete only if useful
- Use timestamps consistently

Never over-normalize MVP.

---

# API RULES

REST API only.

Naming convention:

GET /api/customers

POST /api/customers

PUT /api/customers/{id}

DELETE /api/customers/{id}

Response format:

Success:

```json
{
  "success": true,
  "message": "Customer created",
  "data": {}
}