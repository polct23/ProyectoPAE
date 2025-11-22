// ...existing code...
import React from 'react';
import MetricCard from '../components/MetricCard';
import TrafficMap from '../components/TrafficMap';
import { TrendChart, WeeklyChart } from '../components/Charts';
import './Dashboard.css';

const DEFAULT_MARKERS = [
  { lat: 41.3851, lng: 2.1734, label: 'Retenció Diagonal' },
  { lat: 41.3879, lng: 2.1699, label: 'Accident Passeig de Gràcia' },
  { lat: 41.3828, lng: 2.1769, label: 'Tall Rambla Catalunya' },
  { lat: 41.3888, lng: 2.1590, label: 'Retenció Gran Via' },
  { lat: 41.3947, lng: 2.1778, label: 'Retenció Meridiana' },
];

const Dashboard: React.FC = () => {
  return (
    <div className="dashboard-page">
      <div className="metrics-grid">
        <MetricCard title="RETENCIONS" value="132" color="red" />
        <MetricCard title="ACCIDENTS" value="8" color="red" />
        <MetricCard title="TEMPS RETENCIONS" value="178 Min" color="red" />
        <MetricCard title="CARRERS TALLATS" value="14" color="red" />
      </div>

      <div className="map-section">
        {/* Mapa general de Barcelona con marcadors per a la vista d'inici */}
        <TrafficMap markers={DEFAULT_MARKERS} height={480} />
      </div>

      <div className="charts-grid">
        <TrendChart />
        <WeeklyChart />
      </div>
    </div>
  );
};

export default Dashboard;
// ...existing code...