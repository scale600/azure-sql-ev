# 📋 PRD: azure-sql-ev

## Product Requirements Document

**Project**: azure-sql-ev
**Domain**: https://azure-sql-ev.techcloudup.com
**Repository**: https://github.com/scale600/azure-sql-ev
**Version**: 1.0
**Status**: Draft
**Last Updated**: 2026-09-11

---

## 1. Executive Summary

**azure-sql-ev** is a serverless, cloud-native web application that provides an **interactive SQL query test dashboard** on top of real-world electric vehicle (EV) registration data. The platform ingests publicly available data from the Washington State Department of Licensing via the Socrata Open Data API, stores it in Azure SQL Database, and exposes a browser-based SQL editor where users can run read-only `SELECT` queries against the dataset.

The project is designed as a **DBA portfolio piece** to demonstrate practical, production-grade skills in:

- Cloud database administration (Azure SQL Database, serverless tier)
- Serverless API design (Azure Functions, HTTP triggers)
- Frontend hosting with custom domain and SSL (Azure Static Web Apps)
- Dimensional data modeling (star schema)
- T-SQL query optimization and security hardening
- Cost management within free-tier limits

Unlike a static analytics dashboard, this project gives users an **interactive SQL playground** backed by a real dataset, making it useful for DBA interview demonstrations, SQL practice, and portfolio review.

---

## 2. Problem Statement

DBA candidates and data practitioners often struggle to demonstrate their skills convincingly because:

- **Static dashboards** show outputs, not query skills.
- **Local-only databases** don't demonstrate cloud administration.
- **Enterprise environments** are inaccessible to individuals.
- **Existing SQL playgrounds** (e.g., sqlfiddle, db-fiddle) use tiny toy schemas, not realistic datasets.
- **Cost concerns** prevent individuals from running production-grade cloud infrastructure.

**azure-sql-ev** addresses this gap by delivering a **publicly accessible, interactive SQL test dashboard** on a realistic dataset — deployed entirely within Azure free tiers and available at a custom domain.

---

## 3. Goals & Objectives

| # | Goal | Measurable Outcome |
| :--- | :--- | :--- |
| G1 | Build a serverless ETL pipeline for EV data | Azure Function runs daily, ingests ≥ 99% of source records |
| G2 | Design a dimensional data model | Star schema: 1 fact + 4 dimension tables |
| G3 | Provide an interactive SQL test dashboard | Browser-based editor, ≤ 3s query response |
| G4 | Secure the query interface | Read-only SQL user, `SELECT`-only enforcement, 30s timeout |
| G5 | Serve via custom domain with SSL | `https://azure-sql-ev.techcloudup.com` active |
| G6 | Operate at $0/month | Azure costs = $0 |
| G7 | Produce portfolio-ready documentation | PRD, README, ERD, SQL scripts, screenshots |

---

## 4. Target Users

| Persona | Description | Primary Need |
| :--- | :--- | :--- |
| **Primary: DBA Hiring Managers** | Technical recruiters and engineering leads | Evidence of cloud DB skills, query optimization, security |
| **Secondary: SQL Learners** | Students and practitioners | Safe sandbox with realistic data |
| **Tertiary: Project Owner** | The developer building the portfolio | Extensible, low-cost, repeatable project |
| **Quaternary: Data Analysts** | Anyone exploring EV trends | Ad-hoc querying without local setup |

---

## 5. Scope

### In Scope

- Ingesting EV Population Data from `data.wa.gov` via Socrata API
- Storing raw data in a `staging` table and transforming into a star schema
- Scheduling ingestion via Azure Functions (TimerTrigger, daily)
- Exposing a secure HTTP API for SQL execution (Azure Functions, HTTP Trigger)
- Building an interactive React-based SQL editor hosted on Azure Static Web Apps
- Serving the app at `azure-sql-ev.techcloudup.com` with automatic SSL
- Enforcing read-only access with a dedicated SQL user
- Documenting architecture, schema, security model, and setup

### Out of Scope

- Real-time streaming ingestion
- User authentication / multi-tenant access
- Write operations (`INSERT`, `UPDATE`, `DELETE`, `DDL`)
- Mobile-native applications
- Machine learning / predictive analytics
- Paid tiers or premium Azure features
- Row-level security (RLS) in v1.0

---

## 6. Functional Requirements

