// frontend/frontend-app/src/pages/SplashScreen.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

import logo from '../assets/splash.mp4'
import logo2 from '../assets/public.avif'

function SplashScreen() {
  const navigate = useNavigate(); // Initialize useNavigate

  const handleGetStarted = () => {
    navigate('/login'); // Navigate to the login page
  };

  // Placeholder logo (using Lorem Picsum for a random image)
  const logoUrl = 'https://picsum.photos/seed/applogo/150/150';

  return (
    <div
      className="splash-screen-container"
      style={{
        minHeight: '100vh', // Ensure it takes full viewport height
        width: '100vw',    // Ensure it takes full viewport width
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '20px',    // Keep padding for content
        boxSizing: 'border-box', // Keep box-sizing
        backgroundColor: 'transparent', // Crucial: make its own background transparent
        position: 'relative', // Needed for z-index of children if splash container itself is not fixed
        zIndex: 0 // Ensure it's above the App's original background but below any potential header.
      }}
    >
      {/* TODO: Replace with actual MP4 video path from project assets, e.g., /assets/videos/background.mp4 */}
      <video
        autoPlay
        loop
        muted
        playsInline
        src={logo}
        style={{
          position: 'fixed',
          right: '0',
          bottom: '0',
          minWidth: '100%',
          minHeight: '100%',
          width: 'auto',
          height: 'auto',
          zIndex: '-1000',
          objectFit: 'cover',
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <img
          src={logo2}
          alt="App Logo"
          style={{
            width: '150px',
            height: '150px',
            borderRadius: '10px',
            marginBottom: '20px'
          }}
        />
        <h1>Plan Bold. Spend Smart. Stay Ahead.</h1>
        <button onClick={handleGetStarted} style={{ fontSize: '1.2em', padding: '10px 20px' }}>
          Get Started
        </button>
      </div>
    </div>
  );
}

export default SplashScreen;
