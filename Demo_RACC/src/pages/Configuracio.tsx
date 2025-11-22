import React, { useEffect, useState } from 'react';
import './Configuracio.css';

interface Dataset {
  id: string | number;
  title?: string;
  name?: string;
  description?: string;
  category?: string;
  link?: string;
  logo?: string;
}

type ConfigState = {
  apiUrl: string;
  portFront: number;
  selectedDatasetIds: (string | number)[];
  showMapMarkers: boolean;
  markerRadius: number;
  refreshIntervalSec: number;
};

const STORAGE_KEY = 'racc_demo_config_v1';

const defaultConfig: ConfigState = {
  apiUrl: 'http://10.4.120.115:8000',
  portFront: 4001,
  selectedDatasetIds: [],
  showMapMarkers: true,
  markerRadius: 200,
  refreshIntervalSec: 60,
};

const API_BASE = process.env.REACT_APP_API_URL || 'http://10.4.120.115:8000';

const Configuracio: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [config, setConfig] = useState<ConfigState>(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) return { ...defaultConfig, ...JSON.parse(s) };
    } catch {}
    return defaultConfig;
  });

  useEffect(() => {
    const fetchDatasets = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/datasets`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data: Dataset[] = await res.json();
        setDatasets(data);
        if (!config.selectedDatasetIds || config.selectedDatasetIds.length === 0) {
          setConfig(prev => ({ ...prev, selectedDatasetIds: data.slice(0, 2).map(d => d.id) }));
        }
      } catch (err: any) {
        setError(err.message || 'Error al carregar datasets');
      } finally {
        setLoading(false);
      }
    };
    fetchDatasets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only on mount

  const toggleDataset = (id: string | number) => {
    setConfig(prev => {
      const exists = prev.selectedDatasetIds.includes(id);
      const selected = exists ? prev.selectedDatasetIds.filter(x => x !== id) : [...prev.selectedDatasetIds, id];
      return { ...prev, selectedDatasetIds: selected };
    });
  };

  const saveConfig = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.alert('Configuració guardada (localStorage)');
  };

  const resetConfig = () => {
    localStorage.removeItem(STORAGE_KEY);
    setConfig(defaultConfig);
    window.alert('Configuració restablerta per defecte');
  };

  const previewDownload = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'racc-config-demo.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-configuracio">
      <h2>Configuració</h2>

      <section className="cfg-row">
        <div className="cfg-column">
          <label className="cfg-label">
            API base URL
            <input
              type="text"
              value={config.apiUrl}
              onChange={(e) => setConfig(prev => ({ ...prev, apiUrl: e.target.value }))}
            />
          </label>

          <label className="cfg-label">
            Port Frontend
            <input
              type="number"
              value={config.portFront}
              onChange={(e) => setConfig(prev => ({ ...prev, portFront: Number(e.target.value) }))}
            />
          </label>

          <div className="datasets-fieldset">
            <strong>Datasets disponibles</strong>
            {loading && <div>Carregant...</div>}
            {error && <div style={{ color: 'red' }}>{error}</div>}

            <div className="datasets-list">
              {datasets.map(ds => (
                <label key={String(ds.id)} className="dataset-item">
                  <input
                    type="checkbox"
                    checked={config.selectedDatasetIds.includes(ds.id)}
                    onChange={() => toggleDataset(ds.id)}
                  />
                  {ds.logo && (
                    <img
                      src={ds.logo}
                      alt={`${ds.title ?? ds.name ?? ds.id} logo`}
                      className="dataset-thumb"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <div className="dataset-meta">
                    <div className="dataset-title">{ds.title ?? ds.name ?? String(ds.id)}</div>
                    {ds.description && <div className="dataset-desc">{ds.description}</div>}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="map-options">
            <label className="cfg-label">
              <input
                type="checkbox"
                checked={config.showMapMarkers}
                onChange={(e) => setConfig(prev => ({ ...prev, showMapMarkers: e.target.checked }))}
              /> Mostrar marcadors al mapa
            </label>

            <label className="cfg-label">
              Radi marcadors (m)
              <input
                type="number"
                value={config.markerRadius}
                onChange={(e) => setConfig(prev => ({ ...prev, markerRadius: Number(e.target.value) }))}
              />
            </label>

            <label className="cfg-label">
              Interval refresc (seg)
              <input
                type="number"
                value={config.refreshIntervalSec}
                onChange={(e) => setConfig(prev => ({ ...prev, refreshIntervalSec: Number(e.target.value) }))}
              />
            </label>
          </div>

          <div className="cfg-actions">
            <button onClick={saveConfig}>Guardar</button>
            <button className="btn-ghost" onClick={resetConfig}>Restablir</button>
            <button onClick={previewDownload}>Descarregar config</button>
          </div>
        </div>

        <div className="cfg-column cfg-preview">
          <h3>Previsualització</h3>
          <div>
            <div><strong>API:</strong> {config.apiUrl}</div>
            <div><strong>Port Front:</strong> {config.portFront}</div>
            <div><strong>Datasets seleccionats:</strong> {config.selectedDatasetIds.join(', ')}</div>
            <div className="muted">Canvia la configuració i prem "Guardar" per fer-la efectiva (localStorage).</div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Configuracio;