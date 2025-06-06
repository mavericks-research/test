// frontend/frontend-app/src/components/Header.jsx
import React from 'react';

function Header({ onToggleNav }) {
  const headerStyle = {
    width: '100%',
    backgroundColor: '#222',
    color: '#00d1ff',
    padding: '10px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxSizing: 'border-box',
    position: 'sticky',
    top: 0,
    zIndex: 1010,
  };

  const titleStyle = {
    margin: 0,
    fontSize: '1.5em',
    fontWeight: 'bold',
  };

  const toggleButtonStyle = {
    padding: '8px 15px',
    fontSize: '0.9em',
    cursor: 'pointer',
    backgroundColor: '#00d1ff',
    color: '#000',
    border: 'none',
    borderRadius: '4px',
  };

  return (
    <header style={headerStyle}>
      <h1 style={titleStyle}>My App</h1>
      <button onClick={onToggleNav} style={toggleButtonStyle}>
        Toggle Nav
      </button>
    </header>
  );
}

export default Header;
