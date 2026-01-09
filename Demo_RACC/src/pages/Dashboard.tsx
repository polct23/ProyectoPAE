import React, { useEffect, useState } from 'react';
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

// Coordenadas de la incidencia
const INCIDENT_START = { lat: 42.09300193, lng: 2.89340866 }; // pk_inici
const INCIDENT_END = { lat: 42.060000, lng: 2.850000 };      // pk_fi (ajusta si tienes el dato real)

const Dashboard: React.FC = () => {
  const [incidentRoute, setIncidentRoute] = useState<{ lat: number; lng: number }[]>([]);

  useEffect(() => {
    const fetchRoute = async () => {
      const apiKey = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjNkMjcyOWUyZmJlMzRjMzNiMThkNTViOTQ0ZmI4MzdlIiwiaCI6Im11cm11cjY0In0='; // Sustituye por tu API key real
      const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${INCIDENT_START.lng},${INCIDENT_START.lat}&end=${INCIDENT_END.lng},${INCIDENT_END.lat}`;
      try {
        const res = await fetch(url);
        const data = await res.json();
        if (
          data &&
          data.features &&
          data.features[0] &&
          data.features[0].geometry &&
          data.features[0].geometry.coordinates
        ) {
          const coords = data.features[0].geometry.coordinates.map(
            ([lng, lat]: [number, number]) => ({ lat, lng })
          );
          setIncidentRoute(coords);
        }
      } catch (error) {
        console.error('Error fetching route:', error);
      }
    };
    fetchRoute();
  }, []);

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
        <TrafficMap
          markers={DEFAULT_MARKERS}
          height={480}
          routes={
            incidentRoute.length > 1
              ? [
                  {
                    path: incidentRoute,
                    color: 'red',
                    label: 'Retenció N-II',
                  },
                ]
              : []
          }
        />
      </div>

      <div className="charts-grid">
        <TrendChart />
        <WeeklyChart />
      </div>
    </div>
  );
};

export default Dashboard;