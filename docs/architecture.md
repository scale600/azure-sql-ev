# Architecture

Interactive SQL query test dashboard for Washington State EV registration data (~294K rows), deployed entirely within Azure free tiers at `https://azure-sql-ev.techcloudup.com`.

```
┌────────────────────────────────────────────────────────────────┐
│  Browser                                                        │
│  https://azure-sql-ev.techcloudup.com                           │
└───────────────────────┬────────────────────────────────────────┘
                        │ HTTPS (CORS: custom domain allowed)
                        ▼
┌────────────────────────────────────────────────────────────────┐
│  Azure Static Web Apps (Free)                                   │
│  swa-ev-37851cd1 · East US 2 · React 18 + Vite                  │
└───────────────────────┬────────────────────────────────────────┘
                        │ POST /api/query · GET /api/schema
                        ▼
┌────────────────────────────────────────────────────────────────┐
│  Azure Functions (Consumption, Free)                            │
│  func-ev-37851cd1 · West US 3 · Python 3.11 (V2 model)          │
│  · SqlQueryApi   POST /api/query   (ev_readonly)                │
│  · SqlSchemaApi  GET  /api/schema  (ev_readonly)                │
│  · EvIngestion   TimerTrigger 06:00 UTC (evadmin)               │
└───────────────────────┬────────────────────────────────────────┘
                        │ pymssql (TLS, Encrypt)
                        ▼
┌────────────────────────────────────────────────────────────────┐
│  Azure SQL Database (Free offer, Serverless)                    │
│  sql-ev-37851cd1 / EVPopulationDB · West US 3 · auto-pause      │
│  staging (294K) + 4 dims + fact (294K)                          │
└────────────────────────────────────────────────────────────────┘
```

## Components

| Layer | Resource | Region | Notes |
| :--- | :--- | :--- | :--- |
| Frontend | `swa-ev-37851cd1` | East US 2 | React 18 + Vite, SPA fallback |
| API | `func-ev-37851cd1` | West US 3 | Consumption, Python 3.11 |
| Storage | `stev37851cd1` | West US 3 | Standard LRS; hosts function state + TF state |
| Database | `sql-ev-37851cd1` | West US 3 | Free offer (`useFreeLimit: true`) |
| IaC | Terraform + `azapi` | — | Remote state in `stev37851cd1/tfstate` |
| CI/CD | GitHub Actions | — | OIDC auth; terraform/functions/web workflows |

## Data flow

1. **Ingestion** (`EvIngestion`, daily 06:00 UTC) fetches `data.wa.gov/resource/f6w7-q2d2.json` (Socrata) with `$limit`/`$offset` pagination (~294K records), bulk-loads into `staging`, then runs the star-schema ETL (dimensions → fact).
2. **Query API** (`SqlQueryApi`) validates the SQL (SELECT/WITH allowlist + DDL/DML keyword blocklist), then executes against `EVPopulationDB` as `ev_readonly` with a 30 s timeout and 1,000-row cap.
3. **Schema API** (`SqlSchemaApi`) returns table/column metadata from `sys.tables` / `sys.columns`.

## Security model (defense in depth)

1. **Primary boundary — the database role.** `ev_readonly` has only `db_datareader`, with explicit `DENY INSERT, UPDATE, DELETE, EXEC`. This is the real read-only enforcement.
2. **Fail-fast checks — the API layer.** The allowlist (`SELECT`/`WITH`) and keyword blocklist reject obviously-write queries early, but are documented as non-boundary (obfuscated SQL can bypass string matching).
3. **Transport** — `Encrypt` on all connections; `httpsOnly`, `FtpsOnly` on the Function App.
4. **Least privilege** — the query/schema APIs use `ev_readonly`; only the ingestion function uses `evadmin`.
5. **Row cap / timeout** — 1,000 rows max, 30 s server-side limit.

## Cost model ($0/month)

| Service | Free allowance | Projected usage |
| :--- | :--- | :--- |
| Azure SQL (free offer) | 100,000 vCore-s/mo, 32 GB | ~90 vCore-s/day ≈ 3% |
| Azure Functions | 1M executions/mo | < 1K |
| Static Web Apps | 100 GB bandwidth/mo | < 1 GB |

Auto-pause keeps the serverless database at zero compute when idle; the ingestion's `db.py` retries connections to tolerate the ~30–60 s resume.

## Key implementation decisions

- **`pymssql` instead of `pyodbc`** — the Linux consumption runtime has no ODBC driver; `pymssql` bundles FreeTDS.
- **`azapi_resource` for the database** — `azurerm_mssql_database` does not expose `use_free_limit`; the free-offer database is managed via AzAPI.
- **Natural-key indexes for the ETL joins** — `dim_vehicle.vin_1_10`, `dim_location(county,city,state,postal_code)`, `dim_model_year.model_year`, `dim_utility.electric_utility`.
