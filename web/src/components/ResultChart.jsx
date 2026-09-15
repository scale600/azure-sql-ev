import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CHART_COLORS = [
  "#c792ea",
  "#4f8cff",
  "#f78c6c",
  "#c3e88d",
  "#89ddff",
  "#ffcb6b",
  "#34d399",
  "#f472b6",
];

export function isChartable(result) {
  if (!result || !result.columns || result.columns.length !== 2) return false;
  if (!result.rows || result.rows.length < 1) return false;
  return result.rows.every(
    (r) => r[1] === null || r[1] === undefined || typeof r[1] === "number"
  );
}

function detectType(result) {
  if (!isChartable(result)) return null;
  const firstNumeric = result.rows.every(
    (r) => r[0] === null || r[0] === undefined || typeof r[0] === "number"
  );
  if (firstNumeric) return "line";
  if (result.rows.length <= 6) return "pie";
  return "bar";
}

export default function ResultChart({ result }) {
  const type = detectType(result);

  if (!type) {
    return (
      <div className="empty-state">
        Not chartable — charts need 2 columns (category + number).
      </div>
    );
  }

  const data = result.rows.map((r) => ({
    name: r[0] === null || r[0] === undefined ? "NULL" : String(r[0]),
    value: r[1],
  }));

  if (type === "pie") {
    return (
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={340}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={104}
              paddingAngle={2}
              label
            >
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#171a23",
                border: "1px solid #262b38",
                borderRadius: 8,
              }}
              labelStyle={{ color: "#e6e8ee" }}
            />
            <Legend wrapperStyle={{ color: "#8b91a0" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === "line") {
    return (
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262b38" />
            <XAxis dataKey="name" stroke="#8b91a0" />
            <YAxis stroke="#8b91a0" />
            <Tooltip
              contentStyle={{
                background: "#171a23",
                border: "1px solid #262b38",
                borderRadius: 8,
              }}
              labelStyle={{ color: "#e6e8ee" }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#4f8cff"
              strokeWidth={2}
              dot={{ r: 3, fill: "#4f8cff" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="chart-wrap">
      <ResponsiveContainer
        width="100%"
        height={Math.max(340, data.length * 42)}
      >
        <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
          <XAxis type="number" stroke="#8b91a0" />
          <YAxis
            type="category"
            dataKey="name"
            width={170}
            stroke="#8b91a0"
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              background: "#171a23",
              border: "1px solid #262b38",
              borderRadius: 8,
            }}
            labelStyle={{ color: "#e6e8ee" }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
