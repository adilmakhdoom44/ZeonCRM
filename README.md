# Zeon CRM

A clean, fast CRM for managing **customers, contacts, addresses, phone numbers, emails and projects** — with team login, role-based access and password resets built in.

![Dashboard](docs/dashboard.png)

## Features

- **Customers** — searchable account list with status (lead / active / inactive), industry, website and notes
- **Contacts** — multiple people per customer, each with any number of phone numbers and email addresses, primary-contact flag
- **Addresses** — office / billing / shipping addresses per customer
- **Projects** — work linked to customers with status and timeline (v2 module groundwork)
- **Authentication** — credentials login backed by bcrypt-hashed passwords (Auth.js v5, JWT sessions)
- **User management** — admins add teammates, deactivate accounts and generate one-hour password-reset links
- **Password reset** — self-service token flow (`/forgot-password` → `/reset-password/[token]`)
- **Role-based access** — admin-only areas enforced server-side, not just hidden in the UI

| Login | Customer detail |
| --- | --- |
| ![Login](docs/login.png) | ![Customer detail](docs/customer-detail.png) |

## Stack

- [Next.js 15](https://nextjs.org) (App Router, Server Actions) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com)
- [Prisma 6](https://www.prisma.io) ORM + **MySQL 8**
- [Auth.js v5](https://authjs.dev) (NextAuth) credentials provider
- GitHub Actions CI (lint, typecheck, build)

## Local development

Requirements: Node 22+, MySQL 8 running locally.

```bash
git clone https://github.com/adilmakhdoom44/ZeonCRM.git
cd ZeonCRM
npm install

cp .env.example .env        # then edit values

# create the database (adjust user/password to your MySQL setup)
mysql -u root -e "CREATE DATABASE zeon_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

npm run db:migrate          # apply Prisma migrations
npm run db:seed             # creates the admin user + sample data
npm run dev                 # http://localhost:3000
```

Sign in with the `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` you set in `.env`.

Useful scripts:

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed admin user + sample customers |
| `npm run db:studio` | Prisma Studio database browser |
| `npm run db:start` / `db:stop` | Start/stop the local MySQL server (macOS tarball install in `~/mysql`) |

## Deploying to Vercel

1. Import the GitHub repo at [vercel.com/new](https://vercel.com/new) — pushes to `main` auto-deploy from then on.
2. Provision a hosted MySQL database (PlanetScale, Railway, Aiven, etc.).
3. Set the environment variables in Vercel → Project → Settings → Environment Variables:
   - `DATABASE_URL` — the hosted MySQL connection string
   - `AUTH_SECRET` — generate with `openssl rand -base64 32`
   - `AUTH_TRUST_HOST` — `true`
   - `SEED_ADMIN_EMAIL` / `SEED_ADMIN_NAME` / `SEED_ADMIN_PASSWORD` — your first admin account
4. Apply the schema and seed the first admin from your machine:
   ```bash
   DATABASE_URL="<hosted-mysql-url>" npx prisma migrate deploy
   DATABASE_URL="<hosted-mysql-url>" SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... npx prisma db seed
   ```

## Password resets without email

No SMTP service is required: reset links are printed to the server console in development, and admins can generate a shareable reset link for any user from **Settings → Users**. Links are single-use and expire after one hour.
