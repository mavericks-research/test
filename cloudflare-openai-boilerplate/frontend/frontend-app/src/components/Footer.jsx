// frontend/frontend-app/src/components/Footer.jsx
import React from 'react';

function Footer() {
  const footerStyle = {
    width: '100%',
    backgroundColor: '#333', // Dark background
    padding: '10px 20px',
    color: '#fff', // Light text color
    textAlign: 'center',
    boxSizing: 'border-box', // Ensures padding doesn't add to the width
    marginTop: 'auto', // Helps push footer to bottom if main content is short in a flex container
  };

  const paragraphStyle = {
    margin: 0, // Removes default margin from p
  };

  return (
    <footer style={footerStyle}>
      <p style={paragraphStyle}>© 2024 My App. All rights reserved.</p>
    </footer>
  );
}

export default Footer;
