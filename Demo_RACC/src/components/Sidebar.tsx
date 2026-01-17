import React from 'react';
import './Sidebar.css';
import { useAuth } from '../AuthContext';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeSection, onSectionChange }) => {
  const { user, logout } = useAuth();

  const baseItems = [
    { id: 'inici', label: 'Inici' },
    { id: 'sinistralitat', label: 'Sinistralitat' },
    { id: 'datasets', label: 'Datasets' },
    { id: 'informe', label: 'Informe setmanal' }
  ];

  const menuItems = user ? [...baseItems, { id: 'configuracio', label: 'Configuració' }] : baseItems;

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

      <div className="sidebar-footer" style={{ marginTop: 16, padding: '0 12px' }}>
        {user && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 14 }}>Admin: {user}</div>
            <button
              onClick={async () => {
                try {
                  await logout();
                } finally {
                  onSectionChange('inici');
                }
              }}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;