const SECTIONS = [
  {
    title: "Architecture",
    items: [
      ["Frontend", "Azure Static Web Apps — React 18 + Vite"],
      ["API", "Azure Functions (Consumption, Python 3.11) — pymssql"],
      ["Database", "Azure SQL Database (free offer, serverless) — West US 3"],
      ["IaC / CI-CD", "Terraform + GitHub Actions (OIDC)"],
    ],
  },
  {
    title: "Data model (star schema)",
    items: [
      ["staging", "294,193 raw Socrata rows (NVARCHAR)"],
      ["dim_vehicle", "18,068 — unique by VIN prefix"],
      ["dim_location", "1,520 — county/city/state/postal"],
      ["dim_utility", "78 — electric utilities"],
      ["dim_model_year", "23 — model years"],
      ["fact_ev_registration", "294,193 — one row per registration"],
    ],
  },
  {
    title: "Security (defense in depth)",
    items: [
      ["Read-only role", "ev_readonly — db_datareader + DENY write/exec"],
      ["Query guard", "SELECT/WITH allowlist + DDL/DML keyword blocklist"],
      ["Limits", "30 s timeout · 1,000-row cap · Encrypt on all connections"],
    ],
  },
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
          electric-vehicle registration data — built as a DBA portfolio project,
          served at $0/month entirely within Azure free tiers.
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
          <h3>Cost</h3>
          <p className="about-copy">
            Azure SQL Database free offer (100,000 vCore-s/month) · Azure
            Functions free grant (1M executions) · Static Web Apps Free tier.
            Auto-pause keeps the serverless database at zero compute when idle.
          </p>
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
