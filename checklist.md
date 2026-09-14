# Build Checklist — azure-sql-ev

> Interactive SQL query test dashboard on Azure SQL Database (free offer), Azure Functions, and Azure Static Web Apps — powered by Washington State EV registration data.

**Status**: In progress
**Last updated**: 2026-09-11

---

## Legend

- `[x]` Done
- `[ ]` Pending

---

## Connection Summary (non-secret)

| Resource | Name | Region | Tier |
| :--- | :--- | :--- | :--- |
| Resource group | `rg-azure-sql-ev` | eastus | — |
| SQL Server | `sql-ev-37851cd1` | westus3 | — |
| SQL DB (free offer) | `EVPopulationDB` | westus3 | `useFreeLimit: true` |
| Storage account | `stev37851cd1` | westus3 | Standard_LRS |
| Function App | `func-ev-37851cd1` | westus3 | Consumption |
| Static Web App | `swa-ev-37851cd1` | eastus2 | Free |

> Secrets (admin password, storage key) live in `.env` (gitignored) and, at deploy time, in Function App Settings — **never in code or commits**.

---

## Phase 0 — Repository Foundation

- [x] `README.md` — overview, architecture, setup, sample queries
- [x] `PRD.md` — functional/non-functional requirements, data model, security model
- [x] `.gitignore` — excludes `.env`, `local.settings.json`, `node_modules/`, `web/dist/`, `.codegraph`
- [x] `git init`
- [ ] `LICENSE` — MIT
- [ ] Create folder structure (`sql/`, `functions/`, `web/`, `scripts/`, `docs/`)

## Phase 1 — Azure Infrastructure (Free Tier)

- [x] Resource group `rg-azure-sql-ev`
- [x] SQL logical server `sql-ev-37851cd1`
- [x] Free-offer database `EVPopulationDB` (`--use-free-limit`, `AutoPause`)
- [x] Storage account `stev37851cd1`
- [x] Function App `func-ev-37851cd1` (Consumption, Python 3.11, Linux)
- [x] Static Web App `swa-ev-37851cd1` (Free)
- [x] Consolidate connection info into `.env` (gitignored)

> ⚠️ **Region note**: `eastus` rejected new SQL server creation (`RegionDoesNotAllowProvisioning`). SQL is provisioned in `westus3`, which locks the free-offer region for this subscription.

## Phase 2 — Database Schema & Security

- [x] `sql/01-create-tables.sql` — `staging` (NVARCHAR) + 4 dimensions + fact
- [x] `sql/02-create-indexes.sql` — `IX_*` indexes on dims + fact FKs
- [x] `sql/03-etl-dimensions.sql` — load `dim_vehicle`, `dim_location`, `dim_utility`, `dim_model_year` (runs after Phase 3 ingestion)
- [x] `sql/04-etl-fact.sql` — load `fact_ev_registration` (runs after Phase 3 ingestion)
- [x] `sql/05-sample-queries.sql` — curated examples for the dashboard
- [x] `sql/06-readonly-user.sql` — `ev_readonly` + `db_datareader` + `DENY INSERT, UPDATE, DELETE, EXEC`
- [x] Apply scripts `01`/`02`/`06` (schema, indexes, read-only user verified: SELECT allowed, INSERT/DROP blocked)
- [x] Enable **Allow Azure services** firewall rule on the SQL server (via Terraform)

## Phase 3 — Backend (Azure Functions)

- [x] Scaffold `functions/` (`host.json`, `requirements.txt`, `local.settings.json.example`)
- [x] `EvIngestion` — TimerTrigger (daily 06:00 UTC): fetch Socrata API → `staging` → ETL (dims + fact)
- [x] `SqlQueryApi` — `POST /api/query` and `GET /api/schema` (V2 programming model, single `function_app.py`)
- [x] Query guard: `SELECT`/`WITH` allowlist, DDL/DML keyword blocklist, 30 s timeout, 1,000-row cap
- [x] Use `ev_readonly` (least privilege) for the query API; `evadmin` only for ingestion
- [x] Deploy: `func azure functionapp publish func-ev-37851cd1` (uses `pymssql` — no ODBC driver on Linux)
- [x] Set secrets in Function App Settings (not in code)
- [x] Smoke-test `POST /api/query` (SELECT → 200, INSERT/DROP/DELETE → 403)
- [x] Ingestion verified: 294,193 records loaded (staging = fact, no duplicates) with a sample `SELECT`

## Phase 4 — Frontend (React + Vite)

- [x] Scaffold `web/` (`package.json`, `index.html`, `vite.config.js`, `staticwebapp.config.json`)
- [x] `src/api/client.js` — call `/api/query` and `/api/schema`
- [x] `src/components/QueryEditor.jsx` — SQL editor + `Ctrl+Enter`
- [x] `src/components/ResultTable.jsx` — sortable grid + truncation indicator
- [x] `src/components/SavedQueries.jsx` — `localStorage` persistence
- [x] `src/components/QueryHistory.jsx` — last 20 executions
- [x] `App.jsx` + `main.jsx` (schema browser + sample queries)
- [x] Build: `npm run build` → `web/dist`
- [x] Deploy to Static Web App `swa-ev-37851cd1` (web.yml workflow; CORS added via Terraform)

## Phase 5 — Integration

- [x] Wire SWA → Function App (`api/client.js` points at `FUNCTION_APP_URL` directly)
- [x] CORS restricted to the SWA domain (Terraform `site_config.cors`)
- [x] End-to-end test: run a sample query in the browser (results render, sorting works, history persists)
- [x] Function App `app_settings` managed in Terraform (were wiped by an earlier apply)
- [x] `db.py` connection retry + `login_timeout` 60s for serverless auto-pause resume

## Phase 6 — Custom Domain & SSL

- [ ] Add CNAME `azure-sql-ev` → `wonderful-rock-0b2a86a0f.3.azurestaticapps.net`
- [ ] Add custom domain in the SWA portal
- [ ] Verify SSL auto-provisioned (within 24 h)

## Phase 7 — QA, Documentation, Release

- [ ] Verify `$0` monthly cost (Azure Cost Management)
- [ ] Capture screenshots (`docs/screenshots/dashboard-overview.png`, `query-result.png`)
- [ ] Write `docs/architecture.md`, `docs/erd.md`, `docs/dns-setup.md`
- [ ] Commit + push to GitHub
- [ ] Replace `<username>` placeholder in `README.md` and `PRD.md` repo URLs

---

## Acceptance Criteria (from PRD)

| Goal | Criterion |
| :--- | :--- |
| G1 | Ingestion function runs daily, ingests ≥ 99% of source records |
| G2 | Star schema: 1 fact + 4 dimension tables |
| G3 | Browser editor, ≤ 3 s query response |
| G4 | Read-only user, `SELECT`-only enforcement, 30 s timeout |
| G5 | `https://azure-sql-ev.techcloudup.com` active with SSL |
| G6 | Azure cost = $0/month |
| G7 | PRD + README + ERD + SQL scripts + screenshots |
