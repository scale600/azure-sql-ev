const SECTIONS = [
  {
    title: "Architecture",
    items: [
      ["Frontend", "Azure Static Web Apps — React 18 + Vite"],
      ["API", "Azure Functions (Consumption, Python 3.11) — pymssql"],
      ["Database", "Azure SQL Database (free offer, serverless) — West US 3"],
      ["IaC", "Terraform (azurerm + azapi), remote state in Azure Storage"],
      ["CI/CD", "GitHub Actions — 3 workflows, OIDC auth (no secrets)"],
    ],
  },
  {
    title: "Ingestion pipeline",
    items: [
      ["Schedule", "Daily 06:00 UTC (TimerTrigger)"],
      ["Source", "data.wa.gov Socrata API — $limit/$offset pagination"],
      ["Load", "~294K rows bulk-loaded into staging (NVARCHAR, TRY_CAST-safe)"],
      ["Transform", "staging → 4 dimensions → fact (natural-key joins)"],
    ],
  },
  {
    title: "Data model (star schema)",
    items: [
      ["staging", "294,193 raw Socrata rows (NVARCHAR)"],
      ["dim_vehicle", "18,068 — unique by VIN prefix"],
      ["dim_location", "1,520 — county / city / state / postal"],
      ["dim_utility", "78 — electric utility companies"],
      ["dim_model_year", "23 — model years"],
      ["fact_ev_registration", "294,193 — one row per registration"],
    ],
  },
  {
    title: "Security (defense in depth)",
    items: [
      ["DB role (primary)", "ev_readonly — db_datareader + DENY write/exec"],
      ["Query guard", "SELECT/WITH allowlist + DDL/DML keyword blocklist"],
      ["Least privilege", "query/schema APIs → ev_readonly · ingestion → evadmin"],
      ["Limits", "30 s timeout · 1,000-row cap · Encrypt on all connections"],
    ],
  },
  {
    title: "Cost ($0/month)",
    items: [
      ["Azure SQL", "free offer (100K vCore-s/mo, 32 GB) — using ~3%"],
      ["Azure Functions", "consumption — 1M executions/mo free grant"],
      ["Static Web Apps", "Free tier — 100 GB bandwidth"],
      ["Idle", "auto-pause keeps the serverless DB at zero compute"],
    ],
  },
];

const STACK = [
  "React 18",
  "Vite 5",
  "CodeMirror 6",
  "Python 3.11",
  "pymssql",
  "Azure Functions",
  "Azure SQL",
  "Terraform",
  "GitHub Actions",
  "T-SQL",
];

export default function About({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2>About azure-sql-ev</h2>
        <p className="about-lede">
          An interactive, read-only SQL query dashboard over Washington State
          electric-vehicle registration data. It ingests a public Socrata
          dataset into an Azure SQL star schema and exposes a browser-based SQL
          playground through a serverless API — built as a DBA portfolio piece,
          served entirely within Azure free tiers.
        </p>

        {SECTIONS.map((section) => (
          <section key={section.title} className="about-section">
            <h3>{section.title}</h3>
            <dl>
              {section.items.map(([k, v]) => (
                <div className="about-row" key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}

        <section className="about-section">
          <h3>Tech stack</h3>
          <div className="about-chips">
            {STACK.map((item) => (
              <span className="chip" key={item}>
                {item}
              </span>
            ))}
          </div>
        </section>

        <section className="about-section about-links">
          <a
            href="https://github.com/scale600/azure-sql-ev"
            target="_blank"
            rel="noreferrer"
          >
            GitHub repository
          </a>
          <a
            href="https://data.wa.gov/Vehicles-and-Travel/Electric-Vehicle-Population-Data/f6w7-q2d2"
            target="_blank"
            rel="noreferrer"
          >
            Source data (data.wa.gov)
          </a>
        </section>
      </div>
    </div>
  );
}
