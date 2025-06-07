import React from 'react';

function Footer() {
  const footerStyle = {
    width: '100%',
    backgroundColor: '#0f0f0f', // obsidian black background
    padding: '10px 20px',
    color: '#1ac0ff', // laser blue text
    textAlign: 'center',
    boxSizing: 'border-box',
    marginTop: 'auto',
    borderTop: '2px solid #1ac0ff', // laser blue border on top
    fontWeight: '600',
  };

  const paragraphStyle = {
    margin: 0,
  };

  return (
    <footer style={footerStyle}>
      <p style={paragraphStyle}>© 2025 Coincept AI. All rights reserved.</p>
    </footer>
  );
}

export default Footer;
