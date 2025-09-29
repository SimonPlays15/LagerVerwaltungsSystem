# LagerVerwaltungsSystem (Warehouse Management System)

A full‑stack inventory/warehouse management system with a TypeScript/Express backend and a React (Vite) frontend. It
manages articles, categories/sub‑categories, inventory levels, stock movements (check‑in/out/adjustment/transfer), cost
centers, inventory counting sessions, users and session‑based authentication. Reporting and barcode/QR scanning are
included.

> Note: Some domain labels are in German (e.g., Kategorien, Kostenstellen). The codebase uses Drizzle ORM with
> PostgreSQL and stores sessions in the database.

> Note: This is a personal project and not affiliated with any company.

## Demo

- Comming soon

## Stack

- Language: TypeScript (Node.js + React)
- Backend: Express 4, pg, Drizzle ORM
- Frontend: React 18 with Vite 5, Wouter (routing), TanStack Query, Tailwind CSS, Radix UI components
- Build tools: Vite (client), esbuild (server), tsx (dev runtime)
- Database: PostgreSQL
- Auth: Email/Password with express‑session + connect‑pg‑simple (session store)
- Package manager: npm (package-lock.json present)

## Project structure

- client/ — React app (Vite root) with UI, routes and pages
    - src/main.tsx — client entry
    - src/App.tsx — app router and providers
- server/ — Express server, API routes, Vite dev middleware and static serving
    - index.ts — server entry (dev/prod)
    - routes.ts — REST API routes (auth, articles, inventory, reports, etc.)
    - localAuth.ts — session configuration and local email/password auth
    - db.ts — PostgreSQL connection + Drizzle setup
    - vite.ts — Vite dev middleware and static file serving in production
    - storage.ts — data access layer using Drizzle ORM
- shared/ — shared types and Drizzle schema (source of truth for migrations)
    - schema.ts — all tables, relations, zod schemas and types
- migrations/ — Drizzle migrations output
- vite.config.ts — Vite config (client root = client/; build to dist/public)
- drizzle.config.ts — Drizzle CLI config
- package.json — scripts and dependencies
- CHANGELOG.md — changelog

Output directory after build:

- dist/index.js — bundled server (esbuild)
- dist/public/** — built client (Vite)

## Requirements

- Node.js 20+
- npm 8+
- PostgreSQL (local or hosted)

## Environment variables

Define these in a .env file at the repository root.

Required:

- DATABASE_URL — PostgreSQL connection string
- SESSION_SECRET — secret used to sign session cookies

Optional:

- PORT — server port (default 5000)
- NODE_ENV — development or production

Notes:

- Sessions are stored in the database in the sessions table (created via Drizzle schema).
- On development, the server tries to create a default admin user if no users exist. In production it never creates a
  default admin.
- There is a console warning referencing ADMIN_PASSWORD when creating the development admin. The code does not currently
  read or apply ADMIN_PASSWORD — treat it as informational only. TODO: Confirm desired behavior and implement
  configurable dev admin password if needed.

Example .env (do not commit this file):

DATABASE_URL=postgres://postgres:postgres@localhost:5432/lager
SESSION_SECRET=change_me
PORT=5000
NODE_ENV=development

## Setup

1. Install dependencies
    - npm install
2. Configure environment
    - Create .env in the repo root with the variables above
3. Initialize database schema
    - npm run db:push
    - This applies the schema from shared/schema.ts to DATABASE_URL and creates required tables (including sessions).

## Running

Development (single command, serves API and client on the same port):

- npm run dev
    - Starts Express via tsx and attaches Vite as middleware; visit http://localhost:5000/

Production:

- npm run build
    - Builds the client to dist/public and bundles the server to dist/index.js
- npm start
    - Serves API and static client from dist on PORT (default 5000)

## Scripts

- dev — tsx server/index.ts (Express + Vite middleware for client)
- build — vite build (client) and esbuild server/index.ts (server) to dist
- start — node dist/index.js (serve API + static client)
- check — tsc type checking
- db:push — drizzle-kit push (apply schema to the database)
- db:reset — development-only helper to truncate all tables except drizzle_migrations

## Tests

- No automated tests were found in the repository at the time of writing.
- TODO: Add unit/integration tests (e.g., Vitest/Jest for server utilities and React Testing Library for the client).
  Add CI configuration if required.

## Features overview

- Authentication: email/password, session-based; account lockout and tracking of failed logins
- Users and roles: admin, projektleiter, techniker (see shared/schema.ts)
- Articles with categories/sub-categories, inventory levels and locations
- Stock movements: check-in, check-out (with cost center), adjustments, transfers
- Cost centers management
- Inventory counting sessions with items and approvals
- Reporting, with export utilities
- Barcode/QR scanning support on the client

## Development notes

- First launch flow: Registration is only allowed if no users exist. Otherwise login is required. The UI calls
  /api/firstlaunch.
- Default data: On startup, the server ensures some default categories/sub-categories and a default cost center exist.
  In development only, it creates a development admin if no user exists.
- Client routing: Wouter, served behind Express; in production the built app is served from dist/public.

## License

- MIT

## Changelog

See CHANGELOG.md.

## Roadmap / TODOs

- Comming soon
