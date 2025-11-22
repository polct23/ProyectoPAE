import React, { useState } from 'react';
import './Informe.css';

const Informe: React.FC = () => {
  const [generando, setGenerando] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  const generarInforme = () => {
    setGenerando(true);
    setTimeout(() => {
      // informe ficticio generado en memoria (simular URL)
      setUrl('/fake-informe/informe-setmanal-2025-10-20.pdf');
      setGenerando(false);
    }, 1200);
  };

  return (
    <div className="page-informe">
      <h2>Informe setmanal</h2>
      <p>Genera un informe resum amb KPI i incidents recents (demo local en memòria).</p>

      <div className="report-actions">
        <button onClick={generarInforme} disabled={generando}>
          {generando ? 'Generant...' : 'Generar informe'}
        </button>
        <button disabled={!url} onClick={() => { if (url) window.alert('Descàrrega fictícia: ' + url); }}>
          Descarregar PDF
        </button>
      </div>

      {url && <p className="info">Informe generat: {url}</p>}
    </div>
  );
};

export default Informe;