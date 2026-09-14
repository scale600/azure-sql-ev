const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://func-ev-37851cd1.azurewebsites.net/api";

export async function runQuery(query) {
  const res = await fetch(`${API_BASE}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export async function getSchema() {
  const res = await fetch(`${API_BASE}/schema`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}
