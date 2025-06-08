import React from 'react';
import logo from '../assets/public.svg'

function Header({ onToggleNav, isLoggedIn }) {

  const headerStyle = {
    width: '100%',
    backgroundColor: '#ffffff', // Obsidian black
    color: '#1ac0ff',           // Laser blue
    padding: '10px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxSizing: 'border-box',
    position: 'sticky',
    top: 0,
    zIndex: 1010,
    borderBottom: '2px solid #1ac0ff', // Accent bottom border
  };

  const titleStyle = {
    margin: 0,
    fontSize: '1.6em',
    fontWeight: 'bold',
  };

  const toggleButtonStyle = {
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img src={logo} alt="Coincept AI Logo" style={{ height: '40px', borderRadius: '4px' }} />
        <h4 style={titleStyle}>Coincept AI</h4>
      </div>
      {isLoggedIn && (
        <button onClick={onToggleNav} style={toggleButtonStyle}>
          L
        </button>
      )}
    </header>
  );
}

export default Header;
