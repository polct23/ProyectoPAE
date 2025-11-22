// ...existing code...
import React from 'react';
import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './TrafficMap.css';

interface TrafficIncident {
  id: number;
  lat: number;
  lng: number;
  type: 'retention' | 'accident' | 'closure';
  description: string;
}

type ExternalMarker = {
  lat: number;
  lng: number;
  label?: string;
  type?: 'retention' | 'accident' | 'closure';
};

type TrafficMapProps = {
  markers?: ExternalMarker[];
  height?: number | string;
};

const defaultIncidents: TrafficIncident[] = [
  { id: 1, lat: 41.3851, lng: 2.1734, type: 'retention', description: 'Retención en Diagonal' },
  { id: 2, lat: 41.3879, lng: 2.1699, type: 'accident', description: 'Accidente en Passeig de Gràcia' },
  { id: 3, lat: 41.3828, lng: 2.1769, type: 'closure', description: 'Calle cortada en Rambla Catalunya' },
  { id: 4, lat: 41.3888, lng: 2.1590, type: 'retention', description: 'Tráfico lento en Gran Via' },
  { id: 5, lat: 41.3947, lng: 2.1778, type: 'retention', description: 'Retención en Meridiana' },
];

const getIncidentColor = (type: string) => {
  switch (type) {
    case 'retention': return '#f4d03f';
    case 'accident': return '#c94444';
    case 'closure': return '#e67e22';
    default: return '#3498db';
  }
};

const TrafficMap: React.FC<TrafficMapProps> = ({ markers, height = '100%' }) => {
  // Si se pasan markers por props, los usamos; si no, mostramos los incidentes por defecto
  const items: TrafficIncident[] = (markers && markers.length)
    ? markers.map((m, i) => ({
        id: 1000 + i,
        lat: m.lat,
        lng: m.lng,
        type: m.type ?? 'retention',
        description: m.label ?? 'Incidencia'
      }))
    : defaultIncidents;

  const styleHeight = typeof height === 'number' ? `${height}px` : height;

  return (
    <div className="traffic-map-container" style={{ height: styleHeight }}>
      <MapContainer
        center={[41.3851, 2.1734]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {items.map(incident => (
          <Circle
            key={incident.id}
            center={[incident.lat, incident.lng]}
            radius={200}
            pathOptions={{
              color: getIncidentColor(incident.type),
              fillColor: getIncidentColor(incident.type),
              fillOpacity: 0.45
            }}
          >
            <Popup>
              <strong>{incident.description}</strong>
              <div>Tipo: {incident.type}</div>
            </Popup>
          </Circle>
        ))}
      </MapContainer>
    </div>
  );
};

export default TrafficMap;
// ...existing code...