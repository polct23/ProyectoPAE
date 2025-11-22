import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { DATASETS, DatasetMeta } from '../data/datasets';
import './DatasetInsights.css';

const COLORS = ['#4a90e2', '#82ca9d', '#f4d03f', '#c94444', '#9b59b6', '#e67e22', '#2ecc71'];

function aggregateBy<T extends keyof DatasetMeta>(key: T) {
  const map = new Map<string, number>();
  for (const d of DATASETS) {
    const raw = String(d[key]);
    // split formats like "JSON / CSV" into separate entries
    const parts = key === 'format' ? raw.split(/\s*\/\s*|,\s*/g) : [raw];
    for (const p of parts) {
      const k = p.trim();
      if (!k) continue;
      map.set(k, (map.get(k) || 0) + 1);
    }
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}

const formatDist = aggregateBy('format');
const categoryDist = aggregateBy('category');
const coverageDist = aggregateBy('coverage');

const DatasetInsights: React.FC = () => {
  return (
    <div className="insights-grid">
      <div className="insight-card">
        <h3>Formats de dades</h3>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={formatDist} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
              {formatDist.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="insight-card">
        <h3>Categories</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={categoryDist}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#4a90e2" radius={[8,8,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="insight-card">
        <h3>Cobertura geogràfica</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={coverageDist}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#82ca9d" radius={[8,8,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DatasetInsights;
