import React, { useEffect, useState } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Datasets from './pages/Datasets';
import Indicadors from './pages/Indicadors';
import Sinistralitat from './pages/Sinistralitat';
import Factors from './pages/Factors';
import Informe from './pages/Informe';
import Configuracio from './pages/Configuracio';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './AuthContext';
import { ChatbotWidget } from './components/ChatbotWidget';

function AppContent() {
  const [activeSection, setActiveSection] = useState('inici');
  const { user } = useAuth();

  // si el usuario se autentica y está en la pantalla de login, vamos a configuración
  useEffect(() => {
    if (user && activeSection === 'login') {
      setActiveSection('configuracio');
    }
  }, [user, activeSection]);

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
      case 'login':
        return <Login />; // Login ya usa el AuthContext para cambiar estado
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
            {activeSection === 'inici' && '🗺️ Mapa de tràfic'}
            {activeSection === 'indicadors' && '📊 Indicadors de trànsit'}
            {activeSection === 'sinistralitat' && '🚨 Sinistralitat'}
            {activeSection === 'factors' && '🌤️ Factors externs'}
            {activeSection === 'datasets' && '📁 Datasets'}
            {activeSection === 'informe' && '📋 Informe setmanal'}
            {activeSection === 'configuracio' && '⚙️ Configuració'}
            {activeSection === 'login' && '🔐 Login'}
          </h1>
        </header>

        <div className="content-area">
          {renderContent()}
        </div>
        <ChatbotWidget /> 
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;