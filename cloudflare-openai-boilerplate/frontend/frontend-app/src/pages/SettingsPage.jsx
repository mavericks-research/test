// frontend/frontend-app/src/pages/SettingsPage.jsx
import React from 'react';
// Removed NavigationBar import

function SettingsPage() { // Removed handleLogout from props
  return (
    <div>
      {/* NavigationBar removed from here */}
      <h1>Settings / Profile Page</h1>
      <p>Manage your preferences, currencies, and connected wallets.</p>
      <div>
        <label htmlFor="preferredCurrency">Preferred Currency: </label>
        <select id="preferredCurrency">
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
        </select>
      </div>
    </div>
  );
}

export default SettingsPage;
