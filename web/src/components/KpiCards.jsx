const CARDS = [
  { key: "total_registrations", label: "Total Registrations", color: "#4f8cff" },
  { key: "bev_count", label: "Battery Electric (BEV)", color: "#34d399" },
  { key: "phev_count", label: "Plug-in Hybrid (PHEV)", color: "#c792ea" },
  { key: "avg_range", label: "Avg Range (mi)", color: "#f78c6c" },
];

export default function KpiCards({ kpi }) {
  if (!kpi || !kpi.columns || !kpi.rows || kpi.rows.length === 0) return null;

  const row = kpi.rows[0];

  return (
    <div className="kpi-cards">
      {CARDS.map((card) => {
        const index = kpi.columns.indexOf(card.key);
        const value = index >= 0 ? row[index] : null;
        return (
          <div
            className="kpi-card"
            key={card.key}
            style={{ borderTopColor: card.color }}
          >
            <span className="kpi-label">{card.label}</span>
            <span className="kpi-value" style={{ color: card.color }}>
              {value === null || value === undefined
                ? "—"
                : Number(value).toLocaleString("en-US")}
            </span>
          </div>
        );
      })}
    </div>
  );
}
