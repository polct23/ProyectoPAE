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
  apiUrl: 'http://localhost:8000',
  portFront: 4001,
  selectedDatasetIds: [],
  showMapMarkers: true,
  markerRadius: 200,
  refreshIntervalSec: 60,
};

//const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const API_BASE = "http://localhost:8000";

const Configuracio: React.FC = () => {
  const { user, fetchWithAuth } = useAuth();
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

  // CSV upload state
  const [csvUploading, setCsvUploading] = useState(false);

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setCsvUploading(true);
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    try {
      const res = await fetchWithAuth('http://localhost:8000/api/informe/csv', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) window.alert('CSV subido correctamente');
      else window.alert('Error al subir CSV');
    } catch (err) {
      window.alert('Error al subir CSV');
    }
    setCsvUploading(false);
  };

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
      <h2>Configuració del Sistema</h2>

      <section className="cfg-row">
        <div className="cfg-column">
          {/* CSV Upload section - only for admin */}
          {user === 'admin' && (
            <div className="csv-upload-section">
              <label>
                <div className="csv-upload-icon">📤</div>
                <div className="csv-upload-text">Importar Informe Semanal</div>
                <div className="csv-upload-subtext">Subeix un fitxer CSV amb les dades de l'informe</div>
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleCSVUpload} 
                  disabled={csvUploading}
                  style={{ marginTop: 8 }}
                />
                {csvUploading && <span className="loading-spinner">⏳ Pujant...</span>}
              </label>
            </div>
          )}

          {/* Configuration section */}
          <h3>Configuració General</h3>
          <label className="cfg-label">
            <span>🌐 API Base URL</span>
            <input
              type="text"
              value={config.apiUrl}
              onChange={(e) => setConfig(prev => ({ ...prev, apiUrl: e.target.value }))}
              placeholder="http://localhost:8000"
            />
          </label>

          <label className="cfg-label">
            <span>🚀 Port Frontend</span>
            <input
              type="number"
              value={config.portFront}
              onChange={(e) => setConfig(prev => ({ ...prev, portFront: Number(e.target.value) }))}
            />
          </label>

          {/* Datasets section */}
          <div className="datasets-fieldset">
            <strong>Datasets disponibles</strong>
            
            {loading && <div style={{ textAlign: 'center', color: '#666', padding: '16px' }}>
              <span className="loading-spinner">⏳</span> Carregant datasets...
            </div>}
            
            {error && <div className="error-message">{error}</div>}

            {user && (
              <div className="datasets-header-actions">
                <button onClick={startNew} className="btn-add">+ Afegir Dataset</button>
                {editing && <button onClick={cancelEdit} className="btn-ghost">Cancelar</button>}
              </div>
            )}

            <div className="datasets-list">
              {datasets.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                  No hi ha datasets disponibles
                </div>
              ) : (
                datasets.map(ds => (
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
                      {ds.category && <div style={{ fontSize: '12px', color: '#999' }}>📁 {ds.category}</div>}
                    </div>

                    {user && (
                      <div className="dataset-actions">
                        <button onClick={() => startEdit(ds)} className="btn-edit">✏️ Editar</button>
                        <button onClick={() => deleteDataset(ds)} className="btn-delete">🗑️ Eliminar</button>
                      </div>
                    )}
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Edit form section */}
          {editing && (
            <div className="edit-form-section">
              <h3>
                {datasets.some(d => Number(d.id) === Number(editing.id)) 
                  ? '✏️ Editar Dataset' 
                  : '➕ Nou Dataset'}
              </h3>
              
              {error && <div className="error-message">{error}</div>}

              <div className="form-grid">
                <label className="cfg-label">
                  ID del Dataset
                  <input 
                    value={String(editing.id)} 
                    onChange={e => setEditing(prev => prev ? ({ ...prev, id: e.target.value }) : prev)} 
                    placeholder="ex: dataset-1"
                  />
                </label>
                <label className="cfg-label">
                  Título
                  <input 
                    value={editing.title || ''} 
                    onChange={e => setEditing(prev => prev ? ({ ...prev, title: e.target.value }) : prev)} 
                    placeholder="ex: SCT - Incidències vàries"
                  />
                </label>
                <label className="cfg-label" style={{ gridColumn: '1 / -1' }}>
                  Descripció
                  <textarea 
                    value={editing.description || ''} 
                    onChange={e => setEditing(prev => prev ? ({ ...prev, description: e.target.value }) : prev)}
                    placeholder="Descripcio detallada del dataset"
                    rows={3}
                  />
                </label>
                <label className="cfg-label">
                  Categoria
                  <input 
                    value={editing.category || ''} 
                    onChange={e => setEditing(prev => prev ? ({ ...prev, category: e.target.value }) : prev)} 
                    placeholder="ex: Incidencies"
                  />
                </label>
                <label className="cfg-label">
                  Format
                  <input 
                    value={editing.format || ''} 
                    onChange={e => setEditing(prev => prev ? ({ ...prev, format: e.target.value }) : prev)} 
                    placeholder="ex: JSON, CSV"
                  />
                </label>
                <label className="cfg-label">
                  Última actualització
                  <input 
                    type="date"
                    value={editing.lastUpdate || ''} 
                    onChange={e => setEditing(prev => prev ? ({ ...prev, lastUpdate: e.target.value }) : prev)}
                  />
                </label>
                <label className="cfg-label">
                  Cobertura Geogràfica
                  <input 
                    value={editing.coverage || ''} 
                    onChange={e => setEditing(prev => prev ? ({ ...prev, coverage: e.target.value }) : prev)} 
                    placeholder="ex: Catalunya"
                  />
                </label>
                <label className="cfg-label">
                  Enllaç a la Font
                  <input 
                    type="url"
                    value={editing.link || ''} 
                    onChange={e => setEditing(prev => prev ? ({ ...prev, link: e.target.value }) : prev)} 
                    placeholder="https://..."
                  />
                </label>
                <label className="cfg-label">
                  Logo URL
                  <input 
                    type="url"
                    value={editing.logo || ''} 
                    onChange={e => setEditing(prev => prev ? ({ ...prev, logo: e.target.value }) : prev)} 
                    placeholder="https://..."
                  />
                </label>
              </div>

              <div className="cfg-actions">
                <button onClick={submitEdit} disabled={saving}>
                  {saving ? '💾 Desant...' : '💾 Desar Dataset'}
                </button>
                <button className="btn-ghost" onClick={cancelEdit}>Cancelar</button>
              </div>
            </div>
          )}

          <div className="muted" style={{ marginTop: 20, padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
            ℹ️ Nota: Les operacions d'edició, creació i eliminació requereixen autenticació d'administrador.
          </div>
        </div>

        {/* Preview section */}
        <div className="cfg-column cfg-preview">
          <h3>📊 Previsualització</h3>
          <div>
            <div style={{ marginBottom: '12px' }}>
              <strong>API Base:</strong>
              <div style={{ fontSize: '12px', wordBreak: 'break-all', marginTop: '4px' }}>{config.apiUrl}</div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <strong>Port Frontend:</strong>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>{config.portFront}</div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <strong>Datasets Seleccionats:</strong>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                {config.selectedDatasetIds.length === 0 
                  ? '(Cap dataset seleccionat)' 
                  : config.selectedDatasetIds.join(', ')}
              </div>
            </div>
            <div className="muted">
              Modifica la configuració i fes clic a "Guardar" per aplicar els canvis (es guarden a localStorage).
            </div>
          </div>

          <div className="cfg-actions" style={{ marginTop: 20 }}>
            <button onClick={saveConfig} style={{ background: '#4caf50', borderColor: '#4caf50', flex: 1 }}>
              💾 Guardar
            </button>
            <button className="btn-ghost" onClick={resetConfig} style={{ flex: 1 }}>
              🔄 Restablir
            </button>
            <button onClick={previewDownload} className="btn-secondary" style={{ flex: 1 }}>
              📥 Descarregar
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Configuracio;