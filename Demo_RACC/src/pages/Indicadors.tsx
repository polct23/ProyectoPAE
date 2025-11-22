// ...existing code...
import React, { useMemo, useState } from 'react';
import './Indicadors.css';
import MetricCard from '../components/MetricCard';

type Road = { id: string; name: string; comarca: string; avgTraffic: number; peakHour: string };

const COMARQUES = ['Totes', 'Barcelonès', 'Girona', 'Tarragonès', 'Camp de Tarragona', 'Alt Penedès'];

const ROADS: Road[] = [
  { id: 'R1', name: 'Ronda Litoral (B-10)', comarca: 'Barcelonès', avgTraffic: 9200, peakHour: '08:30' },
  { id: 'R2', name: 'C-32', comarca: 'Barcelonès', avgTraffic: 7500, peakHour: '17:15' },
  { id: 'R3', name: 'AP-7 (Tarragona)', comarca: 'Tarragonès', avgTraffic: 6100, peakHour: '09:00' },
  { id: 'R4', name: 'N-340', comarca: 'Camp de Tarragona', avgTraffic: 4800, peakHour: '16:30' },
  { id: 'R5', name: 'GI-20', comarca: 'Girona', avgTraffic: 3200, peakHour: '08:00' },
  { id: 'R6', name: 'C-31', comarca: 'Barcelonès', avgTraffic: 5400, peakHour: '18:00' },
];

const Indicadors: React.FC = () => {
  const [selectedComarca, setSelectedComarca] = useState<string>('Totes');

  const filtered = useMemo(() => {
    return ROADS
      .filter(r => selectedComarca === 'Totes' ? true : r.comarca === selectedComarca)
      .sort((a, b) => b.avgTraffic - a.avgTraffic);
  }, [selectedComarca]);

  const topTotal = ROADS.slice().sort((a,b)=>b.avgTraffic-a.avgTraffic)[0];

  return (
    <div className="page-indicadors">
      <div className="cards-row">
        <MetricCard title="Retencions (est.)" value="142" />
        <MetricCard title="Accidents avui" value="9" />
        <MetricCard title="Carretera més transitada" value={topTotal ? topTotal.name : '—'} />
      </div>

      <div className="filter-row">
        <label>
          Comarca:
          <select value={selectedComarca} onChange={e => setSelectedComarca(e.target.value)}>
            {COMARQUES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>

      <div className="roads-table">
        <table>
          <thead>
            <tr>
              <th>Carretera</th>
              <th>Comarca</th>
              <th>Mitjana vehicles/dia</th>
              <th>Hora punta</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.comarca}</td>
                <td>{r.avgTraffic.toLocaleString()}</td>
                <td>{r.peakHour}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Indicadors;
// ...existing code...