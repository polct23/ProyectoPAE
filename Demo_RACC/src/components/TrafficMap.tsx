import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Popup, Polyline, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './TrafficMap.css';

// Iconos personalizados para cada tipo de incidencia
const iconHielo = L.icon({
  iconUrl: '/hielo.png', 
  iconSize: [40, 40], 
  iconAnchor: [20, 40], 
  popupAnchor: [0, -40], 
});

const iconNevada = L.icon({
  iconUrl: '/nevada.png', 
  iconSize: [40, 40], 
  iconAnchor: [20, 40], 
  popupAnchor: [0, -40], 
});

const iconObra = L.icon({
  iconUrl: '/obra.png', 
  iconSize: [40, 40], 
  iconAnchor: [20, 40], 
  popupAnchor: [0, -40], 
});

const iconOtros = L.icon({
  iconUrl: '/otros.png', 
  iconSize: [40, 40], 
  iconAnchor: [20, 40], 
  popupAnchor: [0, -40], 
});

// Función para determinar qué icono usar según la descripción
const getIconForIncident = (description: string): L.Icon => {
  const desc = description.toLowerCase();
  
  if (desc.includes('neu/gel')) {
    return iconHielo;
  } else if (desc.includes('obligatori cadenes')) {
    return iconNevada;
  } else if (desc.includes('calçada')) {
    return iconObra;
  } else {
    return iconOtros;
  }
};

interface TrafficIncident {
  id: number | string;
  lat: number;
  lng: number;
  type: 'retention' | 'accident' | 'closure' | 'work' | 'weather';
  description: string;
  causa?: string;
  carretera?: string;
  pk_inici?: string;
  pk_fi?: string;
  sentit?: string;
  cap_a?: string;
  data?: string;
  tipo?: string;
}

type ExternalMarker = {
  lat: number;
  lng: number;
  label?: string;
  type?: 'retention' | 'accident' | 'closure';
};

type Route = {
  path: { lat: number; lng: number }[];
  color?: string;
  label?: string;
};

type TrafficMapProps = {
  markers?: ExternalMarker[];
  height?: number | string;
  routes?: Route[];
};


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

const TrafficMap: React.FC<TrafficMapProps> = ({ markers, height = '100%', routes }) => {
  const [liveIncidents, setLiveIncidents] = useState<TrafficIncident[]>([]);
  const [loading, setLoading] = useState(false);

  const parseCoord = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Normaliza: quita espacios, elimina separador de miles y usa punto decimal
      const cleaned = value.trim().replace(/\s+/g, '').replace(/\./g, '').replace(',', '.');
      return Number(cleaned);
    }
    return NaN;
  };

  // Función para obtener coordenadas del backend (con fallback)
  const fetchIncidents = async () => {
    const buildIncidents = (source: any[]) => {
      const parsed = source.map((inc: any, idx: number) => {
        const rawLat = inc.latitud ?? inc.lat;
        const rawLng = inc.longitud ?? inc.lon;
        const lat = parseCoord(rawLat);
        const lng = parseCoord(rawLng);
        return {
          id: inc.id ?? idx + 1,
          lat,
          lng,
          type: mapIncidentType(inc.tipo || ''),
          description: inc.descripcion || inc.carretera || 'Incidència',
          causa: inc.causa,
          carretera: inc.carretera,
          pk_inici: inc.pk_inici,
          pk_fi: inc.pk_fi,
          sentit: inc.sentit,
          cap_a: inc.cap_a,
          data: inc.data,
          tipo: inc.tipo,
          __rawLat: rawLat,
          __rawLng: rawLng
        } as TrafficIncident & { __rawLat: any; __rawLng: any };
      });

      const valid = parsed.filter((inc: TrafficIncident & { __rawLat: any; __rawLng: any }) => Number.isFinite(inc.lat) && Number.isFinite(inc.lng));
      const invalid = parsed.filter((inc: TrafficIncident & { __rawLat: any; __rawLng: any }) => !Number.isFinite(inc.lat) || !Number.isFinite(inc.lng));

      if (invalid.length) {
        console.warn('⚠️ Incidencias sin coordenadas válidas:', invalid.length, invalid.slice(0, 5).map(i => ({ rawLat: i.__rawLat, rawLng: i.__rawLng })));
      }

      return valid as TrafficIncident[];
    };

    try {
      setLoading(true);

      // Primer intento: endpoint específico para el mapa
      const respMap = await fetch('http://localhost:8000/api/incidents-map');
      const dataMap = await respMap.json();
      console.log('📍 /api/incidents-map total:', dataMap.total);
      const incidentsMap = buildIncidents(dataMap.incidents || []);
      if (incidentsMap.length > 0) {
        setLiveIncidents(incidentsMap);
        console.log('📍 Incidencias usadas (map):', incidentsMap.length);
        return;
      }

      // Fallback: endpoint general /incidencias
      const respInc = await fetch('http://localhost:8000/incidencias');
      const dataInc = await respInc.json();
      console.log('📍 /incidencias total:', dataInc.incidencias?.length);
      const incidentsInc = buildIncidents(dataInc.incidencias || []);
      setLiveIncidents(incidentsInc);
      console.log('📍 Incidencias usadas (fallback):', incidentsInc.length);
    } catch (error) {
      console.error('❌ Error al obtener incidencias:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar incidencias al montar el componente
  useEffect(() => {
    fetchIncidents();
  }, []);

  const items: TrafficIncident[] = liveIncidents.length > 0
    ? liveIncidents
    : (markers && markers.length)
      ? markers.map((m, i) => ({
          id: 1000 + i,
          lat: m.lat,
          lng: m.lng,
          type: m.type ?? 'retention',
          description: m.label ?? 'Incidencia'
        }))
      : [];

  console.log('🗺️ liveIncidents.length:', liveIncidents.length);
  console.log('🗺️ Items a mostrar en el mapa:', items);
  console.log('🗺️ Total items:', items.length);

  const styleHeight = typeof height === 'number' ? `${height}px` : height;

  // Calcular el centro del mapa basado en las incidencias
  const mapCenter: [number, number] = items.length > 0
    ? [items[0].lat, items[0].lng]
    : [41.3851, 2.1734];

  return (
    <div className="traffic-map-container" style={{ height: styleHeight }}>
      {loading && (
        <div className="map-loading">
          <p>Cargando incidencias...</p>
        </div>
      )}
      <MapContainer
        center={mapCenter}
        zoom={8}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {items.map(incident => (
          <Marker
            key={incident.id}
            position={[incident.lat, incident.lng]}
            icon={getIconForIncident(incident.description)}
          >
            <Popup>
              <div style={{ maxWidth: '300px' }}>
                <strong>{incident.description}</strong>
                <hr style={{ margin: '5px 0' }} />
                {incident.tipo && <div><b>Tipo:</b> {incident.tipo}</div>}
                {incident.carretera && <div><b>Carretera:</b> {incident.carretera}</div>}
                {incident.causa && <div><b>Causa:</b> {incident.causa}</div>}
                {incident.sentit && <div><b>Sentit:</b> {incident.sentit}</div>}
                {incident.cap_a && <div><b>Cap a:</b> {incident.cap_a}</div>}
                {incident.pk_inici && <div><b>PK Inici:</b> {incident.pk_inici}</div>}
                {incident.pk_fi && <div><b>PK Fi:</b> {incident.pk_fi}</div>}
                {incident.data && <div><b>Data:</b> {incident.data}</div>}
              </div>
            </Popup>
          </Marker>
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