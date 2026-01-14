import React from 'react';
import './Sinistralitat.css';
import GrafanaEmbed from '../components/GrafanaEmbed';

const Sinistralitat: React.FC = () => {
  return (
    <div className="page-sinistralitat">
      <div className="header-section">
        <h1>📍 Sinistralitat i Incidents de Trànsit</h1>
        <p className="subtitle">Barcelona i Àrea Metropolitana - Dades en temps real</p>
      </div>

      {/* Incidentes por día de la semana */}
      <div className="analysis-section analysis-full">
        <div className="section-header">
          <h2>📅 Incidentes por Día de la Semana</h2>
          <p>Distribución de incidencias a lo largo de la semana</p>
        </div>
        <GrafanaEmbed 
          dashboardId="main-dashboard"
          panelId={6}
          height="400px"
        />
      </div>

      {/* Sección de análisis */}
      <div className="analysis-grid">
        <div className="analysis-section analysis-full">
          <div className="section-header">
            <h2>📊 Tipos de Incidencias</h2>
            <p>Distribución de incidencias por categoría</p>
          </div>
          <GrafanaEmbed 
            dashboardId="traffic-accidents"
            panelId={3}
            height="380px"
          />
        </div>

        <div className="analysis-section analysis-full">
          <div className="section-header">
            <h2>🎯 Nivel de Severidad</h2>
            <p>Porcentaje de incidencias por gravedad</p>
          </div>
          <GrafanaEmbed 
            dashboardId="traffic-accidents"
            panelId={4}
            height="380px"
          />
        </div>
      </div>

      {/* Datos detallados */}
      <div className="analysis-grid">
        <div className="analysis-section">
          <div className="section-header">
            <h2>🛣️ Carreteras Afectadas</h2>
            <p>Vías con más incidencias</p>
          </div>
          <GrafanaEmbed 
            dashboardId="traffic-accidents"
            panelId={5}
            height="420px"
          />
        </div>

        <div className="analysis-section">
          <div className="section-header">
            <h2>⚡ Causas Principales</h2>
            <p>Factores más comunes de incidencias</p>
          </div>
          <GrafanaEmbed 
            dashboardId="traffic-accidents"
            panelId={6}
            height="420px"
          />
        </div>
      </div>

      {/* Calles cortadas */}
      <div className="analysis-section analysis-full">
        <div className="section-header">
          <h2>🚧 Carrers Tallats</h2>
          <p>Listado de calles cerradas al tráfico actualmente</p>
        </div>
        <GrafanaEmbed 
          dashboardId="main-dashboard"
          panelId={7}
          height="450px"
        />
      </div>

      <div className="info-section">
        <div className="info-content">
          <h3>ℹ️ Sobre estos datos</h3>
          <ul>
            <li>✓ Actualizados cada minuto desde el dataset de la <strong>Generalitat de Catalunya (SCT)</strong></li>
            <li>✓ Incluye retenciones, obras en progreso y eventos meteorológicos</li>
            <li>✓ Cobertura: Barcelona y Área Metropolitana</li>
            <li>✓ Los datos están disponibles en tiempo real con coordenadas geográficas</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Sinistralitat;