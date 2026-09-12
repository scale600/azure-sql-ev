# azure-sql-ev

> An interactive **SQL query test dashboard** built on Azure SQL Database, Azure Functions, and Azure Static Web Apps — powered by real-world Washington State EV registration data.

**Live**: https://azure-sql-ev.techcloudup.com
**Repo**: https://github.com/<username>/azure-sql-ev

---

## ✨ Features

- 🚗 **Real dataset** — ~250,000 EV registrations from Washington State
- 🧪 **Interactive SQL editor** — Run `SELECT` queries directly in the browser
- 🔒 **Read-only by design** — Dedicated `ev_readonly` SQL user with `db_datareader`
- ⚡ **Serverless backend** — Azure Functions (Consumption plan)
- 🌐 **Custom domain + SSL** — `azure-sql-ev.techcloudup.com`
- 📊 **Star schema** — `staging` + 4 dimensions + 1 fact table
- 💰 **$0/month** — Fully within Azure free tiers
- 📱 **Responsive UI** — React + Vite

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Browser                                                     │
│  https://azure-sql-ev.techcloudup.com                        │
└──────────────────────┬───────────────────────────────────────┘
                       │ HTTPS
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  Azure Static Web Apps (Free)                                │
│  React + Vite frontend · custom domain · auto SSL            │
└──────────────────────┬───────────────────────────────────────┘
                       │ /api/*
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  Azure Functions (Consumption, Free)                         │
│  POST /api/query · GET /api/schema · TimerTrigger ingestion  │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  Azure SQL Database (Free Offer, Serverless)                 │
│  Read-only user · star schema · auto-pause                   │
└──────────────────────────────────────────────────────────────┘
```

---

## 🧰 Tech Stack

| Layer | Technology | Cost |
| :--- | :--- | :--- |
| Frontend | React 18 + Vite | Free |
| Hosting | Azure Static Web Apps | Free tier |
| API | Azure Functions (Python 3.11) | Free tier |
| Database | Azure SQL Database (Serverless) | Free offer |
| Data Source | Socrata Open Data API | Free |
| DNS / SSL | Azure Static Web Apps Custom Domain | Free |
| Version Control | GitHub | Free |

---

## 📁 Project Structure

```
azure-sql-ev/
├── README.md
├── PRD.md
├── LICENSE
├── .gitignore
│
├── docs/
│   ├── architecture.md
│   ├── erd.md
│   ├── dns-setup.md
│   └── screenshots/
│       ├── dashboard-overview.png
│       └── query-result.png
│
├── sql/
│   ├── 01-create-tables.sql
│   ├── 02-create-indexes.sql
│   ├── 03-etl-dimensions.sql
│   ├── 04-etl-fact.sql
│   ├── 05-sample-queries.sql
│   └── 06-readonly-user.sql
│
├── functions/
│   ├── host.json
│   ├── requirements.txt
│   ├── local.settings.json.example
│   ├── EvIngestion/
│   │   ├── __init__.py
│   │   └── function.json
│   └── SqlQueryApi/
│       ├── __init__.py
│       └── function.json
│
├── web/
│   ├── package.json
│   ├── index.html
│   ├── vite.config.js
│   ├── staticwebapp.config.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api/client.js
│       └── components/
│           ├── QueryEditor.jsx
│           ├── ResultTable.jsx
│           ├── SavedQueries.jsx
│           └── QueryHistory.jsx
│
└── scripts/
    ├── load-csv.ps1
    ├── deploy-functions.sh
    └── deploy-web.sh
```

---

## ✅ Prerequisites

- Azure subscription with a payment method (the SQL Database free offer applies even after 12-month free credits expire)
- GitHub account
- Python 3.11+
- Node.js 20+
- Azure Functions Core Tools v4
- Azure CLI
- ODBC Driver 18 for SQL Server
- A domain (`techcloudup.com`) with DNS access

---

## 🚀 Setup

### 1. Clone the Repository

```bash
git clone https://github.com/<username>/azure-sql-ev.git
cd azure-sql-ev
```

### 2. Provision Azure SQL Database (Free Offer)

1. Navigate to https://aka.ms/azuresqlhub
2. Click **Start free**
3. Select **Serverless**, **General Purpose**
4. Set **Behavior when free limit reached** → `Auto-pause the database until next month`
5. Create the database

### 3. Create Schema and Read-Only User

Run the scripts in `sql/` in order via Azure Portal → Query Editor:

```sql
-- 01-create-tables.sql
-- 02-create-indexes.sql
-- 06-readonly-user.sql
```

The read-only user setup:

```sql
CREATE LOGIN ev_readonly WITH PASSWORD = '<strong-password>';
USE EVPopulationDB;
CREATE USER ev_readonly FOR LOGIN ev_readonly;
ALTER ROLE db_datareader ADD MEMBER ev_readonly;
DENY INSERT, UPDATE, DELETE, EXEC TO ev_readonly;
```

### 4. Configure Local Settings

```bash
cd functions
cp local.settings.json.example local.settings.json
```

Edit `local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "<connection-string>",
    "FUNCTIONS_WORKER_RUNTIME": "python",
    "SQL_SERVER": "<server>.database.windows.net",
    "SQL_DB": "EVPopulationDB",
    "SQL_READONLY_USER": "ev_readonly",
    "SQL_READONLY_PWD": "<password>",
    "SQL_ADMIN_USER": "<admin>",
    "SQL_ADMIN_PWD": "<admin-password>"
  }
}
```

### 5. Deploy Azure Functions

```bash
func azure functionapp publish <your-function-app-name>
```

### 6. Deploy Frontend to Azure Static Web Apps

```bash
az staticwebapp create \
  --name azure-sql-ev-web \
  --resource-group rg-azure-sql-ev \
  --source https://github.com/<username>/azure-sql-ev \
  --location "eastasia" \
  --branch main \
  --app-location "web" \
  --api-location "functions" \
  --output-location "dist" \
  --login-with-github
```

### 7. Configure Custom Domain

In Azure Portal → Static Web App → **Custom domains** → **Add**:

| Field | Value |
| :--- | :--- |
| Domain | `azure-sql-ev.techcloudup.com` |
| Validation | CNAME |

Add this DNS record in your `techcloudup.com` DNS console:

| Type | Name | Value | TTL |
| :--- | :--- | :--- | :--- |
| CNAME | `azure-sql-ev` | `<app>.azurestaticapps.net` | 3600 |

Azure auto-provisions SSL within 24 hours.

### 8. Load Initial Data

Trigger the ingestion function manually:

```bash
# Via Azure Portal: Functions → EvIngestion → Code + Test → Run
# Or wait for the daily TimerTrigger (06:00 UTC)
```

---

## 🧪 Sample Queries

Try these in the dashboard.

### Raw `staging` queries

The `staging` table holds raw API records (`NVARCHAR` columns) — handy for quick exploration and for demonstrating `TRY_CAST` hardening.

```sql
-- Top 10 EV makes
SELECT TOP 10 make, COUNT(*) AS registrations
FROM staging
GROUP BY make
ORDER BY registrations DESC;

-- Yearly registration trend
SELECT model_year, COUNT(*) AS registrations
FROM staging
GROUP BY model_year
ORDER BY model_year;

-- Average electric range by model year
SELECT model_year, AVG(TRY_CAST(electric_range AS FLOAT)) AS avg_range
FROM staging
WHERE electric_range IS NOT NULL
GROUP BY model_year
ORDER BY model_year;

-- BEV vs PHEV split
SELECT ev_type, COUNT(*) AS count
FROM staging
GROUP BY ev_type;

-- Top counties by BEV count
SELECT TOP 10 county, COUNT(*) AS bev_count
FROM staging
WHERE ev_type LIKE '%BEV%'
GROUP BY county
ORDER BY bev_count DESC;
```

### Star schema queries

The star schema (`fact_ev_registration` + dimensions) is the intended query surface — join the fact table to dimensions for analytical questions.

```sql
-- Top 10 EV makes (fact + dim_vehicle)
SELECT TOP 10 v.make, COUNT(*) AS registrations
FROM fact_ev_registration f
JOIN dim_vehicle v ON f.vehicle_key = v.vehicle_key
GROUP BY v.make
ORDER BY registrations DESC;

-- Registrations by county and model year (fact + dim_location + dim_model_year)
SELECT l.county, y.model_year, COUNT(*) AS registrations
FROM fact_ev_registration f
JOIN dim_location l ON f.location_key = l.location_key
JOIN dim_model_year y ON f.model_year_key = y.model_year_key
GROUP BY l.county, y.model_year
ORDER BY l.county, y.model_year;

-- BEV vs PHEV split (fact + dim_vehicle)
SELECT v.ev_type, COUNT(*) AS count
FROM fact_ev_registration f
JOIN dim_vehicle v ON f.vehicle_key = v.vehicle_key
GROUP BY v.ev_type;
```

---

## 🔒 Security

| Control | Description |
| :--- | :--- |
| **Read-only SQL user** | `ev_readonly` with `db_datareader` only |
| **Explicit deny** | `DENY INSERT, UPDATE, DELETE, EXEC` |
| **Query allowlist** | Only `SELECT` / `WITH` allowed |
| **Keyword blocklist** | Blocks DDL/DML keywords at API layer |
| **Timeout** | 30-second server-side limit |
| **Row cap** | 1,000 rows max per response |
| **Encryption** | `Encrypt=yes` on all connections |
| **CORS** | Restricted to `https://azure-sql-ev.techcloudup.com` |

> ⚠️ **Never commit** `local.settings.json` or any file containing credentials. `.gitignore` excludes them.

---

## 💰 Cost Breakdown

| Service | Free Tier | Estimated Usage | Monthly Cost |
| :--- | :--- | :--- | :--- |
| Azure SQL Database | 100,000 vCore sec, 32GB | ~5,000 vCore sec | **$0** |
| Azure Functions | 1M executions, 400K GB-sec | ~30 executions, 7,200 GB-sec | **$0** |
| Azure Static Web Apps | 100GB bandwidth, free SSL | < 1GB | **$0** |
| **Total** | | | **$0** |

---

## 🛠️ Troubleshooting

| Issue | Cause | Fix |
| :--- | :--- | :--- |
| Function can't connect to SQL | Firewall | Enable "Allow Azure services" in SQL firewall |
| Auto-pause not triggering | Open query editor session | Close all SSMS/VS Code connections |
| Custom domain shows 404 | DNS not propagated | Wait 24h; verify CNAME with `nslookup` |
| SSL not active | Azure still provisioning | Wait up to 24h after DNS validation |
| Query returns `403` | Blocked keyword or non-SELECT | Check allowlist/blocklist rules |
| Query times out | Expensive query | Add `TOP`, indexes, or narrow the filter |

---

## 📚 References

- [Azure SQL Database Free Offer](https://learn.microsoft.com/azure/azure-sql/database/free-offer)
- [Azure Functions Python Developer Guide](https://learn.microsoft.com/azure/azure-functions/functions-reference-python)
- [Azure Static Web Apps Custom Domains](https://learn.microsoft.com/azure/static-web-apps/custom-domain)
- [Socrata SODA API](https://dev.socrata.com/)
- [Washington EV Population Data](https://data.wa.gov/Vehicles-and-Travel/Electric-Vehicle-Population-Data/f6w7-q2d2)

---

## 📝 License

MIT License — see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Washington State Department of Licensing — open EV data
- Microsoft Azure — free-tier services
- Socrata — open data API platform

---

**Built as a DBA portfolio project.** Issues, forks, and pull requests are welcome.