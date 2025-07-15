// frontend/frontend-app/src/pages/SettingsPage.jsx
import React, { useContext, useState, useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { SettingsContext } from '../contexts/SettingsContext.jsx'; // Adjusted path
import api from '../services/api';

function SettingsPage() {
  const { currency, theme, dataRefreshInterval, updateSetting } = useContext(SettingsContext);
  const [linkToken, setLinkToken] = useState(null);

  const onSuccess = React.useCallback((public_token, metadata) => {
    // send public_token to server
    api.post('/api/plaid/exchange_public_token', { public_token });
  }, []);

  const config = {
    token: linkToken,
    onSuccess,
  };

  const { open, ready, error } = usePlaidLink(config);

  useEffect(() => {
    const createLinkToken = async () => {
      try {
        const response = await api.post('/api/plaid/create_link_token');
        setLinkToken(response.data.link_token);
      } catch (error) {
        console.error('Error creating link token:', error);
      }
    };
    createLinkToken();
  }, []);

  return (
    <div>
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
      <button onClick={() => open()} disabled={!ready}>
        Connect with Plaid
      </button>
    </div>
  );
}

export default SettingsPage;
