import React from 'react';

function Footer() {
  const footerStyle = {
    width: '100%',
    backgroundColor: '#0d0d0d', // darker black background
    padding: '10px 20px',
    color: '#26cc66', // vibrant green text
    textAlign: 'center',
    boxSizing: 'border-box',
    marginTop: 'auto',
    borderTop: '2px solid #26cc66', // subtle green border on top
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
