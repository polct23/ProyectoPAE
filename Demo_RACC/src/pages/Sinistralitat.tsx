import React from 'react';
import './Sinistralitat.css';
import MetricCard from '../components/MetricCard';
import TrafficMap from '../components/TrafficMap';

type Incident = {
  id: number;
  title: string;
  severity: 'Leve' | 'Moderado' | 'Grave';
  time: string;
  location: string;
};

const INCIDENTS: Incident[] = [
  { id: 1, title: 'Accident A-7', severity: 'Grave', time: '09:12', location: 'Tarragona - km 114' },
  { id: 2, title: 'Obres C-31', severity: 'Moderado', time: '08:45', location: 'El Prat' },
  { id: 3, title: 'Retenció B-20', severity: 'Leve', time: '10:05', location: 'L\'Hospitalet' },
];

const Sinistralitat: React.FC = () => {
  return (
    <div className="page-sinistralitat">
      <div className="summary-cards">
        <MetricCard title="Accidents actius" value={String(INCIDENTS.length)} />
        <MetricCard title="Gravetat màxima" value="Grave" />
        <MetricCard title="Zones tallades" value="2" />
      </div>

      <div className="list-and-map">
        <div className="incident-list">
          <h3>Incidents recents</h3>
          <ul>
            {INCIDENTS.map(i => (
              <li key={i.id}>
                <strong>{i.title}</strong> — {i.severity} — {i.location} ({i.time})
              </li>
            ))}
          </ul>
        </div>
        <div className="map-wrapper">
          <TrafficMap markers={INCIDENTS.map(i => ({ lat: 41.38, lng: 2.17, label: i.title }))} />
        </div>
      </div>
    </div>
  );
};

export default Sinistralitat;