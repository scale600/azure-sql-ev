import { useEffect, useState } from "react";

const KEY = "azure-sql-ev.history";
const MAX = 20;

export default function QueryHistory({ onLoad }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    try {
      setHistory(JSON.parse(localStorage.getItem(KEY) || "[]"));
    } catch {
      setHistory([]);
    }
  }, []);

  return (
    <div className="panel">
      <h3>History</h3>
      <ul className="item-list">
        {history.map((h, i) => (
          <li key={i}>
            <button className="item-btn" onClick={() => onLoad(h)}>
              {h.length > 60 ? h.slice(0, 60) + "…" : h}
            </button>
          </li>
        ))}
        {history.length === 0 && <li className="muted">No queries yet.</li>}
      </ul>
    </div>
  );
}

export function pushHistory(query) {
  try {
    const prev = JSON.parse(localStorage.getItem(KEY) || "[]");
    const next = [query, ...prev.filter((q) => q !== query)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
