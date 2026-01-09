// ...existing code...
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './TrafficMap.css';

interface BackendIncident {
  id: string;
  latitud: string | number;
  longitud: string | number;
  carretera: string;
  descripcion: string;
  tipo: string;
  causa: string;
  nivel: number | string;
  sentit: string;
}

interface TrafficIncident {
  id: number | string;
  lat: number;
  lng: number;
  type: 'retention' | 'accident' | 'closure' | 'work' | 'weather';
  description: string;
  carretera?: string;
  causa?: string;
  nivel?: number | string;
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
  useRealData?: boolean;
};

const defaultIncidents: TrafficIncident[] = [
  { id: 1, lat: 41.3851, lng: 2.1734, type: 'retention', description: 'Retención en Diagonal' },
  { id: 2, lat: 41.3879, lng: 2.1699, type: 'accident', description: 'Accidente en Passeig de Gràcia' },
  { id: 3, lat: 41.3828, lng: 2.1769, type: 'closure', description: 'Calle cortada en Rambla Catalunya' },
  { id: 4, lat: 41.3888, lng: 2.1590, type: 'retention', description: 'Tráfico lento en Gran Via' },
  { id: 5, lat: 41.3947, lng: 2.1778, type: 'retention', description: 'Retención en Meridiana' },
];

const mapIncidentType = (tipoDescripcion: string): 'retention' | 'accident' | 'closure' | 'work' | 'weather' => {
  const tipo = tipoDescripcion?.toLowerCase() || '';
  if (tipo.includes('retenc')) return 'retention';
  if (tipo.includes('accident') || tipo.includes('accident')) return 'accident';
  if (tipo.includes('obra') || tipo.includes('work')) return 'work';
  if (tipo.includes('meteorolog') || tipo.includes('weather')) return 'weather';
  if (tipo.includes('calle cortada') || tipo.includes('carrer tallat')) return 'closure';
  return 'retention';
};

const getIncidentColor = (type: string) => {
  switch (type) {
    case 'retention': return '#f4d03f';
    case 'accident': return '#c94444';
    case 'closure': return '#e67e22';
    case 'work': return '#3498db';
    case 'weather': return '#9b59b6';
    default: return '#3498db';
  }
};

const TrafficMap: React.FC<TrafficMapProps> = ({ markers, height = '100%', useRealData = true }) => {
  const [incidents, setIncidents] = useState<TrafficIncident[]>(defaultIncidents);
  const [loading, setLoading] = useState(useRealData);

  useEffect(() => {
    if (!useRealData || (markers && markers.length > 0)) {
      return;
    }

    // Fetchear datos reales del API
    const fetchIncidents = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/incidents-map');
        const data = await response.json();
        
        if (data.incidents && Array.isArray(data.incidents)) {
          const mappedIncidents: TrafficIncident[] = data.incidents
            .filter((inc: BackendIncident) => inc.latitud && inc.longitud)
            .map((inc: BackendIncident, index: number) => ({
              id: inc.id || index,
              lat: parseFloat(String(inc.latitud)),
              lng: parseFloat(String(inc.longitud)),
              type: mapIncidentType(inc.tipo),
              description: `${inc.carretera} - ${inc.descripcion}`,
              carretera: inc.carretera,
              causa: inc.causa,
              nivel: inc.nivel
            }));
          
          setIncidents(mappedIncidents);
        }
      } catch (error) {
        console.error('Error fetching incidents map:', error);
        setIncidents(defaultIncidents);
      } finally {
        setLoading(false);
      }
    };

    fetchIncidents();
  }, [useRealData, markers]);

  // Si se pasan markers por props, los usamos
  const items: TrafficIncident[] = (markers && markers.length > 0)
    ? markers.map((m, i) => ({
        id: 1000 + i,
        lat: m.lat,
        lng: m.lng,
        type: m.type ?? 'retention',
        description: m.label ?? 'Incidencia'
      }))
    : incidents;

  const styleHeight = typeof height === 'number' ? `${height}px` : height;

  return (
    <div className="traffic-map-container" style={{ height: styleHeight }}>
      {loading && (
        <div className="map-loading">
          <p>Cargando incidencias...</p>
        </div>
      )}
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
            radius={300}
            pathOptions={{
              color: getIncidentColor(incident.type),
              fillColor: getIncidentColor(incident.type),
              fillOpacity: 0.6,
              weight: 2
            }}
          >
            <Popup>
              <div className="map-popup">
                <strong>{incident.description}</strong>
                {incident.carretera && <div><small>Carretera: {incident.carretera}</small></div>}
                {incident.causa && <div><small>Causa: {incident.causa}</small></div>}
                <div><small>Tipo: {incident.type}</small></div>
              </div>
            </Popup>
          </Circle>
        ))}
      </MapContainer>
      {!loading && (
        <div className="map-info">
          <span>{items.length} incidencias detectadas</span>
        </div>
      )}
    </div>
  );
};

export default TrafficMap;
// ...existing code...