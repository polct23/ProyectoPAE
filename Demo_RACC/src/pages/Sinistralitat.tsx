import React from 'react';
import './Sinistralitat.css';
import GrafanaEmbed from '../components/GrafanaEmbed';

const Sinistralitat: React.FC = () => {
  return (
    <div className="page-sinistralitat">
      <div className="header-section">
        <h1>📍 Sinistralitat i Incidents de Trànsit</h1>
        <p className="subtitle">Barcelona i Àrea Metropolitana - Dades en temps real</p>
      </div>

      {/* Incidents per dia de la setmana */}
      <div className="analysis-section analysis-full">
        <div className="section-header">
          <h2>📅 Incidents per Dia de la Setmana</h2>
          <p>Distribució de incidències al llarg de la setmana</p>
        </div>
        <GrafanaEmbed 
          dashboardId="main-dashboard"
          panelId={6}
          height="400px"
        />
      </div>

      {/* Sección de análisis */}
      <div className="analysis-grid">
        <div className="analysis-section analysis-full">
          <div className="section-header">
            <h2>📊 Tipus d'Incidències</h2>
            <p>Distribució de incidències per categoria</p>
          </div>
          <GrafanaEmbed 
            dashboardId="traffic-accidents"
            panelId={3}
            height="380px"
          />
        </div>

        <div className="analysis-section analysis-full">
          <div className="section-header">
            <h2>🎯 Nivell de Gravetat</h2>
            <p>Percentatge de incidències per gravetat</p>
          </div>
          <GrafanaEmbed 
            dashboardId="traffic-accidents"
            panelId={4}
            height="380px"
          />
        </div>
      </div>

      {/* Datos detallados */}
      <div className="analysis-grid">
        <div className="analysis-section">
          <div className="section-header">
            <h2>🛣️ Carreteres Afectades</h2>
            <p>Vies amb més incidències</p>
          </div>
          <GrafanaEmbed 
            dashboardId="traffic-accidents"
            panelId={5}
            height="420px"
          />
        </div>

        <div className="analysis-section">
          <div className="section-header">
            <h2>⚡ Causes Principals</h2>
            <p>Factors més comuns d'incidències</p>
          </div>
          <GrafanaEmbed 
            dashboardId="traffic-accidents"
            panelId={6}
            height="420px"
          />
        </div>
      </div>

      {/* Carrers tallats */}
      <div className="analysis-section analysis-full">
        <div className="section-header">
          <h2>🚧 Carrers Tallats</h2>
          <p>Llistat de carrers tancats al tràfic actualment</p>
        </div>
        <GrafanaEmbed 
          dashboardId="main-dashboard"
          panelId={7}
          height="450px"
        />
      </div>

      {/* Guía de Severidades */}
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
            <li>✓ Actualitzades cada minut des del dataset de la <strong>Generalitat de Catalunya (SCT)</strong></li>
            <li>✓ Inclou retencions, obres en curs i events meteorològics</li>
            <li>✓ Cobertura: Barcelona i Àrea Metropolitana</li>
            <li>✓ Les dades estan disponibles en temps real amb coordenades geogràfiques</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Sinistralitat;