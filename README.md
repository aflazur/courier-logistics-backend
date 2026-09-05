# Courier & Logistics Management Platform — Backend

B7A6 Assignment (Student ID L2B7-0661 → assignment 1: Courier & Logistics Platform)

## Stack
Node.js · TypeScript · Express · PostgreSQL · Prisma · Zod · JWT · SSLCommerz

## Roles
- **CUSTOMER** — creates shipments, pays delivery fee, tracks status, cancels
- **COURIER** — views assigned shipments, updates delivery status, manages availability
- **ADMIN** — manages hubs, assigns couriers, manages users/roles, views stats & audit logs

## What's implemented

| Area | Status |
|---|---|
| Project architecture (Routes → Controllers → Services → Prisma), consistent across every module | ✅ |
| Prisma schema split into `prisma/schema/*.prisma` (multi-file, Prisma's native `prismaSchemaFolder`) | ✅ |
| Prisma schema: User, CourierProfile, Hub, Shipment, ShipmentStatusHistory, Payment, AuditLog | ✅ |
| Auth: register, login, refresh-token, logout (JWT access+refresh, bcrypt hashing) | ✅ |
| Google OAuth (GCP social login) | ✅ real Passport `GoogleStrategy`, find-or-create user, issues the same JWT pair as password login — needs your own `GOOGLE_CLIENT_ID/SECRET` to actually run |
| Role-based middleware (`auth('ADMIN')`, etc.) | ✅ |
| Shipment lifecycle with a state machine (illegal transitions rejected) | ✅ |
| Courier assignment (transaction-safe, prevents double-assignment) | ✅ |
| Courier earnings (70% of delivery fee credited automatically on DELIVERED) | ✅ |
| Email notifications (shipment status changes, courier assignment) | ✅ via Nodemailer — needs your SMTP credentials to actually send |
| Redis caching (shipment detail, hub list) with write-path invalidation | ✅ — app works fine without Redis too (falls back to no-op cache) |
| Redis-backed rate limiting (shared across instances) + a tighter limiter on `/auth/*` | ✅ |
| Pagination, filtering, search, sorting on shipment/user/courier lists | ✅ |
| Soft deletes (`deletedAt`) on User, Shipment, Hub, CourierProfile | ✅ |
| Audit logs on role changes, status (activate/deactivate), and shipment status updates | ✅ |
| SSLCommerz payment: initiate session, IPN webhook verification, success/fail/cancel | ✅ code wired — needs your sandbox store credentials to test |
| Consistent `{ success, message, data }` / `{ success:false, message, errors }` response shape | ✅ |
| Global error handler (Prisma errors, Zod errors, ApiError, unknown errors) | ✅ |
| Helmet, CORS, rate limiting | ✅ |
| Admin: user list/search, role change, activate/deactivate, dashboard stats, audit log list | ✅ each state-changing action writes an AuditLog row |
| Hub CRUD | ✅ |
| Seed script (demo admin + sample hubs) | ✅ |
| Postman collection | ✅ covers all ~24 endpoints (auth, users, shipments, hubs, couriers, payments, admin) |

**Everything in the spec's mandatory list, plus every optional item it explicitly named (Redis, notifications, GCP login), is implemented.** The only things left are ones no one but you can do — see below.

## Setup

```bash
cd courier-backend
npm install
cp .env.example .env      # fill in DATABASE_URL (NeonDB), JWT secrets, SSLCommerz sandbox keys
npx prisma migrate dev --name init
npx prisma db seed        # creates demo admin from .env ADMIN_EMAIL/ADMIN_PASSWORD
npm run dev
```

API base: `http://localhost:5000/api/v1`

## Endpoint map

```
# Auth
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh-token
POST   /api/v1/auth/logout

# Users
GET    /api/v1/users/me
PATCH  /api/v1/users/me

# Shipments (Customer/Courier/Admin)
POST   /api/v1/shipments                    # customer creates
GET    /api/v1/shipments                    # admin, ?page&limit&status&search&sortBy&sortOrder
GET    /api/v1/shipments/my-shipments        # customer's own
GET    /api/v1/shipments/my-assigned         # courier's assigned
GET    /api/v1/shipments/:id
PATCH  /api/v1/shipments/:id/assign          # admin assigns courier
PATCH  /api/v1/shipments/:id/status          # courier/admin moves status forward
POST   /api/v1/shipments/:id/cancel
DELETE /api/v1/shipments/:id                 # soft delete, admin

# Hubs
POST   /api/v1/hubs        (admin)
GET    /api/v1/hubs        ?city=
GET    /api/v1/hubs/:id
PATCH  /api/v1/hubs/:id    (admin)
DELETE /api/v1/hubs/:id    (admin)

# Couriers
GET    /api/v1/couriers/me      (courier)
PATCH  /api/v1/couriers/me      (courier - availability, vehicle info)
GET    /api/v1/couriers         (admin - paginated, ?isAvailable=)

# Payments
POST   /api/v1/payments/initiate    (customer)
POST   /api/v1/payments/webhook     (SSLCommerz IPN)
POST   /api/v1/payments/success
POST   /api/v1/payments/fail
POST   /api/v1/payments/cancel
GET    /api/v1/payments/:shipmentId

# Admin
GET    /api/v1/admin/users              ?page&limit&role&search
PATCH  /api/v1/admin/users/:id/role
PATCH  /api/v1/admin/users/:id/status
GET    /api/v1/admin/dashboard-stats
GET    /api/v1/admin/audit-logs         ?page&limit
```

## Shipment status flow (enforced by `shipment.stateMachine.ts`)

```
PENDING → PICKUP_SCHEDULED → PICKED_UP → AT_ORIGIN_HUB → IN_TRANSIT
        → AT_DESTINATION_HUB → OUT_FOR_DELIVERY → DELIVERED
                                                 → FAILED_DELIVERY → RETURNED
(PENDING/PICKUP_SCHEDULED/PICKED_UP can also go to CANCELLED)
```
Any other transition is rejected with a 400 — this is the "technical challenge you solved" you can talk through in your video.

## Extending further (optional polish, not required)

1. Add `ioredis`-backed pub/sub for real-time shipment tracking (WebSocket push instead of polling).
2. Add refresh-token rotation (invalidate the old token the moment a new one is issued).

## Before you submit — things only you can do

- [ ] Push to your own GitHub repo with 20+ real, incremental commits (`feat:`, `fix:`, `docs:`) — don't do one big initial commit.
- [ ] Deploy to Vercel/Render with a real `DATABASE_URL` (NeonDB) and all `.env` values set as environment variables.
- [ ] Get real SSLCommerz **sandbox** credentials (free, instant, at [sslcommerz.com](https://sslcommerz.com)) and test a full payment round-trip end-to-end.
- [ ] Set up a Google Cloud OAuth client (Console → APIs & Services → Credentials) and drop the client ID/secret into `.env` — the strategy and callback are already implemented in `src/config/passport.ts`.
- [ ] Get free SMTP credentials (Gmail app password, Mailtrap, or Resend) for `.env` so the email notifications actually send — they're already wired into the shipment status/assignment flow.
- [ ] Optionally spin up a free Redis instance (Upstash has a free tier) for caching + shared rate limiting — the app runs fine without it too, just without those benefits.
- [ ] Export a Postman collection from your finished, tested API (starter included in `/postman`, covers all endpoints).
- [ ] Record your 5–10 min walkthrough yourself — you'll need to explain the state machine, the transaction-safe courier assignment, and the payment verification flow in your own words, so make sure you understand *why* each is built the way it is before recording.
- [ ] Create dedicated demo admin credentials (not your real ones) for the submission.

## Demo admin (after seeding)
```
Email:    (from your .env ADMIN_EMAIL)
Password: (from your .env ADMIN_PASSWORD)
```
