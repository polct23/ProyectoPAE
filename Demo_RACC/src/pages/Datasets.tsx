import React, { useEffect, useState } from 'react';
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

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const Datasets: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [preview, setPreview] = useState<Dataset | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    </div>
  );
};

export default Datasets;