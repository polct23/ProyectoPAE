import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import DatasetInsights from '../components/DatasetInsights';
import Modal from '../components/Modal';
import './Datasets.css';

interface Dataset {
  id: number;
  title: string;
  description: string;
  format: string;
  lastUpdate: string;
  category: string;
  coverage: string;
  link: string;
  logo?: string;
}

type AnalysisResult = {
  dataset_id: number;
  dataset_title: string;
  total_chars: number;
  stats: {
    total: number;
    byType: Record<string, number>;
    byTypeName?: Record<string, number>;
    byCauseTop: [string, number][];
    byRoadTop: [string, number][];
    bySeverity: Record<string, number>;
    sample?: any;
  };
};

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const Datasets: React.FC = () => {
  const { fetchWithAuth, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [preview, setPreview] = useState<Dataset | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDatasets = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/datasets`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Dataset[] = await res.json();
        setDatasets(data);
      } catch (err: any) {
        setError(err.message || 'Error al cargar datasets');
      } finally {
        setLoading(false);
      }
    };
    fetchDatasets();
  }, []);

  const filteredDatasets = datasets.filter(dataset =>
    dataset.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dataset.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dataset.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = (dataset: Dataset, format: string) => {
    alert(`Exportant ${dataset.title} en format ${format}`);
  };

  const handleView = (dataset: Dataset) => setPreview(dataset);

  const handleAnalyze = async (dataset: Dataset) => {
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/datasets/${dataset.id}/analyze-xml`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const data: AnalysisResult = await res.json();
      setAnalysis(data);
      setAnalysisOpen(true);
    } catch (e: any) {
      setAnalysisError(e.message || 'Error analitzant XML');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="datasets-page">
      <div className="datasets-header">
        <h1 className="datasets-title">Dades obertes</h1>
        <p className="datasets-subtitle">Accés lliure i obert a dades globals</p>
      </div>

      <div className="search-section">
        <input
          type="text"
          className="datasets-search"
          placeholder="Cerca..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button className="search-button" onClick={() => { /* keep for future */ }}>Cerca</button>
      </div>

      <div className="datasets-container">
        <h2 className="section-title">Darrers datasets incorporats</h2>

        {loading && <p>Carregant datasets...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}

        <div className="datasets-list">
          {filteredDatasets.map(dataset => (
            <div key={dataset.id} className="dataset-card">
              <div className="dataset-header">
                <div className="dataset-icon">
                  {dataset.logo
                    ? <img
                      src={dataset.logo}
                      alt={`${dataset.title} logo`}
                      className="dataset-logo"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                    : <span className="dataset-emoji">📊</span>}
                </div>
                <div className="dataset-category">{dataset.category}</div>
              </div>

              <h3 className="dataset-title">{dataset.title}</h3>
              <p className="dataset-description">{dataset.description}</p>

              <div className="dataset-meta">
                <span className="dataset-format"><strong>Format:</strong> {dataset.format}</span>
                <span className="dataset-coverage"><strong>Cobertura:</strong> {dataset.coverage}</span>
                <span className="dataset-update"><strong>Última actualització:</strong> {dataset.lastUpdate}</span>
              </div>

              <div className="dataset-actions">
                <a className="btn btn-view" href={dataset.link} target="_blank" rel="noopener noreferrer">🔗 Obrir enllaç</a>
                <button className="btn btn-view" onClick={() => handleView(dataset)}>👁️ Vista ràpida</button>
                <button className="btn btn-export" onClick={() => handleExport(dataset, 'CSV')}>⬇️ Exportar</button>
                {dataset.id === 1 && (
                  <button
                    className="btn btn-view"
                    onClick={() => handleAnalyze(dataset)}
                    disabled={!user || analyzing}
                    title={!user ? 'Cal iniciar sessió' : undefined}
                  >
                    {analyzing ? '⏳ Analitzant...' : '🧪 Analitzar XML'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <DatasetInsights />

      <Modal isOpen={!!preview} title={preview ? preview.title : ''} onClose={() => setPreview(null)}>
        {preview && (
          <div>
            {preview.logo && (
              <img
                src={preview.logo}
                alt={`${preview.title} logo`}
                className="dataset-preview-logo"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <p style={{ marginTop: 0 }}>{preview.description}</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <span className="dataset-format"><strong>Format:</strong> {preview.format}</span>
              <span className="dataset-coverage"><strong>Cobertura:</strong> {preview.coverage}</span>
              <span className="dataset-update"><strong>Actualització:</strong> {preview.lastUpdate}</span>
            </div>
            <p>
              Pots obrir l'enllaç oficial en una nova pestanya:{' '}
              <a href={preview.link} target="_blank" rel="noopener noreferrer">{preview.link}</a>
            </p>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={analysisOpen}
        title={analysis ? `📊 Anàlisi XML — ${analysis.dataset_title}` : 'Anàlisi XML'}
        onClose={() => setAnalysisOpen(false)}
      >
        {analysisError && (
          <div style={{
            color: '#d32f2f',
            padding: '16px',
            backgroundColor: '#ffebee',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '500'
          }}>
            ❌ {analysisError}
          </div>
        )}
        {!analysisError && analysis && (
          <div style={{ fontSize: '16px', lineHeight: '1.8', color: '#333' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              marginBottom: '24px',
              padding: '16px',
              backgroundColor: '#f5f7fa',
              borderRadius: '8px'
            }}>
              <div>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>Total Incidències</div>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#667eea' }}>
                  {analysis.stats.total.toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>Caràcters XML</div>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#764ba2' }}>
                  {(analysis.total_chars / 1000).toFixed(1)}K
                </div>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
              marginBottom: '24px'
            }}>
              <div style={{
                border: '2px solid #667eea',
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: '#f9fbff'
              }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#667eea', fontSize: '18px', fontWeight: '700' }}>
                  📈 Tipus
                </h4>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '15px' }}>
                  {Object.entries(
                    analysis.stats.byTypeName || analysis.stats.byType
                  ).map(([k, v]) => (
                    <li key={k} style={{ marginBottom: '6px' }}>
                      <span style={{ fontWeight: '600' }}>{k}:</span> {v}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{
                border: '2px solid #84b33f',
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: '#f9fff5'
              }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#84b33f', fontSize: '18px', fontWeight: '700' }}>
                  🚗 Causes (Top 10)
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '15px', maxHeight: '220px', overflowY: 'auto' }}>
                  {analysis.stats.byCauseTop.map(([k, v]) => (
                    <li key={k} style={{ marginBottom: '6px' }}>
                      <span style={{ fontWeight: '600' }}>{k}:</span> {v}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{
                border: '2px solid #ff9800',
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: '#fff9f5'
              }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#ff9800', fontSize: '18px', fontWeight: '700' }}>
                  🛣️ Carreteres (Top 10)
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '15px', maxHeight: '220px', overflowY: 'auto' }}>
                  {analysis.stats.byRoadTop.map(([k, v]) => (
                    <li key={k} style={{ marginBottom: '6px' }}>
                      <span style={{ fontWeight: '600' }}>{k}:</span> {v}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{
                border: '2px solid #e91e63',
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: '#fff5f9'
              }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#e91e63', fontSize: '18px', fontWeight: '700' }}>
                  ⚠️ Severitat
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '15px' }}>
                  {Object.entries(analysis.stats.bySeverity).map(([k, v]) => (
                    <li key={k} style={{ marginBottom: '6px' }}>
                      <span style={{ fontWeight: '600' }}>Nivell {k}:</span> {v}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {analysis.stats.sample && (
              <div style={{
                marginTop: '24px',
                padding: '16px',
                backgroundColor: '#f5f5f5',
                borderRadius: '8px',
                borderLeft: '4px solid #667eea'
              }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '700', color: '#2d2d2d' }}>
                  📋 Exemple d'incidència (Primera registrada)
                </h4>
                <pre style={{
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  backgroundColor: '#fff',
                  padding: '12px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  border: '1px solid #ddd',
                  margin: 0,
                  color: '#333'
                }}>
                  {JSON.stringify(analysis.stats.sample, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Datasets;