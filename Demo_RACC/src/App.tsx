
import React, { useState } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Datasets from './pages/Datasets';
import Indicadors from './pages/Indicadors';
import Sinistralitat from './pages/Sinistralitat';
import Factors from './pages/Factors';
import Informe from './pages/Informe';
import Configuracio from './pages/Configuracio';

function App() {
  const [activeSection, setActiveSection] = useState('inici');

  const renderContent = () => {
    switch (activeSection) {
      case 'datasets':
        return <Datasets />;
      case 'indicadors':
        return <Indicadors />;
      case 'sinistralitat':
        return <Sinistralitat />;
      case 'factors':
        return <Factors />;
      case 'informe':
        return <Informe />;
      case 'configuracio':
        return <Configuracio />;
      case 'inici':
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="App">
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      <div className="main-content">
        <header className="app-header">
          <h1 className="page-title">
            {activeSection === 'inici' && '🏠 Dashboard'}
            {activeSection === 'indicadors' && '📊 Indicadors de trànsit'}
            {activeSection === 'sinistralitat' && '🚨 Sinistralitat'}
            {activeSection === 'factors' && '🌤️ Factors externs'}
            {activeSection === 'datasets' && '📁 Datasets'}
            {activeSection === 'informe' && '📋 Informe setmanal'}
            {activeSection === 'configuracio' && '⚙️ Configuració'}
          </h1>
          <input type="text" className="search-bar" placeholder="🔍 Cerca..." />
        </header>

        <div className="content-area">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default App;