| ID | Requirement | Priority |
| :--- | :--- | :--- |
| FR-1 | System shall fetch EV data from `https://data.wa.gov/resource/f6w7-q2d2.json` with pagination (`$limit`, `$offset`) | Must |
| FR-2 | System shall store raw records in a `staging` table using `NVARCHAR` columns | Must |
| FR-3 | System shall transform staging data into `dim_vehicle`, `dim_location`, `dim_utility`, `dim_model_year`, and `fact_ev_registration` | Must |
| FR-4 | Azure Function shall run ingestion daily at 06:00 UTC | Must |
| FR-5 | System shall expose `POST /api/query` that accepts a JSON body `{ "query": "<sql>" }` | Must |
| FR-6 | API shall reject any query containing `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `CREATE`, `EXEC`, `MERGE`, `GRANT`, or `REVOKE` | Must |
| FR-7 | API shall reject queries not starting with `SELECT` or `WITH` | Must |
| FR-8 | API shall enforce a **30-second** query timeout | Must |
| FR-9 | API shall cap result sets at **1,000 rows** and indicate truncation | Must |
| FR-10 | Dashboard shall provide a SQL editor with run button and `Ctrl+Enter` shortcut | Must |
| FR-11 | Dashboard shall display results in a sortable grid with column headers | Must |
| FR-12 | Dashboard shall display execution time and row count | Must |
| FR-13 | Dashboard shall allow saving queries to browser `localStorage` | Should |
| FR-14 | Dashboard shall display a list of sample queries for new users | Should |
| FR-15 | System shall expose `GET /api/schema` returning table and column metadata | Should |
| FR-16 | Dashboard shall display a query history (last 20 executions) | Could |

---

## 7. Non-Functional Requirements

| ID | Requirement | Target |
| :--- | :--- | :--- |
| NFR-1 | Monthly Azure cost | **$0** (free tiers only) |
| NFR-2 | Ingestion duration | ≤ 5 minutes per run |
| NFR-3 | Data freshness | ≤ 24 hours |
| NFR-4 | Query API response time (p95) | ≤ 3 seconds |
| NFR-5 | Dashboard load time | ≤ 2 seconds |
| NFR-6 | Data retention | Latest snapshot only (no historical retention in v1.0) |
| NFR-7 | Availability | Best-effort (no SLA — free tier) |
| NFR-8 | Security | Encrypted connections (`Encrypt=yes`), least-privilege SQL user |
| NFR-9 | Browser support | Chrome, Edge, Firefox, Safari (latest 2 versions) |
| NFR-10 | Accessibility | WCAG 2.1 AA for core flows |

---

## 8. Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Browser                                                     │
│  https://azure-sql-ev.techcloudup.com                        │
└──────────────────────┬───────────────────────────────────────┘
                       │ HTTPS
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  Azure Static Web Apps (Free)                                │
│  - React + Vite frontend                                     │
│  - Custom domain + auto SSL                                  │
│  - /api/* proxied to Azure Functions                         │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  Azure Functions (Consumption, Free)                         │
│  - POST /api/query   → Execute read-only SQL                 │
│  - GET  /api/schema  → Table/column metadata                 │
│  - TimerTrigger      → Daily EV data ingestion               │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  Azure SQL Database (Free Offer, Serverless)                 │
│  - Read-only user (db_datareader)                            │
│  - Star schema: staging + dims + fact                        │
│  - Auto-pause on idle (60 min)                               │
└──────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Layer | Technology | Responsibility |
| :--- | :--- | :--- |
| Data Source | Socrata Open Data API | Public EV registration data |
| Ingestion | Azure Functions (TimerTrigger, Python 3.11) | Scheduled API fetch + DB insert |
| Query API | Azure Functions (HTTP Trigger) | Validate & execute read-only SQL |
| Storage | Azure SQL Database (Serverless) | Persist raw + modeled data |
| Frontend | React + Vite on Azure Static Web Apps | Interactive SQL editor UI |
| DNS / SSL | Azure Static Web Apps Custom Domain | Serve at `azure-sql-ev.techcloudup.com` |

---

## 9. Data Model (Star Schema)

```
dim_vehicle ──┐
dim_location ─┼──▶ fact_ev_registration ◀── dim_model_year
dim_utility ──┘
```

| Table | Type | Est. Rows | Description |
| :--- | :--- | :--- | :--- |
| `staging` | Staging | ~250,000 | Raw API records (`NVARCHAR`) |
| `dim_vehicle` | Dimension | ~150,000 | Unique vehicles by VIN prefix (`vin_1_10`) |
| `dim_location` | Dimension | ~1,500 | County / city / ZIP combinations |
| `dim_utility` | Dimension | ~60 | Electric utility companies |
| `dim_model_year` | Dimension | ~30 | Model years |
| `fact_ev_registration` | Fact | ~250,000 | One row per registration |

### Indexes

| Table | Index | Columns |
| :--- | :--- | :--- |
| `dim_vehicle` | `IX_dim_vehicle_make` | `make, model_year` |
| `dim_vehicle` | `IX_dim_vehicle_year` | `model_year` |
| `dim_location` | `IX_dim_location_county` | `county` |
| `fact_ev_registration` | `IX_fact_vehicle` | `vehicle_key` |
| `fact_ev_registration` | `IX_fact_location` | `location_key` |
| `fact_ev_registration` | `IX_fact_model_year` | `model_year_key` |

---

## 10. Security Model

| Control | Implementation |
| :--- | :--- |
| **Transport encryption** | `Encrypt=yes` on all SQL connections |
| **Read-only SQL user** | `ev_readonly` with `db_datareader` role only |
| **Explicit deny** | `DENY INSERT, UPDATE, DELETE, EXEC TO ev_readonly` |
| **Query allowlist** | API rejects queries not starting with `SELECT`/`WITH` |
| **Keyword blocklist** | Regex blocks `INSERT`, `UPDATE`, `DELETE`, `DROP`, etc. |
| **Query timeout** | 30 seconds enforced server-side |
| **Row cap** | 1,000 rows max per response |
| **Credential storage** | Azure Function App Settings (never in code) |
| **CORS** | Restricted to `https://azure-sql-ev.techcloudup.com` |
| **Response headers** | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` |

> **Defense-in-depth note**: DB-level controls (`ev_readonly` + `DENY`) are the primary read-only enforcement. The API-layer allowlist/blocklist are fail-fast checks, not the security boundary — obfuscated SQL can bypass string matching.

---

## 11. Success Metrics

| Metric | Target | Measurement |
| :--- | :--- | :--- |
| Ingestion success rate | ≥ 99% | Function logs |
| Query API uptime | ≥ 99% (best-effort) | Application Insights |
| Median query response | ≤ 1 second | API logs (`elapsedMs`) |
| Monthly Azure cost | $0 | Azure Cost Management |
| Free-tier utilization | ≤ 80% of vCore seconds | Azure Portal metrics |
| Documentation completeness | PRD + README + ERD + SQL | GitHub repo |
| Custom domain SSL | Active | Browser padlock |

---

## 12. Milestones

| Phase | Deliverable | Duration |
| :--- | :--- | :--- |
| P1 | Repo created, folder structure, PRD/README | Day 1 |
| P2 | Azure SQL DB provisioned, schema + read-only user | Day 2 |
| P3 | Ingestion Function ingests EV data successfully | Day 3 |
| P4 | Query API Function deployed and tested | Day 4 |
| P5 | React SQL editor deployed to Static Web Apps | Day 5 |
| P6 | Custom domain + SSL active | Day 6 |
| P7 | Documentation, screenshots, GitHub push | Day 7 |

---

## 13. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
| :--- | :--- | :--- | :--- |
| API rate limiting (Socrata) | Medium | Medium | Use `$limit=50000`, run daily |
| Azure free-tier exhaustion | Low | High | Enable auto-pause, monitor "Free amount remaining" |
| Read-only bypass via malicious SQL | Medium | High | DB role (`ev_readonly` + `DENY`) is the primary control; allowlist/blocklist are defense-in-depth |
| Denial-of-service via expensive queries | Medium | High | 30s timeout + row cap + read-only user |
| Custom domain SSL delay | Low | Low | Azure auto-provisions SSL within 24h |
| Auto-pause not triggering | Medium | Low | Close all query editor sessions after use |
| Schema drift in source API | Low | Medium | `staging` uses `NVARCHAR`; use `TRY_CAST` |

---

## 14. Future Enhancements

- Add multi-state EV data (California, New York)
- Implement incremental loading with `MERGE` on `vin_1_10`
- Add Grafana Cloud for visual analytics (parallel to SQL test UI)
- Build a query cost estimator (estimated rows read)
- Add query plan visualization (`SET SHOWPLAN_XML`)
- Implement optional Azure Entra ID authentication
- Add dbt for transformation layer
- CI/CD with GitHub Actions

---

## 15. Appendix

### A. Source Data

- **Dataset**: Washington State Electric Vehicle Population Data
- **API**: `https://data.wa.gov/resource/f6w7-q2d2.json`
- **License**: Public domain (Washington State DOL)

### B. Glossary

| Term | Definition |
| :--- | :--- |
| **SODA** | Socrata Open Data API |
| **BEV** | Battery Electric Vehicle |
| **PHEV** | Plug-in Hybrid Electric Vehicle |
| **Star Schema** | Dimensional model with fact and dimension tables |
| **vCore second** | Azure SQL serverless compute unit |
| **Auto-pause** | Serverless SQL feature that pauses compute when idle |

---
