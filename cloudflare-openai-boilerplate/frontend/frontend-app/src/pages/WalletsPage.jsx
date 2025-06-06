// frontend/frontend-app/src/pages/WalletsPage.jsx
import React from 'react';
import NavigationBar from '../components/NavigationBar';

function WalletsPage({ handleLogout }) {
  return (
    <div>
      <NavigationBar handleLogout={handleLogout} />
      <h1>Wallets Page</h1>
      <p>Connect, view, and manage your wallets here.</p>
    </div>
  );
}

export default WalletsPage;
