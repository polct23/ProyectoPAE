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
  id: number;
  lat: number;
  lng: number;
  type: 'retention' | 'accident' | 'closure';
  description: string;
  causa?: string;
  carretera?: string;
  pk_inici?: string;
  pk_fi?: string;
  sentit?: string;
  cap_a?: string;
  data?: string;
  tipo?: string;
  nivel?: number;
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

const TrafficMap: React.FC<TrafficMapProps> = ({ markers, height = '100%', routes }) => {
  const [liveIncidents, setLiveIncidents] = useState<TrafficIncident[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filtros
  const [onlySevere, setOnlySevere] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('Tots');
  const [selectedArea, setSelectedArea] = useState<string>('AMB');

  // Función para obtener coordenadas del backend
  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/incidencias');
      const data = await response.json();
      
      console.log('📍 Datos recibidos del backend:', data);
      console.log('📍 Total incidencias:', data.incidencias?.length);
      
      const incidents: TrafficIncident[] = data.incidencias.map((inc: any, idx: number) => ({
        id: idx + 1,
        lat: inc.lat,
        lng: inc.lon,
        type: (inc.tipo?.toLowerCase().includes('retenció') ? 'retention' : 
               inc.tipo?.toLowerCase().includes('accident') ? 'accident' : 'closure') as 'retention' | 'accident' | 'closure',
        description: inc.descripcion || inc.carretera || 'Incidencia',
        causa: inc.causa,
        carretera: inc.carretera,
        pk_inici: inc.pk_inici,
        pk_fi: inc.pk_fi,
        sentit: inc.sentit,
        cap_a: inc.cap_a,
        data: inc.data,
        tipo: inc.tipo,
        nivel: inc.nivel
      }));
      
      console.log('📍 Incidencias procesadas:', incidents);
      console.log('📍 Primera incidencia:', incidents[0]);
      
      setLiveIncidents(incidents);
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

  const rawItems: TrafficIncident[] = liveIncidents.length > 0
    ? liveIncidents
    : (markers && markers.length)
      ? markers.map((m, i) => ({
          id: 1000 + i,
          lat: m.lat,
          lng: m.lng,
          type: m.type ?? 'retention',
          description: m.label ?? 'Incidencia'
        }))
      : defaultIncidents;

  // Aplicar filtros
  const items = rawItems.filter(inc => {
    // Filtro de severidad
    if (onlySevere && (inc.nivel ?? 0) < 3) return false;

    // Filtro de tipo
    if (selectedType !== 'Tots') {
      const tipo = (inc.tipo || '').toLowerCase();
      const causa = (inc.causa || '').toLowerCase();
      if (selectedType === 'Retencions' && !tipo.includes('retenc') && !causa.includes('retenc')) return false;
      if (selectedType === 'Obres' && !tipo.includes('obr') && !causa.includes('obr')) return false;
      if (selectedType === 'Meteorologia' && !tipo.includes('meteor') && !causa.includes('meteor') && !causa.includes('neu') && !causa.includes('pluja')) return false;
    }

    // Filtro de área
    if (selectedArea === 'AMB') {
      // Bounding box AMB: lat [41.2, 41.7], lon [1.9, 2.5]
      if (inc.lat < 41.2 || inc.lat > 41.7 || inc.lng < 1.9 || inc.lng > 2.5) return false;
    }

    return true;
  });

  console.log('🗺️ liveIncidents.length:', liveIncidents.length);
  console.log('🗺️ Items a mostrar en el mapa:', items);
  console.log('🗺️ Total items:', items.length);

  const styleHeight = typeof height === 'number' ? `${height}px` : height;

  // Calcular el centro del mapa basado en el área seleccionada
  const mapCenter: [number, number] = selectedArea === 'AMB'
    ? [41.45, 2.2]  // Centro AMB (Barcelona)
    : [41.6, 1.6];   // Centro Catalunya

  const mapZoom = selectedArea === 'AMB' ? 11 : 8;

  return (
    <div className="traffic-map-container" style={{ height: styleHeight }}>
      {/* Panel de filtros */}
      <div className="map-filters-panel">
        <div className="filter-title">🔍 Filtres</div>
        
        <div className="filter-item">
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={onlySevere}
              onChange={(e) => setOnlySevere(e.target.checked)}
            />
            <span>Només nivells 3–5</span>
          </label>
        </div>

        <div className="filter-item">
          <label>Tipus</label>
          <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
            <option value="Tots">Tots</option>
            <option value="Retencions">Retencions</option>
            <option value="Obres">Obres</option>
            <option value="Meteorologia">Meteorologia</option>
          </select>
        </div>

        <div className="filter-item">
          <label>Àrea</label>
          <select value={selectedArea} onChange={(e) => setSelectedArea(e.target.value)}>
            <option value="AMB">AMB</option>
            <option value="TOT">Tot</option>
          </select>
        </div>

        <div className="filter-stats">
          {items.length} incidències
        </div>
      </div>

      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        key={selectedArea}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {items.map(incident => (
          <React.Fragment key={incident.id}>
            <Marker position={[incident.lat, incident.lng]} icon={getIconForIncident(incident.description)}>
              <Popup>
                <div style={{ maxWidth: '250px', fontSize: '12px' }}>
                  <strong style={{ fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                    {incident.description}
                  </strong>
                  
                  {incident.causa && (
                    <div style={{ marginBottom: '6px' }}>
                      <strong>🔧 Causa:</strong> {incident.causa}
                    </div>
                  )}
                  
                  {incident.carretera && (
                    <div style={{ marginBottom: '6px' }}>
                      <strong>🛣️ Carretera:</strong> {incident.carretera}
                      {incident.pk_inici && incident.pk_fi && ` (PK ${incident.pk_inici} - ${incident.pk_fi})`}
                    </div>
                  )}
                  
                  {incident.sentit && (
                    <div style={{ marginBottom: '6px' }}>
                      <strong>🔀 Sentit:</strong> {incident.sentit}
                    </div>
                  )}
                  
                  {incident.cap_a && (
                    <div style={{ marginBottom: '6px' }}>
                      <strong>➡️ Cap a:</strong> {incident.cap_a}
                    </div>
                  )}
                  
                  {incident.data && (
                    <div style={{ marginBottom: '6px' }}>
                      <strong>📅 Des de:</strong> {new Date(incident.data).toLocaleString('ca-ES')}
                    </div>
                  )}
                  
                  {incident.tipo && (
                    <div style={{ marginBottom: '6px' }}>
                      <strong>⚠️ Tipus:</strong> {incident.tipo}
                    </div>
                  )}
                  {typeof incident.nivel === 'number' && (
                    <div style={{ marginBottom: '6px' }}>
                      <strong>📊 Nivell:</strong> {incident.nivel}
                    </div>
                  )}
                  
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #ddd', fontSize: '11px', color: '#666' }}>
                    <strong>📍 Coordenades:</strong> {incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}
                  </div>
                </div>
              </Popup>
            </Marker>
            <Circle
              center={[incident.lat, incident.lng]}
              radius={200}
              pathOptions={{
                color: (incident.nivel ?? 0) >= 3 ? '#e11d48' : getIncidentColor(incident.type),
                fillColor: (incident.nivel ?? 0) >= 3 ? '#e11d48' : getIncidentColor(incident.type),
                fillOpacity: 0.35
              }}
            />
          </React.Fragment>
        ))}
        {/* Dibuja las rutas si existen */}
        {routes && routes.map((route, idx) => (
          <Polyline
            key={idx}
            positions={route.path.map(p => [p.lat, p.lng])}
            pathOptions={{ color: route.color || 'red', weight: 6 }}
          />
        ))}
      </MapContainer>
    </div>
  );
};

export default TrafficMap;