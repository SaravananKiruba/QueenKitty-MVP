# QueenKitty MVP

Lightweight WhatsApp-first CRM for direct sellers. Mobile-first PWA + PHP REST API on MySQL. Shared-hosting compatible (MilesWeb).

## Repository layout

```
/api         PHP 8.3 REST API (front controller in api/index.php)
/app         React + Vite + Chakra UI source (builds to /public)
/database    SQL migrations + migrate.php runner
/public      React build output (served as SPA)
/uploads     User-uploaded assets
```

## Local setup (foundation)

### 1. Database

1. Create a MySQL database named `queenkitty`.
2. Copy `api/config/.env.example` to `api/config/.env` and fill in DB + JWT secret.
3. Run migrations:

```
php database/migrate.php
```

### 2. API

The PHP API is served from `/api`. On shared hosting just upload the repo; the `.htaccess` files handle routing. Locally:

```
php -S localhost:8000 server.php
```

Then `GET http://localhost:8000/api/health` should return `{"success":true}`.

### 3. Frontend

```
cd app
npm install
npm run dev          # dev server at http://localhost:5173
npm run build        # outputs to ../public
```

In dev, the Vite proxy forwards `/api` to `http://localhost:8000`.

## Engineering rules

See [CLAUDE.md](CLAUDE.md). TL;DR:

- Multi-tenant: every seller-owned query MUST filter by `user_id` from the JWT.
- ENHANCE > REFACTOR > REUSE > CREATE — search before adding new code.
- No Node backend, no Redis, no queues. Shared hosting only.
- MVP scope only (Follow-ups, Customer timeline, Payments, Repeat orders, Referrals).
