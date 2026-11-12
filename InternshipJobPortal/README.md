# Pathway

Pathway is an internship and job portal built with Express, MongoDB, and plain browser JavaScript. It uses role-based access for students, recruiters, and admins, with server-side validation and ownership checks for listings and applications.

## Run locally

Requirements: Node.js 20+ and MongoDB.

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`. Set `MONGODB_URI` and use separate random strings of at least 32 characters for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
3. Start the server using `npm run dev` (or `npm start` without the watcher).
4. Open [http://localhost:3000](http://localhost:3000).

This workspace has a local `.env` with generated JWT secrets. Keep it private; `.env` is ignored by git.

Register with the student or recruiter role. Admin is never a public signup option. To promote an existing account to admin, run:

```sh
npm run make-admin -- person@example.com
```

## Roles and workflow

- **Students** can maintain a profile, browse approved listings, apply once per listing, and track application status.
- **Recruiters** can maintain company details, create and edit listings, review applications to their own listings, and shortlist, accept, or decline candidates.
- **Admins** can review pending listings and approve or reject them. Admin access is provisioned out-of-band with the script above.
- New listings and edits enter moderation as `pending`; only approved listings are visible to students.
- Listings can include an optional positive whole-number monthly stipend in Indian rupees (INR).

## API

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | Create a student or recruiter account and sign in |
| `POST` | `/api/auth/login` | Public | Sign in |
| `POST` | `/api/auth/refresh` | Refresh cookie | Rotate the refresh token |
| `POST` | `/api/auth/logout` | Refresh cookie | Revoke the current refresh session |
| `GET` | `/api/auth/me` | Signed in | Read the current account |
| `GET` | `/api/profile` | Signed in | Read the current role profile |
| `PUT` | `/api/profile` | Signed in | Update allowed profile fields |
| `GET` | `/api/jobs` | Public | Browse approved listings; recruiters also see their own pending/rejected listings |
| `POST` | `/api/jobs` | Recruiter | Create a listing for admin review |
| `PUT` | `/api/jobs/:id` | Listing owner | Edit a listing and send it back for review |
| `GET` | `/api/jobs/moderation` | Admin | List listings for moderation |
| `PATCH` | `/api/jobs/:id/moderation` | Admin | Approve or reject a listing |
| `POST` | `/api/jobs/:id/apply` | Student | Apply to an approved, open listing |
| `GET` | `/api/applications` | Signed in | Students see their applications; recruiters see applicants to their listings; admins see all |
| `PATCH` | `/api/applications/:id/status` | Recruiter / admin | Shortlist, accept, or reject an application |

Protected API requests use `Authorization: Bearer <access-token>`. The refresh token is an HTTP-only, same-site cookie and is rotated on refresh. Passwords are hashed with bcrypt; stored refresh tokens are SHA-256 hashes. Authentication endpoints are rate-limited and request bodies reject unknown fields.

## Checks

Run the request-schema tests with `npm test`.
