import React from 'react';
import GrafanaEmbed from '../components/GrafanaEmbed';
import TrafficMap from '../components/TrafficMap';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  return (
    <div className="dashboard-page">
      <div className="header-section">
        <h1>📊 Dashboard Principal</h1>
        <p className="subtitle">Vista general del trànsit i les incidències a Barcelona i l'Àrea Metropolitana</p>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <GrafanaEmbed dashboardId="main-dashboard" panelId={1} height="150px" />
        </div>
        <div className="metric-card">
          <GrafanaEmbed dashboardId="main-dashboard" panelId={2} height="150px" />
        </div>
        <div className="metric-card">
          <GrafanaEmbed dashboardId="main-dashboard" panelId={3} height="150px" />
        </div>
        <div className="metric-card">
          <GrafanaEmbed dashboardId="main-dashboard" panelId={4} height="150px" />
        </div>
      </div>

      <div className="map-section">
        <div className="section-header">
          <h2>🗺️ Mapa de Incidències en Temps Real</h2>
          <p>Localització geogràfica de tots els incidents a l'àrea metropolitana de Barcelona</p>
        </div>
        <TrafficMap height="500px" useRealData={true} />
      </div>
    </div>
  );
};

export default Dashboard;