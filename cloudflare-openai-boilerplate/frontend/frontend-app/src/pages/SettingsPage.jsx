// frontend/frontend-app/src/pages/SettingsPage.jsx
import React from 'react';
import NavigationBar from '../components/NavigationBar';

function SettingsPage({ handleLogout }) {
  return (
    <div>
      <NavigationBar handleLogout={handleLogout} />
      <h1>Settings / Profile Page</h1>
      <p>Manage your preferences, currencies, and connected wallets.</p>
    </div>
  );
}

export default SettingsPage;
