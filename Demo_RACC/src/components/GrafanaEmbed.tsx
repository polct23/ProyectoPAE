import React from 'react';
import './GrafanaEmbed.css';

interface GrafanaEmbedProps {
  dashboardId: string;
  panelId: number;
  height?: string;
}

const GrafanaEmbed: React.FC<GrafanaEmbedProps> = ({
  dashboardId,
  panelId,
  height = '400px',
}) => {
  // URL de Grafana desde variable de entorno o localhost
  const grafanaUrl = process.env.REACT_APP_GRAFANA_URL || 'http://localhost:3001';
  
  // Usar /d-solo/ para embeds limpios sin UI de Grafana
  const embedUrl = `${grafanaUrl}/d-solo/${dashboardId}?orgId=1&panelId=${panelId}&refresh=1m`;

  return (
    <div className="grafana-embed-container">
      <iframe
        src={embedUrl}
        width="100%"
        height={height}
        frameBorder="0"
        className="grafana-iframe"
        sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  );
};

export default GrafanaEmbed;
