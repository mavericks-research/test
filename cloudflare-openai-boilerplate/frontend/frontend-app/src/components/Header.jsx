import React from 'react';
import { useAuth } from '../contexts/AuthContext';

function Header({ onToggleNav }) {
  const { logout } = useAuth();

  const headerStyle = {
    width: '100%',
    backgroundColor: '#0f0f0f', // Obsidian black
    color: '#1ac0ff',           // Laser blue
    padding: '10px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxSizing: 'border-box',
    position: 'sticky',
    gap: '10px',
    top: 0,
    zIndex: 1010,
    borderBottom: '2px solid #1ac0ff', // Accent bottom border
  };

  const titleStyle = {
    margin: 0,
    fontSize: '1.6em',
    fontWeight: 'bold',
  };

  const buttonStyle = {
    padding: '8px 15px',
    fontSize: '0.9em',
    cursor: 'pointer',
    backgroundColor: '#1ac0ff', // Laser blue
    color: '#0f0f0f',           // Contrast text
    border: 'none',
    borderRadius: '4px',
    fontWeight: '600',
    transition: 'background-color 0.3s ease',
  };

  return (
    <header style={headerStyle}>
      <div>
        <button onClick={onToggleNav} style={buttonStyle}>
          ☰
        </button>
        <h4 style={{ ...titleStyle, display: 'inline', marginLeft: '10px' }}>Lumex Crypto AI</h4>
      </div>
      <button onClick={logout} style={buttonStyle}>
        Logout
      </button>
    </header>
  );
}

export default Header;
