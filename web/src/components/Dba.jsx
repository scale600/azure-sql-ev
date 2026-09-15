const SECTIONS = [
  {
    title: "1. Infrastructure & Provisioning",
    lead:
      "A star schema is built on the Azure SQL Database free offer (serverless). The offer's use_free_limit flag is not exposed by the azurerm provider, so it is provisioned via azapi_resource.",
    rows: [
      ["SQL Server", "sql-ev-37851cd1.database.windows.net — West US 3"],
      ["Database", "EVPopulationDB — serverless · General Purpose · auto-pause"],
      ["Compute", "100,000 vCore-s/month free (currently ~3% usage)"],
      ["Storage", "32 GB free (data + log + backup)"],
      ["Firewall", "AllowAllWindowsAzureIps + 2 dev client IPs"],
    ],
    code: `# free offer is only controllable via azapi_resource, not azurerm
resource "azapi_resource" "sql_db" {
  type = "Microsoft.Sql/servers/databases@2025-02-01-preview"
  name = "EVPopulationDB"
  body = {
    location = "westus3"
    sku = { name = "GP_S_Gen5", tier = "GeneralPurpose" }
    properties = {
      useFreeLimit       = true
      freeLimitExhaustionBehavior = "AutoPause"
      maxSizeBytes       = 34359738368   # 32 GB
      zoneRedundant      = false
    }
  }
  lifecycle { ignore_changes = [body.properties.maxSizeBytes] }
}`,
  },
  {
    title: "2. Schema Design (Star Schema)",
    lead:
      "Raw Socrata records are loaded into staging entirely as NVARCHAR to isolate TRY_CAST failures, then normalized into dimension and fact tables. Dimension keys use IDENTITY surrogate keys joined via natural keys.",
    rows: [
      ["staging", "294,193 rows — raw columns all NVARCHAR (TRY_CAST safety net)"],
      ["dim_vehicle", "18,068 rows — make / model / ev_type / cafv_eligibility"],
      ["dim_location", "1,520 rows — county / city / state / postal_code"],
      ["dim_utility", "78 rows — electric utility companies"],
      ["dim_model_year", "23 rows — model years"],
      ["fact_ev_registration", "294,193 rows — one row per registration + 4 foreign keys"],
    ],
    note:
      "census_tract is deliberately excluded from dim_location — it caused duplicate matches during fact joins and inflated the fact row count.",
    code: `CREATE TABLE dbo.fact_ev_registration (
  registration_key BIGINT IDENTITY(1,1) PRIMARY KEY,
  vehicle_key     INT  NOT NULL REFERENCES dim_vehicle(vehicle_key),
  location_key    INT  NOT NULL REFERENCES dim_location(location_key),
  utility_key     INT  NOT NULL REFERENCES dim_utility(utility_key),
  model_year_key  INT  NOT NULL REFERENCES dim_model_year(model_year_key),
  electric_range  INT      NULL,
  base_msrp       INT      NULL,
  registration_count INT   NOT NULL DEFAULT 1
);`,
  },
  {
    title: "3. Indexes & Performance",
    lead:
      "At 294K rows the workload completes in seconds even without indexes, but foreign-key and covering indexes were added to demonstrate analytical (dimension-join) query tuning.",
    rows: [
      ["Clustered PK", "IDENTITY surrogate-key clustered index on every table"],
      ["FK indexes", "Nonclustered indexes on fact's 4 foreign-key columns"],
      ["Covering index", "dim_vehicle(make, ev_type) INCLUDE (model)"],
      ["Measured", "Top 10 make query ~150ms (cold) / ~40ms (warm)"],
    ],
    code: `CREATE INDEX IX_fact_vehicle  ON fact_ev_registration(vehicle_key);
CREATE INDEX IX_fact_location ON fact_ev_registration(location_key);
CREATE INDEX IX_fact_utility  ON fact_ev_registration(utility_key);
CREATE INDEX IX_fact_year     ON fact_ev_registration(model_year_key);
CREATE INDEX IX_vehicle_make  ON dim_vehicle(make, ev_type) INCLUDE (model);`,
  },
  {
    title: "4. Security (Least Privilege)",
    lead:
      "Accounts are separated by role: ingestion uses evadmin (write), the query API uses read-only ev_readonly. Logins must be created in master.",
    rows: [
      ["evadmin", "db_owner — ingestion/ETL only (never exposed to clients)"],
      ["ev_readonly", "db_datareader + DENY INSERT/UPDATE/DELETE/EXEC"],
      ["Query guard", "SELECT/WITH allowlist + DDL/DML keyword blocklist"],
      ["Connection", "Encrypt=yes · 30s timeout · 1,000-row response cap"],
    ],
    note:
      "Running CREATE LOGIN in a user database raises 40515 (cannot reference master.sys.sql_logins cross-DB) or 5001 (CREATE LOGIN must be in master). Always create the LOGIN in the master context, then map a USER in the user database.",
    code: `-- master context
CREATE LOGIN ev_readonly
  WITH PASSWORD = '<strong-password>', CHECK_POLICY = ON;

-- user database context
CREATE USER ev_readonly FOR LOGIN ev_readonly;
ALTER ROLE db_datareader ADD MEMBER ev_readonly;
DENY INSERT, UPDATE, DELETE, EXEC TO ev_readonly;`,
  },
  {
    title: "5. Data Ingestion & ETL",
    lead:
      "The full dataset is read from the Socrata SODA API using $limit/$offset pagination, bulk-loaded into staging, then dimensions are populated via natural-key joins before the fact table is built.",
    rows: [
      ["Source", "data.wa.gov Electric Vehicle Population Data (Socrata)"],
      ["Pagination", "$limit/$offset (SODA API standard)"],
      ["Field mapping", "zip_code→postal_code · cafv_type→cafv_eligibility · _2020_census_tract→census_tract"],
      ["Measured", "fetch ~40s + insert ~49s + ETL ~43s ≈ 132s"],
      ["Integrity", "staging rows == fact rows (294,193, no duplicates)"],
    ],
    note:
      "The dataset has no base_msrp column. Field names that differ from the source schema (zip_code→postal_code, etc.) were remapped to match the actual SODA response.",
    code: `INSERT INTO dim_vehicle (vin_prefix, make, model, model_year, ev_type, cafv_eligibility)
SELECT DISTINCT
  LEFT(VIN, 10), make, model,
  TRY_CAST(model_year AS INT),
  ev_type, cafv_type
FROM staging
WHERE VIN IS NOT NULL;`,
  },
  {
    title: "6. Operations",
    lead:
      "The free offer auto-pauses the database when idle; resuming takes 30–60s. The application layer absorbs this.",
    rows: [
      ["auto-pause", "Pauses when idle → first query returns 40613"],
      ["Reconnect", "3 retries · 15s interval · login_timeout=60"],
      ["Monitoring", "vCore-s/storage usage vs free limit in the portal"],
      ["Backup", "7-day automated backups within the 32 GB free storage"],
    ],
    code: `# db.py — connection retry that absorbs auto-pause resume
def get_connection(readonly=True):
    for attempt in range(3):
        try:
            return pymssql.connect(
                server=SQL_SERVER, user=user, password=pwd,
                database=SQL_DB, login_timeout=60, timeout=30)
        except pymssql.OperationalError as e:
            if "not currently available" in str(e) and attempt < 2:
                time.sleep(15)   # 40613: waiting for auto-pause resume
                continue
            raise`,
  },
  {
    title: "7. IaC & Deployment (Terraform + CI/CD)",
    lead:
      "All resources are managed with Terraform and deployed via GitHub Actions (OIDC, no secrets). Function-app app_settings must be managed in Terraform.",
    rows: [
      ["Remote state", "Azure Storage (stev37851cd1/tfstate)"],
      ["OIDC", "GitHub App (0a875070) — no service-principal secret"],
      ["app_settings", "SQL_* connection info defined in TF (az CLI values are lost on apply)"],
      ["CORS", "Custom domain + localhost only"],
    ],
    note:
      "Setting function-app app_settings via the az CLI is wiped when Terraform manages the function app. SQL connection info is therefore defined in the app_settings block of terraform/main.tf.",
  },
  {
    title: "8. Troubleshooting (by error code)",
    rows: [
      ["40613", "DB resuming from auto-pause → absorbed by retry (15s)"],
      ["40515", "Cannot reference master.sys.sql_logins cross-DB → create LOGIN in master"],
      ["5001", "CREATE LOGIN location error → move to master context"],
      ["Login timeout", "pymssql uses the login_timeout keyword (not Connection Timeout)"],
      ["Firewall block", "Allow Azure services + add dev IP to firewall rules"],
    ],
  },
];

export default function Dba({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2>DBA Guide — Provisioning · Management · Operations</h2>
        <p className="about-lede">
          An operations guide to azure-sql-ev's database, written from a DBA
          perspective. It builds a star schema on the free offer (serverless)
          and covers production-grade patterns from least-privilege accounts to
          auto-pause handling.
        </p>

        {SECTIONS.map((section) => (
          <section key={section.title} className="about-section">
            <h3>{section.title}</h3>
            {section.lead && <p className="about-copy">{section.lead}</p>}
            {section.rows && (
              <dl>
                {section.rows.map(([k, v]) => (
                  <div className="about-row" key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            {section.code && <pre className="dba-code">{section.code}</pre>}
            {section.note && <div className="dba-note">{section.note}</div>}
          </section>
        ))}
      </div>
    </div>
  );
}
