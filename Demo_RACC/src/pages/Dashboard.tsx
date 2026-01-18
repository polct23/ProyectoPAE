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
    <div className="dashboard-page" style={{ height: 'calc(100vh - 60px)', padding: 0 }}>
      <TrafficMap
        markers={DEFAULT_MARKERS}
        height="100%"
      />
    </div>
  );
};

export default Dashboard;