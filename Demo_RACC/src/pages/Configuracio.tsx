import React, { useEffect, useState } from 'react';
import './Configuracio.css';
import { useAuth } from '../AuthContext';

interface Dataset {
  id: number | string;
  title?: string;
  name?: string;
  description?: string;
  category?: string;
  link?: string;
  logo?: string | null;
  format?: string;
  lastUpdate?: string;
  coverage?: string;
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
  apiUrl: 'http://127.0.0.1:8000',
  portFront: 4001,
  selectedDatasetIds: [],
  showMapMarkers: true,
  markerRadius: 200,
  refreshIntervalSec: 60,
};

const API_BASE = process.env.REACT_APP_API_URL || '';

const Configuracio: React.FC = () => {
  const { user } = useAuth();
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

  // form state for add/edit
  const emptyForm: Dataset = { id: '', title: '', description: '', category: '', link: '', logo: null, format: '', lastUpdate: '', coverage: '' };
  const [editing, setEditing] = useState<Dataset | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchDatasets = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/datasets`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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

  useEffect(() => {
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

  // ADMIN actions: create / update / delete
  const startNew = () => setEditing({ ...emptyForm });
  const startEdit = (d: Dataset) => setEditing({ ...d });

  const cancelEdit = () => setEditing(null);

  const submitEdit = async () => {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        id: typeof editing.id === 'string' && editing.id !== '' ? Number(editing.id) : editing.id,
        title: editing.title ?? '',
        description: editing.description ?? '',
        format: editing.format ?? '',
        lastUpdate: editing.lastUpdate ?? '',
        category: editing.category ?? '',
        coverage: editing.coverage ?? '',
        link: editing.link ?? '',
        logo: editing.logo ?? null,
      };
      const idNum = Number(payload.id);
      const exists = datasets.some(d => Number(d.id) === idNum);
      const url = `${API_BASE}/datasets${exists ? `/${idNum}` : ''}`;
      const method = exists ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchDatasets();
      setEditing(null);
    } catch (err: any) {
      setError(err.message || 'Error al desar dataset');
    } finally {
      setSaving(false);
    }
  };

  const deleteDataset = async (d: Dataset) => {
    if (!window.confirm(`Eliminar dataset ${d.title ?? d.id}?`)) return;
    setError(null);
    try {
      const idNum = Number(d.id);
      const res = await fetch(`${API_BASE}/datasets/${idNum}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
      await fetchDatasets();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar dataset');
    }
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

            <div style={{ margin: '8px 0' }}>
              {user && (
                <>
                  <button onClick={startNew} style={{ marginRight: 8 }}>+ Nou dataset</button>
                  {editing && <button onClick={cancelEdit} className="btn-ghost">Cancel·lar</button>}
                </>
              )}
            </div>

            <div className="datasets-list">
              {datasets.map(ds => (
                <label key={String(ds.id)} className="dataset-item" style={{ alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={config.selectedDatasetIds.includes(ds.id)}
                    onChange={() => toggleDataset(ds.id)}
                    style={{ marginRight: 8 }}
                  />
                  {ds.logo && (
                    <img
                      src={ds.logo}
                      alt={`${ds.title ?? ds.name ?? ds.id} logo`}
                      className="dataset-thumb"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <div className="dataset-meta" style={{ flex: 1 }}>
                    <div className="dataset-title">{ds.title ?? ds.name ?? String(ds.id)}</div>
                    {ds.description && <div className="dataset-desc">{ds.description}</div>}
                  </div>

                  {user && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => startEdit(ds)}>Editar</button>
                      <button onClick={() => deleteDataset(ds)} className="btn-ghost">Eliminar</button>
                    </div>
                  )}
                </label>
              ))}
            </div>
          </div>

          {editing && (
            <div style={{ marginTop: 12, borderTop: '1px solid #eee', paddingTop: 12 }}>
              <h3>{datasets.some(d => Number(d.id) === Number(editing.id)) ? 'Editar dataset' : 'Nou dataset'}</h3>
              <div style={{ display: 'grid', gap: 8 }}>
                <label className="cfg-label">
                  ID
                  <input value={String(editing.id)} onChange={e => setEditing(prev => prev ? ({ ...prev, id: e.target.value }) : prev)} />
                </label>
                <label className="cfg-label">
                  Title
                  <input value={editing.title || ''} onChange={e => setEditing(prev => prev ? ({ ...prev, title: e.target.value }) : prev)} />
                </label>
                <label className="cfg-label">
                  Description
                  <input value={editing.description || ''} onChange={e => setEditing(prev => prev ? ({ ...prev, description: e.target.value }) : prev)} />
                </label>
                <label className="cfg-label">
                  Format
                  <input value={editing.format || ''} onChange={e => setEditing(prev => prev ? ({ ...prev, format: e.target.value }) : prev)} />
                </label>
                <label className="cfg-label">
                  Last update
                  <input value={editing.lastUpdate || ''} onChange={e => setEditing(prev => prev ? ({ ...prev, lastUpdate: e.target.value }) : prev)} />
                </label>
                <label className="cfg-label">
                  Category
                  <input value={editing.category || ''} onChange={e => setEditing(prev => prev ? ({ ...prev, category: e.target.value }) : prev)} />
                </label>
                <label className="cfg-label">
                  Coverage
                  <input value={editing.coverage || ''} onChange={e => setEditing(prev => prev ? ({ ...prev, coverage: e.target.value }) : prev)} />
                </label>
                <label className="cfg-label">
                  Link
                  <input value={editing.link || ''} onChange={e => setEditing(prev => prev ? ({ ...prev, link: e.target.value }) : prev)} />
                </label>
                <label className="cfg-label">
                  Logo (URL)
                  <input value={editing.logo || ''} onChange={e => setEditing(prev => prev ? ({ ...prev, logo: e.target.value }) : prev)} />
                </label>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={submitEdit} disabled={saving}>{saving ? 'Desant...' : 'Desar'}</button>
                  <button className="btn-ghost" onClick={cancelEdit}>Cancel·lar</button>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <div style={{ color: '#666', fontSize: 13 }}>Recorda: les operacions d'edició/recreació/eliminació requereixen sessió d'admin.</div>
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

          <div style={{ marginTop: 12 }}>
            <div className="cfg-actions">
              <button onClick={saveConfig}>Guardar</button>
              <button className="btn-ghost" onClick={resetConfig}>Restablir</button>
              <button onClick={previewDownload}>Descarregar config</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Configuracio;