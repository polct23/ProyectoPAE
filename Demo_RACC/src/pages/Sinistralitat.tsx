import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import './Sinistralitat.css';

type SummaryResponse = {
  total_incidents: number;
  percent_greus: number;
  via_mes_afectada: { carretera: string | null; incidents: number } | null;
};

type RankingEntry = { carretera: string; incidents: number; max_nivel: number; tipo_principal?: string | null };
type IncidenciaDetallada = {
  id: string | number;
  carretera?: string | null;
  lat?: number | string | null;
  lon?: number | string | null;
  lng?: number | string | null;
  nivel?: number | string | null;
  tipo?: string | null;
  causa?: string | null;
  fecha?: string | null;
  data?: string | null;
};

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const NIVELL_COLORS = ['#22c55e', '#f97316', '#ef4444', '#7c3aed', '#0ea5e9'];

const grafanaBase = process.env.REACT_APP_GRAFANA_URL || 'http://localhost:3001';

const grafanaDashboards = [
  {
    id: 'general',
    label: 'General',
    description: 'Vista macro amb KPIs de incidències, ritme i top carreteres.',
    embedUrl: `${grafanaBase}/d/amb-general?orgId=1&kiosk`,
  },
  {
    id: 'severitat',
    label: 'Severitat',
    description: 'Seguiment de gravetat, tipus, causes i carreteres amb més incidències.',
    embedUrl: `${grafanaBase}/d/amb-severitat?orgId=1&kiosk`,
  },
  {
    id: 'operacions',
    label: 'Operacions',
    description: 'Visió operativa amb retencions, carreteres tallades i càrrega per zones.',
    embedUrl: `${grafanaBase}/d/amb-operacions?orgId=1&kiosk`,
  },
];

const boundingBoxes: Record<string, { lat: [number, number]; lon: [number, number] }> = {
  totes: { lat: [-90, 90], lon: [-180, 180] },
  catalunya: { lat: [40.5, 43.5], lon: [-1.0, 3.5] },
  amb: { lat: [41.2, 41.7], lon: [1.9, 2.5] },
};

const formatNumber = (value: number) => new Intl.NumberFormat('ca-ES').format(value);

const KpiCard: React.FC<{ title: string; value: string; helper?: string; accent?: 'blue' | 'amber' | 'red' }>
  = ({ title, value, helper, accent = 'blue' }) => (
    <div className={`kpi-card kpi-${accent}`}>
      <div className="kpi-title">{title}</div>
      <div className="kpi-value">{value}</div>
      {helper && <div className="kpi-helper">{helper}</div>}
    </div>
  );

const TramsRankingTable: React.FC<{
  data: RankingEntry[];
  selected?: string | null;
  onSelect?: (carretera: string) => void;
  isLoading?: boolean;
}> = ({ data, selected, onSelect, isLoading }) => {
  if (isLoading) {
    return <div className="empty-state loading">Carregant dades...</div>;
  }
  if (!data || data.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📭</div>
        <div className="empty-title">Sense dades disponibles</div>
        <div className="empty-subtitle">Revisa la connexió amb el servei o torna-ho a provar més tard.</div>
      </div>
    );
  }
  return (
    <div className="ranking-table">
      <div className="ranking-head">
        <span>VIA</span>
        <span>INCIDENTS</span>
        <span>NIVELL MÀXIM</span>
        <span>TIPUS PRINCIPAL</span>
      </div>
      {data.map((row) => (
        <button
          key={row.carretera}
          className={`ranking-row ${selected === row.carretera ? 'selected' : ''}`}
          onClick={() => onSelect?.(row.carretera)}
          type="button"
        >
          <span>{row.carretera}</span>
          <span>{row.incidents}</span>
          <span>{row.max_nivel}</span>
          <span>{row.tipo_principal || 'Desconegut'}</span>
        </button>
      ))}
    </div>
  );
};

