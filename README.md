# Arkive

**Crypto inheritance and digital legacy protection on the Arc Network.**

Arkive lets you secure your digital assets in a non-custodial vault and automatically distribute them to your chosen beneficiaries if you become inactive — with multi-signal verification, guardian approvals, and a panic abort system so you are always in control.

🌐 **Live App:** [https://arkive-v1.vercel.app](https://arkive-v1.vercel.app)

---

## What It Does

- **Vault Deposits** — Deposit USDC into the ArkiveVault smart contract on Arc Testnet. Your assets stay non-custodial until a transfer is triggered.
- **Beneficiary Management** — Assign beneficiaries and set how your assets are split between them.
- **Guardian System** — Appoint 3–5 trusted guardians. Recovery only unlocks when a quorum (e.g. 2-of-3) approves, eliminating single points of failure.
- **Multi-Signal Activity Monitoring** — The system watches for your activity across wallet transactions, email, WhatsApp, Telegram, and Discord before considering you inactive.
- **Staged Batch Transfers** — If you go inactive, assets transfer in 4 staged batches (25% → 50% → 75% → 100%) with warning windows at each stage.
- **Panic Reset** — Press a single button at any point to instantly abort all pending transfers and restore normal operation.
- **Recovery Package** — Encrypted recovery instructions passed to beneficiaries once the guardian threshold is met.
- **Auto Transfer Page** — Track vault balance, configure asset rules, and monitor all vault transactions in one place.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, Shadcn UI, Framer Motion |
| Routing | Wouter |
| State / Data | TanStack Query, Orval-generated hooks |
| Backend | Express 5, Node.js 24 |
| Auth & Database | Supabase (Auth + PostgreSQL) |
| ORM | Drizzle ORM |
| Blockchain | Arc Network (Testnet), Manual JSON-RPC calls |
| Smart Contract | Solidity — `ArkiveVault.sol` |
| Package Manager | pnpm (workspace monorepo) |
| Deployment | Vercel (frontend) |

---

## Project Structure

```
├── artifacts/
│   ├── rialo-legacy/       # Main React frontend
│   ├── api-server/         # Express backend (wallet auth, Supabase admin)
│   └── mockup-sandbox/     # UI component playground
├── contracts/              # Solidity smart contracts (ArkiveVault.sol)
├── lib/
│   ├── api-spec/           # OpenAPI 3.1 specification
│   ├── api-zod/            # Generated Zod validation schemas
│   ├── api-client-react/   # Generated React query hooks
│   └── db/                 # Drizzle ORM schema and migrations
└── scripts/                # Build and dev scripts
```

---

## Smart Contract

| | |
|---|---|
| **Contract** | ArkiveVault |
| **Network** | Arc Testnet |
| **Address** | `0x86c5dFdA52AA8C7912fAf02b6393BD434d817059` |
| **Explorer** | [testnet.arcscan.app](https://testnet.arcscan.app) |
| **USDC Token** | `0x3600000000000000000000000000000000000000` |

Key functions: `deposit(uint256)`, `withdraw()` (withdraws full balance), `getVaultBalance(address)`

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- A Supabase project
- MetaMask or any EIP-1193 wallet connected to Arc Testnet

### Installation

```bash
git clone https://github.com/defiplusacademy24-art/Arkive
cd Arkive
pnpm install
```

### Environment Variables

Create a `.env` file in the root or set these in your deployment platform:

```env
# Frontend — must be prefixed with VITE_ for Vite to expose them
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key

# Backend API server
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
DATABASE_URL=postgresql://user:password@host:5432/dbname
SESSION_SECRET=your-random-32-char-secret
```

### Run Locally

```bash
# Run the frontend
pnpm --filter @workspace/rialo-legacy run dev

# Run the backend API server
pnpm --filter @workspace/api-server run dev

# Push database schema
pnpm --filter @workspace/db run push

# Regenerate API client from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen
```

---

## Deployment (Vercel)

The frontend (`artifacts/rialo-legacy`) is deployed to Vercel.

1. Set the **Root Directory** to `artifacts/rialo-legacy`
2. Set the **Build Command** to `pnpm build`
3. Set the **Output Directory** to `dist/public`
4. Add the following environment variables under **Settings → Environment Variables**:

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon/publishable key |

For the API server, deploy `artifacts/api-server` separately and add:

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role secret key |
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Random 32+ character secret string |

---

## Key Pages

| Route | Description |
|---|---|
| `/` | Landing / Login |
| `/dashboard` | Vault balance, check-in, system status, recent activity |
| `/transfer` | Auto Transfer — vault balance, beneficiaries, asset rules, tracked wallets |
| `/activity` | Activity Monitor — inactivity period settings, multi-signal config |
| `/guardians` | Guardian management |
| `/recovery` | Recovery Package setup |
| `/security` | Notification channels (WhatsApp, Telegram, Discord, Email) |

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/healthz` | Server health check |
| `POST` | `/api/auth/wallet/signup` | Register a new wallet-linked account |
| `POST` | `/api/auth/wallet/linked-signin` | Generate magic link for wallet sign-in |

All other data operations (beneficiaries, guardians, assets, activity logs) go directly through Supabase from the frontend.

---

## Adding Arc Testnet to MetaMask

| Field | Value |
|---|---|
| Network Name | Arc Testnet |
| RPC URL | `https://rpc.testnet.arc.network` |
| Chain ID | `5042002` |
| Currency Symbol | USDC |
| Block Explorer | `https://testnet.arcscan.app` |

---

## License

MIT
