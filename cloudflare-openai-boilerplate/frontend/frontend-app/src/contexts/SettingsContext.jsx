import React, { createContext, useState, useMemo } from 'react';

// Define SettingsContext
const SettingsContext = createContext();

// Create and export SettingsProvider component
export const SettingsProvider = ({ children }) => {
  // Initialize state for settings
  const [currency, setCurrency] = useState('USD');
  const [theme, setTheme] = useState('light');
  const [dataRefreshInterval, setDataRefreshInterval] = useState('manual');

  // Create an updateSetting function
  const updateSetting = (key, value) => {
    switch (key) {
      case 'currency':
        setCurrency(value);
        break;
      case 'theme':
        setTheme(value);
        break;
      case 'dataRefreshInterval':
        setDataRefreshInterval(value);
        break;
      default:
        console.warn(`Unknown setting key: ${key}`);
    }
  };

  // Memoize the context value
  const contextValue = useMemo(() => ({
    currency,
    theme,
    dataRefreshInterval,
    updateSetting,
  }), [currency, theme, dataRefreshInterval]);

  // Return SettingsContext.Provider with the memoized value
  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

// Export SettingsContext
export { SettingsContext };
