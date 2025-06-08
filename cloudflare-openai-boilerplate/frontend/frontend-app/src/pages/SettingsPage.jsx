// frontend/frontend-app/src/pages/SettingsPage.jsx
import React, { useContext } from 'react';
import { SettingsContext } from '../contexts/SettingsContext.jsx'; // Adjusted path
// Removed NavigationBar import

function SettingsPage() { // Removed handleLogout from props
  const { currency, theme, dataRefreshInterval, updateSetting } = useContext(SettingsContext);

  return (
    <div>
      {/* NavigationBar removed from here */}
      <h1>Settings / Profile Page</h1>
      <p>Manage your preferences, currencies, and connected wallets.</p>
      <div>
        <label htmlFor="preferredCurrency">Preferred Currency: </label>
        <select
          id="preferredCurrency"
          value={currency}
          onChange={(e) => updateSetting('currency', e.target.value)}
        >
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
        </select>
      </div>
      <div>
        <label htmlFor="siteTheme">Site Theme: </label>
        <select
          id="siteTheme"
          value={theme}
          onChange={(e) => updateSetting('theme', e.target.value)}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
      <div>
        <label htmlFor="dataRefreshInterval">Data Refresh Interval: </label>
        <select
          id="dataRefreshInterval"
          value={dataRefreshInterval}
          onChange={(e) => updateSetting('dataRefreshInterval', e.target.value)}
        >
          <option value="manual">Manual</option>
          <option value="5min">5 Minutes</option>
          <option value="15min">15 Minutes</option>
          <option value="30min">30 Minutes</option>
        </select>
      </div>
    </div>
  );
}

export default SettingsPage;
