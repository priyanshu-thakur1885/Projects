# Orbit SaaS User Management & Subscription System

A plain JavaScript (Node.js)/Express and PostgreSQL starter application with account authentication, rotating refresh sessions, password reset, plan entitlements, admin management APIs, and a small user/admin dashboard.

## Requirements

- Node.js 20+
- Docker Desktop (or a local PostgreSQL 16 instance)

## Quick start (PowerShell)

1. Install packages:

   ```powershell
   npm install
   ```

2. Start Docker Desktop, then start PostgreSQL:

   ```powershell
   docker compose up -d db
   ```

3. Copy `.env.example` to `.env`. The project workspace's `.env` contains locally generated access/refresh signing secrets; keep it private and never commit it.

4. Create the local database schema and seed plans:

   ```powershell
   npm run db:push
   npm run db:seed
   ```

5. Start the server:

   ```powershell
   npm run dev
   ```

The bundled PostgreSQL container listens on host port `55432` to avoid conflicting with other local PostgreSQL services. If you use your own database instead, set `DATABASE_URL` to that server's actual username, password, database, and port. The Compose database password is only applied when its data volume is initialized; changing the Compose password does not update an existing database or volume.

Open [http://localhost:3000](http://localhost:3000). Create a regular account from the UI. To create the first administrator, set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` before running `npm run db:seed`. The seed only creates an administrator if that email is not already registered.

The backend runs directly on Node.js; there is no TypeScript compiler or application build step.

## API

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register a user and assign the Free plan |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/refresh` | Rotate the HttpOnly refresh cookie and issue a new access token |
| POST | `/api/auth/logout` | Revoke the current refresh session |
| POST | `/api/auth/forgot-password` | Start password reset |
| POST | `/api/auth/reset-password` | Set a new password with a reset token |
| POST | `/api/auth/change-password` | Change password while signed in |
| GET | `/api/user/profile` | View the authenticated profile and subscription |
| GET | `/api/user/advanced-reports` | Example paid-plan feature restriction |
| GET | `/api/subscription/plans` | List active plans |
| GET | `/api/subscription/me` | View current subscription and apply expiry downgrade |
| POST | `/api/subscription/upgrade` | Activate a demo paid plan |
| GET | `/api/admin/users` | Search and paginate users (admin only) |
| PATCH | `/api/admin/users/:userId/plan` | Change a user's plan (admin only) |
| PATCH | `/api/admin/users/:userId/suspension` | Suspend or restore an account (admin only) |
| GET | `/api/admin/summary` | Admin dashboard summary |

Protected API calls use `Authorization: Bearer <accessToken>`. Access tokens expire in 15 minutes. Refresh tokens are opaque, stored hashed in the database, rotated on refresh, and sent in an HttpOnly cookie. Passwords require at least 12 characters and are hashed with bcrypt.

In development, password-reset tokens are printed to the server console because no email provider is configured. Configure a real email delivery provider before production use.

## Production notes

- The upgrade route is a demonstration: it does **not** collect payment. Integrate a payment provider and verified webhook lifecycle before selling subscriptions.
- Replace development database credentials, use TLS, set `NODE_ENV=production`, and provision independent cryptographically random signing secrets through a secret manager.
- Add email delivery, account verification, operational logging/monitoring, database backups, and automated tests before production deployment.
