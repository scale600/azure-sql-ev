import { useEffect, useState } from "react";

const KEY = "azure-sql-ev.saved";

export default function SavedQueries({ onLoad }) {
  const [saved, setSaved] = useState([]);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    try {
      setSaved(JSON.parse(localStorage.getItem(KEY) || "[]"));
    } catch {
      setSaved([]);
    }
  }, []);

  function persist(next) {
    setSaved(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }

  function save() {
    if (!name.trim() || !query.trim()) return;
    persist([...saved, { name: name.trim(), query: query.trim() }]);
    setName("");
  }

  function remove(index) {
    persist(saved.filter((_, i) => i !== index));
  }

  return (
    <div className="panel">
      <h3>Saved Queries</h3>
      <div className="save-row">
        <input
          placeholder="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          placeholder="query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button onClick={save} disabled={!name.trim() || !query.trim()}>
          Save
        </button>
      </div>
      <ul className="item-list">
        {saved.map((s, i) => (
          <li key={i}>
            <button className="item-btn" onClick={() => onLoad(s.query)}>
              {s.name}
            </button>
            <button className="delete-btn" onClick={() => remove(i)}>
              ×
            </button>
          </li>
        ))}
        {saved.length === 0 && <li className="muted">None saved yet.</li>}
      </ul>
    </div>
  );
}
