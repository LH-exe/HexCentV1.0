# AGENTS.md — HexCent Platform Architecture & Rules

## 1. Project Overview
**HexCent** is a multi-project personal platform and central control hub. It hosts public project showcases, an interactive About Me portfolio, a Notion-style debounced document workspace, an Admin Control Panel with Redis rate limiting, and dedicated UI portals for external engines (Hexnet Quantitative Engine and Study-Agent Research Streamer).

## 2. Core Technology Stack
- **Framework:** Next.js 15+ (App Router, TypeScript)
- **Styling:** Tailwind CSS v3/v4, Lucide React icons, Fira Code & Geist typography
- **Theme Palette:** Tactical Cyber/Dark Mode (`#020406` base background, `#0c121c` card background, `#1e293b` borders, `#00f0ff` primary cyan, `#00ff66` neon green, `#ff3366` crimson)
- **Primary Relational DB (Neon PostgreSQL + Prisma ORM):** Persistent storage for Users, Documents, Workspace folders, and Document AST JSON payloads.
- **Cache & Telemetry DB (Upstash Redis):** Ephemeral command telemetry, API rate-limiting via `@upstash/ratelimit`, and execution tokens.
- **Authentication:** Stateless encrypted cookie sessions / JWT with two distinct tiers:
  - `ADMIN`: Full access to workspace creation, admin control panel, system rate limits, and remote project triggers.
  - `GUEST`: Read-only/public access to About Me, permitted project showcases (Hexnet overview, Study-Agent demo), and sandbox notes.

## 3. Directory Layout Blueprint
- `app/`
  - `(auth)/login/` — Dual-tier login portal (Password authentication + 1-click Guest Mode).
  - `(public)/` — Landing page, About Me showcase, project indexes.
  - `admin/` — Admin metrics, system settings, Redis rate-limit control deck.
  - `workspace/` — Notion-style block document editor with debounced auto-saving.
  - `projects/hexnet/` — Dedicated Hexnet live monitoring and kill-switch interface.
  - `projects/study-agent/` — Real-time research agent streaming viewer.
  - `api/` — API routes for auth, documents, admin, and project telemetry.
- `lib/` — Prisma client singleton, Redis client, auth session utilities, rate-limiting middlewares.
- `prisma/` — `schema.prisma` defining relational schema.

## 4. Engineering & Safety Constraints
1. **Debounced Document Saves:** The Notion-style workspace must never write to Neon on every keystroke. Autosave requests must debounce for 1,500ms–2,000ms.
2. **Strict Route Protection:** Routes under `/admin` and write actions under `/api/documents` must reject non-admin sessions with `401 Unauthorized` or `403 Forbidden`.
3. **Zero Vercel Function Overhead:** Treat external engines (Hexnet, Study-Agent) as decoupled entities; do not run long-running execution loops inside serverless functions.