// ...existing code...
import React from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './Charts.css';

type Series = { label: string; data: number[] };
type TrendChartProps = { series?: Series[]; widthPercent?: string; height?: number };
type WeeklyChartProps = { data?: { day: string; incidents: number }[]; height?: number };

const defaultLineData = [
  { month: 'Gen', value: 420 },
  { month: 'Feb', value: 450 },
  { month: 'Mar', value: 380 },
  { month: 'Abr', value: 510 },
  { month: 'Mai', value: 460 },
  { month: 'Jun', value: 550 },
  { month: 'Jul', value: 610 },
  { month: 'Ago', value: 680 },
];

const defaultBarData = [
  { day: 'Mon', incidents: 45 },
  { day: 'Tue', incidents: 52 },
  { day: 'Wed', incidents: 48 },
  { day: 'Thu', incidents: 65 },
  { day: 'Fri', incidents: 82 },
  { day: 'Sat', incidents: 78 },
  { day: 'Sun', incidents: 71 },
];

function seriesToRecharts(series?: Series[]) {
  if (!series || series.length === 0) return defaultLineData;
  const maxLen = Math.max(...series.map(s => s.data.length));
  // build array [{ name: 'T1', 'Retencions': 10, 'Accidents':1 }, ...]
  const result: Record<string, any>[] = [];
  for (let i = 0; i < maxLen; i++) {
    const point: Record<string, any> = { name: `T${i + 1}` };
    series.forEach(s => {
      point[s.label] = s.data[i] ?? 0;
    });
    result.push(point);
  }
  return result;
}

export const TrendChart: React.FC<TrendChartProps> = ({ series, widthPercent = '100%', height = 250 }) => {
  const data = seriesToRecharts(series);

  // if using defaultLineData, map to a single-series shape for compatibility
  const isDefault = data === defaultLineData;

  return (
    <div className="chart-container" style={{ width: widthPercent }}>
      <h3 className="chart-title">Tendència d'incidents</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="name" stroke="#666" />
          <YAxis stroke="#666" />
          <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }} />
          <Legend />
          {isDefault ? (
            <Line
              type="monotone"
              dataKey="value"
              stroke="#4a90e2"
              strokeWidth={3}
              dot={{ fill: '#4a90e2', r: 5 }}
              activeDot={{ r: 7 }}
              name="Incidents"
            />
          ) : (
            // render a Line for each series label
            Object.keys(data[0] || {})
              .filter(k => k !== 'name')
              .map((key, idx) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={['#4a90e2', '#E74C3C', '#2ecc71', '#9b59b6'][idx % 4]}
                  strokeWidth={2}
                  dot={false}
                  name={key}
                />
              ))
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export const WeeklyChart: React.FC<WeeklyChartProps> = ({ data = defaultBarData, height = 250 }) => {
  return (
    <div className="chart-container">
      <h3 className="chart-title">Incidents per dia de la setmana</h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="day" stroke="#666" />
          <YAxis stroke="#666" />
          <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }} />
          <Legend />
          <Bar dataKey="incidents" fill="#82ca9d" name="Incidents" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
// ...existing code...