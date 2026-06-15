# Arkive

A Web3 crypto vault app — lets users connect wallets, deposit/withdraw assets, manage guardians for account recovery, and view transaction activity on-chain.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/rialo-legacy run dev` — run the frontend (port 22622)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + TailwindCSS v4 + shadcn/ui + wouter (routing)
- Auth: Supabase (email/Google OAuth + wallet-based auth via custom backend)
- API: Express 5 (wallet auth endpoints: `/api/auth/wallet/signup`, `/api/auth/wallet/linked-signin`)
- DB: PostgreSQL + Drizzle ORM + Supabase
- Smart Contract: `contracts/ArkiveVault.sol` (Solidity)
- Build: esbuild (API CJS bundle)

## Where things live

- `artifacts/rialo-legacy/` — React/Vite frontend (the main app)
- `artifacts/api-server/` — Express backend with wallet auth routes
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `lib/db/src/schema/index.ts` — DB schema
- `contracts/ArkiveVault.sol` — on-chain vault smart contract
- `supabase-migration.sql` — Supabase DB migration
- `artifacts/rialo-legacy/src/integrations/supabase/` — Supabase client + types

## Architecture decisions

- Wallet auth uses a Supabase admin API to create/look up accounts keyed by wallet address, converting wallet addresses to deterministic email/password credentials.
- The frontend talks directly to Supabase for auth sessions; the backend (`/api/auth/`) handles admin-only wallet signup and linked-account lookups that require the service role key.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are set in `.replit` `[userenv.shared]` so they're available both frontend (VITE_ prefix) and backend.
- `SUPABASE_SERVICE_ROLE_KEY` must be set as a secret (never exposed to frontend).

## Product

- Landing page with wallet connect
- Dashboard showing vault balance and recent activity
- Deposit and withdraw modals (on-chain interactions)
- Guardians page for social recovery setup
- Community and Docs pages
- Auth via email/Google (Supabase) or crypto wallet (MetaMask, OKX, Phantom, Trust)

## User preferences

_Populate as you build._

## Gotchas

- `SUPABASE_SERVICE_ROLE_KEY` is required by the API server for wallet auth routes — set it as a Replit secret.
- The frontend uses `BASE_PATH = "/"` — served at the root.
- Port 22622 is rialo-legacy (frontend), port 8080 is api-server.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
