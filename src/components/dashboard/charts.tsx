"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ClassificationDatum = {
  site: string;
  major: number;
  minor: number;
  ofi: number;
  obs: number;
};

export type ComplianceDatum = { site: string; compliance: number | null; completion: number };

export type RiskDatum = { name: string; value: number; color: string };

const AXIS = { fontSize: 12, fill: "#475569" };

export function ClassificationChart({ data }: { data: ClassificationDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="site" tick={AXIS} />
        <YAxis allowDecimals={false} tick={AXIS} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="major" name="Major NC" stackId="c" fill="#dc2626" />
        <Bar dataKey="minor" name="Minor NC" stackId="c" fill="#f97316" />
        <Bar dataKey="ofi" name="OFI" stackId="c" fill="#0284c7" />
        <Bar dataKey="obs" name="OBS" stackId="c" fill="#7c3aed" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ComplianceChart({ data }: { data: ComplianceDatum[] }) {
  const rows = data.map((d) => ({
    site: d.site,
    compliance: d.compliance === null ? 0 : Math.round(d.compliance * 100),
    completion: Math.round(d.completion * 100),
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="site" tick={AXIS} />
        <YAxis domain={[0, 100]} unit="%" tick={AXIS} />
        <Tooltip formatter={(v) => `${v}%`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="compliance" name="Compliance" fill="#059669" />
        <Bar dataKey="completion" name="Checklist completed" fill="#94a3b8" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RiskChart({ data }: { data: RiskDatum[] }) {
  const total = data.reduce((n, d) => n + d.value, 0);
  if (total === 0) {
    return <p className="py-16 text-center text-sm text-slate-500">No classified findings yet.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
