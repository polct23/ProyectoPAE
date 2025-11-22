import React from 'react';
import './Sidebar.css';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeSection, onSectionChange }) => {
  const menuItems = [
    { id: 'inici', label: 'Inici' },
    { id: 'indicadors', label: 'Indicadors de trànsit' },
    { id: 'sinistralitat', label: 'Sinistralitat' },
    { id: 'factors', label: 'Factors externs' },
    { id: 'datasets', label: 'Datasets' },
    { id: 'informe', label: 'Informe setmanal' },
    { id: 'configuracio', label: 'Configuració' }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>RACC MOBILITY</h1>
        <h2>DATA HUB</h2>
      </div>
      <nav className="sidebar-menu">
        {menuItems.map(item => (
          <button
            key={item.id}
            className={`sidebar-item ${activeSection === item.id ? 'active' : ''}`}
            onClick={() => onSectionChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
