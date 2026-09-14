import { useEffect, useState } from "react";
import { runQuery, getSchema } from "./api/client.js";
import QueryEditor from "./components/QueryEditor.jsx";
import ResultTable from "./components/ResultTable.jsx";
import SavedQueries from "./components/SavedQueries.jsx";
import QueryHistory, { pushHistory } from "./components/QueryHistory.jsx";
import About from "./components/About.jsx";

const SAMPLE_QUERIES = [
  {
    name: "Top 10 EV makes",
    query:
      "SELECT TOP 10 v.make, COUNT(*) AS registrations FROM fact_ev_registration f JOIN dim_vehicle v ON f.vehicle_key = v.vehicle_key GROUP BY v.make ORDER BY registrations DESC;",
  },
  {
    name: "BEV vs PHEV split",
    query:
      "SELECT v.ev_type, COUNT(*) AS count FROM fact_ev_registration f JOIN dim_vehicle v ON f.vehicle_key = v.vehicle_key GROUP BY v.ev_type;",
  },
  {
    name: "Registrations by county & year",
    query:
      "SELECT l.county, y.model_year, COUNT(*) AS registrations FROM fact_ev_registration f JOIN dim_location l ON f.location_key = l.location_key JOIN dim_model_year y ON f.model_year_key = y.model_year_key GROUP BY l.county, y.model_year ORDER BY l.county, y.model_year;",
  },
  {
    name: "Avg range by model year",
    query:
      "SELECT y.model_year, AVG(f.electric_range) AS avg_range FROM fact_ev_registration f JOIN dim_model_year y ON f.model_year_key = y.model_year_key WHERE f.electric_range IS NOT NULL GROUP BY y.model_year ORDER BY y.model_year;",
  },
];

export default function App() {
  const [query, setQuery] = useState(SAMPLE_QUERIES[0].query);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [schema, setSchema] = useState([]);
  const [historyKey, setHistoryKey] = useState(0);
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    getSchema()
      .then((data) => setSchema(data.tables || []))
      .catch(() => setSchema([]));
  }, []);

  async function handleRun() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await runQuery(query);
      setResult(data);
      pushHistory(query.trim());
      setHistoryKey((k) => k + 1);
    } catch (e) {
      setResult(null);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function loadQuery(q) {
    setQuery(q);
    setError(null);
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>azure-sql-ev</h1>
        <span className="subtitle">Washington EV registrations — read-only SQL playground</span>
        <button className="about-btn" onClick={() => setShowAbout(true)}>
          About
        </button>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <div className="panel">
            <h3>Sample Queries</h3>
            <ul className="item-list">
              {SAMPLE_QUERIES.map((s, i) => (
                <li key={i}>
                  <button className="item-btn" onClick={() => loadQuery(s.query)}>
                    {s.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="panel">
            <h3>Schema</h3>
            {schema.length === 0 && <p className="muted">Loading schema…</p>}
            {schema.map((table) => (
              <details key={table.name}>
                <summary
                  onClick={() =>
                    loadQuery(`SELECT TOP 100 * FROM ${table.name};`)
                  }
                >
                  {table.name}
                </summary>
                <ul className="columns">
                  {table.columns.map((c) => (
                    <li key={c.name}>
                      <span>{c.name}</span>
                      <span className="col-type">{c.type}</span>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>

          <SavedQueries onLoad={loadQuery} />
          <QueryHistory key={historyKey} onLoad={loadQuery} />
        </aside>

        <main className="main">
          <QueryEditor
            query={query}
            onChange={setQuery}
            onRun={handleRun}
            loading={loading}
          />
          {error && <div className="error-banner">{error}</div>}
          {!error && <ResultTable result={result} />}
        </main>
      </div>

      {showAbout && <About onClose={() => setShowAbout(false)} />}
    </div>
  );
}
