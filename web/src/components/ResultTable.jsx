import { useMemo, useState } from "react";

function isNumericColumn(rows, index) {
  for (const row of rows) {
    const v = row[index];
    if (v !== null && v !== undefined && typeof v !== "number") return false;
  }
  return true;
}

function formatValue(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return value.toLocaleString("en-US");
  return String(value);
}

function execTimeClass(ms) {
  if (ms < 100) return "fast";
  if (ms < 1000) return "mid";
  return "slow";
}

export default function ResultTable({ result }) {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const numericCols = useMemo(() => {
    if (!result || !result.rows) return [];
    return result.columns.map((_, i) => isNumericColumn(result.rows, i));
  }, [result]);

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
        <span className={`exec-time ${execTimeClass(result.elapsedMs)}`}>
          {result.elapsedMs} ms
        </span>
        {result.truncated && (
          <span className="truncated-banner">truncated to 1000 rows</span>
        )}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {result.columns.map((col, i) => (
                <th
                  key={i}
                  className={numericCols[i] ? "num" : ""}
                  onClick={() => toggleSort(i)}
                >
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
                  <td
                    key={ci}
                    className={
                      (numericCols[ci] ? "num " : "") +
                      (cell === null ? "null-cell" : "")
                    }
                  >
                    {formatValue(cell)}
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
