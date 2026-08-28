# HEXCENT // Personal Engineering Platform & Command Center

<p align="center">
  <img src="https://img.shields.io/badge/Framework-Next.js%2015-00f0ff?style=flat-square&logo=nextdotjs&logoColor=black" alt="Next.js" />
  <img src="https://img.shields.io/badge/Database-Neon%20Postgres-00ff66?style=flat-square&logo=postgresql&logoColor=black" alt="Neon" />
  <img src="https://img.shields.io/badge/ORM-Prisma-white?style=flat-square&logo=prisma&logoColor=black" alt="Prisma" />
  <img src="https://img.shields.io/badge/Cache-Upstash%20Redis-ff3366?style=flat-square&logo=redis&logoColor=white" alt="Upstash" />
  <img src="https://img.shields.io/badge/UI-Tactical%20CLI-070b11?style=flat-square" alt="CLI" />
</p>

HexCent is a modular personal operations hub, quantitative engineering portfolio, and high-performance productivity workspace designed with a sharp, zero-slop CLI aesthetic.

---

## Architecture Highlights

- **Dual-Tier Authentication:** Stateless encrypted cookie sessions (`jose` HS256) supporting Admin password auth and instant 1-click Guest sandboxes.
- **Notion-Style Productivity Engine:**
  - Full drive system with infinite recursive nested folders, HTML5 drag-and-drop hierarchy restructuring, and sub-second persistence.
  - Document canvas featuring Google Docs-style font/size tools, dark checklists, custom color palettes, and 10s inactivity / 60s periodic autosave flushing.
  - Private Workspace Gallery with inline block editors.
- **Live Market Microstructure Simulation:**
  - Real-time SVG/Canvas order-flow chart modeling ES/MES futures in discrete 0.25-point ticks.
  - Non-linear, price-linked monotonic volume engine with background tab execution throttling (`document.visibilitychange`).
- **Dynamic In-Place CMS:** Full multi-column visual page layout builder for the About Me portal and Project showcases backed by PostgreSQL.
- **Zero-Compute Edge SWR:** Edge CDN caching headers for public assets coupled with selective column payload pruning (<5 KB AST metadata transfers).

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend / SSR** | Next.js 15+ (App Router, React 19, TypeScript) |
| **Styling** | Tailwind CSS (Strict `rounded-none`, Fira Code / Geist Mono) |
| **Primary Storage** | Neon Serverless PostgreSQL (Pooled via PgBouncer) |
| **ORM** | Prisma 6.x |
| **Edge Cache / Rate Limiting** | Upstash Redis + `@upstash/ratelimit` |
| **Authentication** | Stateless JWT (`jose`) with HTTP-Only Cookies |

---