const Sinistralitat: React.FC = () => {
  const [incidencies, setIncidencies] = useState<IncidenciaDetallada[]>([]);
  const [incidenciesFiltrades, setIncidenciesFiltrades] = useState<IncidenciaDetallada[]>([]);
  const [summary, setSummary] = useState<SummaryResponse>({ total_incidents: 0, percent_greus: 0, via_mes_afectada: null });
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [area, setArea] = useState<'totes' | 'catalunya' | 'amb'>('totes');
  const [roadFilter, setRoadFilter] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeDashboard, setActiveDashboard] = useState('general');
  
  // Filtros adicionales
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [roadType, setRoadType] = useState<string>('totes');
  const [incidentType, setIncidentType] = useState<string>('tots');

  const applyFilters = (list: IncidenciaDetallada[], targetArea: string) => {
    const box = boundingBoxes[targetArea] || boundingBoxes.totes;
    const filtered = list.filter((inc) => {
      // Filtro geográfico
      const lat = Number(inc.lat);
      const lon = Number(inc.lon ?? inc.lng);
      if (Number.isNaN(lat) || Number.isNaN(lon)) return false;
      const geoMatch = lat >= box.lat[0] && lat <= box.lat[1] && lon >= box.lon[0] && lon <= box.lon[1];
      if (!geoMatch) return false;

      // Filtro de fechas
      if (dateFrom || dateTo) {
        const incDate = inc.data || inc.fecha;
        if (!incDate) return false;
        try {
          const parsedDate = new Date(incDate);
          if (dateFrom && parsedDate < new Date(dateFrom)) return false;
          if (dateTo && parsedDate > new Date(dateTo)) return false;
        } catch {
          return false;
        }
      }

      // Filtro tipo de vía
      if (roadType !== 'totes') {
        const carretera = (inc.carretera || '').toUpperCase();
        if (roadType === 'autopista' && !carretera.match(/^(AP-|A-)/)) return false;
        if (roadType === 'nacional' && !carretera.match(/^N-/)) return false;
        if (roadType === 'comarcal' && !carretera.match(/^(C-|BV-)/)) return false;
        if (roadType === 'local' && !carretera.match(/^(B-|L-)/)) return false;
      }

      // Filtro tipo de incidente
      if (incidentType !== 'tots') {
        const tipo = (inc.tipo || '').toLowerCase();
        const causa = (inc.causa || '').toLowerCase();
        if (incidentType === 'retencio' && !tipo.includes('retenc') && !causa.includes('retenc')) return false;
        if (incidentType === 'obres' && !tipo.includes('obr') && !causa.includes('obr')) return false;
        if (incidentType === 'meteorologia' && !tipo.includes('meteor') && !causa.includes('meteor') && !causa.includes('neu') && !causa.includes('pluja') && !causa.includes('vent')) return false;
        if (incidentType === 'accident' && !tipo.includes('accident') && !causa.includes('accident')) return false;
      }

      return true;
    });

    // Aplicar filtro de carretera si está activo
    const finalFiltered = roadFilter
      ? filtered.filter((inc) => inc.carretera === roadFilter)
      : filtered;

    setIncidenciesFiltrades(finalFiltered);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [rawRes, summaryRes, rankingRes] = await Promise.all([
        fetch(`${API_BASE}/api/incidencies/raw`),
        fetch(`${API_BASE}/api/incidencies/summary`),
        fetch(`${API_BASE}/api/incidencies/ranking_trams`),
      ]);

      if (!rawRes.ok || !summaryRes.ok) {
        throw new Error('No s\'han pogut carregar les dades d\'incidències');
      }

      const rawJson = await rawRes.json();
      const summaryJson = await summaryRes.json();
      const rankingJson = rankingRes.ok ? await rankingRes.json() : [];

      setIncidencies(rawJson.incidencies || []);
      applyFilters(rawJson.incidencies || [], area);
      setSummary(summaryJson as SummaryResponse);
      setRanking(rankingJson as RankingEntry[]);
    } catch (err: any) {
      console.error('Error carregant dades', err);
      setErrorMsg('No s\'han pogut carregar les dades. Mostrant 0 resultats.');
      setIncidencies([]);
      setIncidenciesFiltrades([]);
      setRanking([]);
      setSummary({ total_incidents: 0, percent_greus: 0, via_mes_afectada: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 180000); // refresc cada 3 minuts
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    applyFilters(incidencies, area);
  }, [area, incidencies, dateFrom, dateTo, roadType, incidentType, roadFilter]);

  // Recalcular stats basados en incidenciesFiltrades
  const filteredSummary = useMemo(() => {
    const total = incidenciesFiltrades.length;
    const greus = incidenciesFiltrades.filter((inc) => Number(inc.nivel) >= 3).length;
    const percent = total > 0 ? (greus / total) * 100 : 0;

    const roadCounts: Record<string, number> = {};
    incidenciesFiltrades.forEach((inc) => {
      const road = inc.carretera || 'Desconeguda';
      roadCounts[road] = (roadCounts[road] || 0) + 1;
    });
    const topRoad = Object.entries(roadCounts).sort(([, a], [, b]) => b - a)[0];
    const via = topRoad ? { carretera: topRoad[0], incidents: topRoad[1] } : null;

    return { total_incidents: total, percent_greus: percent, via_mes_afectada: via };
  }, [incidenciesFiltrades]);

  const barData = useMemo(() => {
    const counts: Record<string, number> = {};
    incidenciesFiltrades.forEach((inc) => {
      const key = inc.causa || 'Desconeguda';
      counts[key] = (counts[key] || 0) + 1;
    });
    // Ordenar por cantidad descendente y tomar top 10
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [incidenciesFiltrades]);

  const pieData = useMemo(() => {
    const counts: Record<string, number> = {};
    incidenciesFiltrades.forEach((inc) => {
      const nivel = Number(inc.nivel);
      if (!Number.isNaN(nivel)) {
        counts[nivel] = (counts[nivel] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([name, value]) => ({ name: `Nivell ${name}`, value }));
  }, [incidenciesFiltrades]);

  const currentDashboard = useMemo(() => grafanaDashboards.find((d) => d.id === activeDashboard)!, [activeDashboard]);

  return (
    <div className="page-sinistralitat">
      <div className="header-section">
        <h1>📍 Sinistralitat i Incidents de Trànsit</h1>
        <p className="subtitle">Dades en temps real alimentades des del feed GML del SCT. Actualització aproximada cada 3 minuts.</p>
      </div>

      <div className="filters-bar">
        <div className="filter-group">
          <label>Des de</label>
          <input 
            type="date" 
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>Fins a</label>
          <input 
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>Àrea</label>
          <select value={area} onChange={(e) => setArea(e.target.value as 'totes' | 'catalunya' | 'amb')}>
            <option value="totes">Totes</option>
            <option value="catalunya">Catalunya</option>
            <option value="amb">Àrea Metropolitana BCN</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Tipus de via</label>
          <select value={roadType} onChange={(e) => setRoadType(e.target.value)}>
            <option value="totes">Totes</option>
            <option value="autopista">Autopistes (AP-, A-)</option>
            <option value="nacional">Nacionals (N-)</option>
            <option value="comarcal">Comarcals (C-, BV-)</option>
            <option value="local">Locals (B-, L-)</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Tipus d'incident</label>
          <select value={incidentType} onChange={(e) => setIncidentType(e.target.value)}>
            <option value="tots">Tots</option>
            <option value="retencio">Retencions</option>
            <option value="obres">Obres</option>
            <option value="meteorologia">Meteorologia</option>
            <option value="accident">Accidents</option>
          </select>
        </div>
      </div>

      {errorMsg && <div className="alert-warning">{errorMsg}</div>}

      {roadFilter && (
        <div className="active-filter-tag">
          <span>🔍 Filtrant per carretera: <strong>{roadFilter}</strong></span>
          <button onClick={() => setRoadFilter(null)} className="clear-filter-btn" type="button">
            ✕ Netejar filtre
          </button>
        </div>
      )}

      <div className="kpi-container">
        <KpiCard title="Total incidents" value={formatNumber(filteredSummary.total_incidents || 0)} accent="blue" />
        <KpiCard title="Incidents greus (%)" value={`${(filteredSummary.percent_greus || 0).toFixed(1)}%`} accent="amber" />
        <KpiCard
          title="Via més afectada"
          value={filteredSummary.via_mes_afectada?.carretera || 'Sense dades'}
          helper={filteredSummary.via_mes_afectada ? `${filteredSummary.via_mes_afectada.incidents} incidents` : 'Sense comparativa'}
          accent="red"
        />
      </div>

      <div className="analysis-grid">
        <div className="analysis-section">
          <div className="section-header">
            <h2>Distribució per Causa</h2>
            <p>Top 10 causes principals d'incidències actives ordenades per freqüència.</p>
          </div>
          {barData.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <div className="empty-title">Sense dades disponibles</div>
              <div className="empty-subtitle">Revisa la connexió amb el servei o torna-ho a provar més tard.</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <XAxis dataKey="name" stroke="#475569" tick={{ fontSize: 12 }} angle={-10} height={60} interval={0} />
                <YAxis stroke="#475569" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="analysis-section">
          <div className="section-header">
            <h2>Nivell de gravetat</h2>
            <p>Repartiment d'incidències per nivell 1-5</p>
          </div>
          {pieData.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⚠️</div>
              <div className="empty-title">Sense dades disponibles</div>
              <div className="empty-subtitle">Revisa la connexió amb el servei o torna-ho a provar més tard.</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={110}>
                  {pieData.map((entry, index) => (
                    <Cell key={entry.name} fill={NIVELL_COLORS[index % NIVELL_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="analysis-section analysis-full">
        <div className="section-header">
          <h2>Ranking de Trams / Carreteres</h2>
          <p>Top vies amb més incidències actuals. Selecciona una fila per filtrar gràfics i KPIs.</p>
        </div>
        <TramsRankingTable
          data={ranking}
          selected={roadFilter}
          onSelect={(road) => setRoadFilter((prev) => (prev === road ? null : road))}
          isLoading={loading}
        />
      </div>

      <div className="analysis-section analysis-full grafana-section">
        <div className="section-header">
          <h2>Quadres en temps real (Grafana)</h2>
          <p>Selecciona un dashboard per visualitzar les dades en detall.</p>
        </div>

        <div className="grafana-tabs">
          {grafanaDashboards.map((d) => (
            <button
              key={d.id}
              className={`grafana-tab ${activeDashboard === d.id ? 'active' : ''}`}
              onClick={() => setActiveDashboard(d.id)}
              type="button"
            >
              {d.label}
            </button>
          ))}
        </div>

        <p className="grafana-description">{currentDashboard.description}</p>

        <iframe
          title={`Grafana ${currentDashboard.label}`}
          src={currentDashboard.embedUrl}
          className="grafana-iframe"
          frameBorder="0"
        />
      </div>

      <div className="severity-guide">
        <div className="guide-header">
          <h2>📖 Guia de Nivells de Gravetat</h2>
          <p>Classificació de l'impacte de cada incidència en la circulació</p>
        </div>
        <div className="severity-grid">
          <div className="severity-card severity-level-2">
            <div className="level-number">Nivell 2</div>
            <div className="level-title">Lleu</div>
            <div className="level-description">
              Circulació intensa amb retencions lleugeres o impacte mínim en la mobilitat
            </div>
            <div className="examples">Ex: Obra en curs, congestió normal</div>
          </div>
          
          <div className="severity-card severity-level-3">
            <div className="level-number">Nivell 3</div>
            <div className="level-title">Moderada</div>
            <div className="level-description">
              Circulació amb retencions moderades i impacte mitjà en el trànsit
            </div>
            <div className="examples">Ex: Accident lleu, obres importants</div>
          </div>
          
          <div className="severity-card severity-level-4">
            <div className="level-number">Nivell 4</div>
            <div className="level-title">Greu</div>
            <div className="level-description">
              Circulació molt afectada amb retencions significatives
            </div>
            <div className="examples">Ex: Accident greu, tancament parcial</div>
          </div>
          
          <div className="severity-card severity-level-5">
            <div className="level-number">Nivell 5</div>
            <div className="level-title">Molt Greu / Tancament</div>
            <div className="level-description">
              Via parcialment o totalment tallada, impacte crític en la circulació
            </div>
            <div className="examples">Ex: Accident crític, via tallada</div>
          </div>
        </div>
      </div>

      <div className="info-section">
        <div className="info-content">
          <h3>ℹ️ Sobre aquestes dades</h3>
          <ul>
            <li>✓ Alimentades directament del feed GML (SCT) amb actualització periòdica</li>
            <li>✓ Inclou retencions, obres en curs i factors meteorològics</li>
            <li>✓ Cobertura: Catalunya i Àrea Metropolitana de Barcelona</li>
            <li>✓ Si el servei de dades falla, la pantalla mostra valors a 0 per degradar-se suaument</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Sinistralitat;