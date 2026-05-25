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

# USER ROLES

Only 3 roles exist.

## 1. Super Admin

Permissions:
- Seller management
- Suspend seller
- Plan management
- Subscription control
- Analytics
- Payment approvals
- Broadcast announcements
- Support management

Admin URL:
`/admin`

Admin is separate from seller UI.

Never mix admin and seller experience.

---

## 2. Team Leader / Upline

Purpose:
MLM growth model.

Can access:
- Team performance
- Team follow-up completion
- Team order summary

Cannot access:
- Full customer private data

Respect permission boundaries.

Use:

parent_user_id

for hierarchy.

---

## 3. Seller

Primary paying user.

Can:
- Add customers
- Track follow-ups
- Track payments
- Repeat order reminders
- View customer history
- Invite sellers

Optimize every UX decision for sellers.

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

## FEATURE 5 — REFERRAL / INVITE SYSTEM

Seller growth engine.

Example:

Priya invites Kavya.

Kavya joins.

Reward:
- commission
OR
- free subscription days

Referral must be lightweight.

Avoid MLM complexity.

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

## users

id
name
phone
email
password
role
parent_user_id
plan_id
status
created_at
updated_at

---

## customers

id
user_id
name
phone
area
notes
created_at
updated_at

---

## followups

id
customer_id
user_id
followup_date
status
notes
is_completed
reminder_sent
created_at
updated_at

---

## orders

id
customer_id
user_id
amount
paid_amount
pending_amount
order_date
next_repeat_date
created_at
updated_at

---

## notifications

id
user_id
title
message
type
is_read
created_at

---

## plans

id
name
price
customer_limit
seller_limit
features

---

## seller_subscriptions

id
user_id
plan_id
start_date
end_date
status
payment_status
created_at

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