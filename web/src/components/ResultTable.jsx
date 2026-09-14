import { useMemo, useState } from "react";

function formatCell(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export default function ResultTable({ result }) {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const rows = useMemo(() => {
    if (!result || !result.rows || sortCol === null) return result?.rows ?? [];
    const sorted = [...result.rows].sort((a, b) => {
      const va = a[sortCol];
      const vb = b[sortCol];
      if (va === vb) return 0;
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      if (typeof va === "number" && typeof vb === "number") return va - vb;
      return String(va).localeCompare(String(vb));
    });
    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [result, sortCol, sortDir]);

  if (!result) {
    return <div className="empty-state">Run a query to see results.</div>;
  }

  if (!result.columns || result.columns.length === 0) {
    return (
      <div className="empty-state">
        Query returned no columns. {result.rowCount} row(s) affected.
      </div>
    );
  }

  function toggleSort(col) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  return (
    <div className="results">
      <div className="results-meta">
        <span>{result.rowCount} row(s)</span>
        <span>{result.elapsedMs} ms</span>
        {result.truncated && (
          <span className="truncated-banner">truncated to 1000 rows</span>
        )}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {result.columns.map((col, i) => (
                <th key={i} onClick={() => toggleSort(i)}>
                  {col}
                  {sortCol === i && (sortDir === "asc" ? " ↑" : " ↓")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} className={cell === null ? "null-cell" : ""}>
                    {formatCell(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
