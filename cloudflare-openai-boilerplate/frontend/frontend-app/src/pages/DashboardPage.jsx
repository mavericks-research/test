import React, { useState } from 'react'; // Added useState for WalletAnalyzer
import CryptoDisplay from '../components/CryptoDisplay'; // Import CryptoDisplay
// Removed NavigationBar import

// Define API_BASE_URL using Vite's import.meta.env
// Fallback to empty string for local dev (uses Vite proxy with relative paths)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function WalletAnalyzer() { // Removed workerUrl prop
  const [walletAddress, setWalletAddress] = useState('');
  const [selectedChain, setSelectedChain] = useState('ethereum'); // Default to Ethereum
  const [assets, setAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);


  const chainOptions = [
    { value: 'ethereum', label: 'Ethereum', placeholder: 'Enter Ethereum Wallet Address (e.g., 0x...)' },
    { value: 'bsc', label: 'Binance Smart Chain', placeholder: 'Enter BSC Wallet Address (e.g., 0x...)' },
    { value: 'solana', label: 'Solana', placeholder: 'Enter Solana Wallet Address (e.g., So1...)' },
  ];

  const getCurrentPlaceholder = () => {
    return chainOptions.find(chain => chain.value === selectedChain)?.placeholder || 'Enter Wallet Address';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!walletAddress) {
      setError('Please enter a wallet address.');
      return;
    }
    setHasSubmitted(true);
    setIsLoading(true);
    setError('');
    setAssets([]); // Clear previous assets

    try {
      const response = await fetch(`${API_BASE_URL}/api/wallet/assets?address=${encodeURIComponent(walletAddress)}&chain=${selectedChain}`);

      if (!response.ok) {
        let errorMsg = `Error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg; // Use backend's error message if available
        } catch (jsonError) {
          // Ignore if error response is not JSON, use the original errorMsg
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      // Ensure data is an array before setting, to prevent errors if API returns unexpected format
      if (Array.isArray(data)) {
        setAssets(data);
        if (data.length === 0) {
          // Optionally set a specific message if needed, but the existing UI handles "No assets found"
          // setError('No assets found for this address on the selected chain.');
        }
      } else {
        console.error("Received non-array data from API:", data);
        setAssets([]); // Set to empty array if data is not in expected format
        setError("Received unexpected data format from server.");
      }

    } catch (err) {
      console.error("Failed to fetch assets:", err);
      setError(err.message || 'Failed to fetch assets. Please try again.');
      setAssets([]); // Clear assets on error
    } finally {
      setIsLoading(false);
    }
  };

  const tableCellStyle = { padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #333' };
  const tableHeaderStyle = { ...tableCellStyle, fontWeight: 'bold', borderBottom: '2px solid #444' };


  return (
    <>
      <h2>Wallet Asset Viewer</h2>
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="chain-select" style={{ marginRight: '10px' }}>Select Chain:</label>
          <select
            id="chain-select"
            value={selectedChain}
            onChange={(e) => setSelectedChain(e.target.value)}
            disabled={isLoading}
            style={{ padding: '8px', borderRadius: '4px', marginRight: '10px' }}
          >
            {chainOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder={getCurrentPlaceholder()}
            disabled={isLoading}
            style={{ width: 'calc(100% - 120px)', padding: '8px', borderRadius: '4px', marginRight: '10px' }}
          />
          <button type="submit" disabled={isLoading} style={{ padding: '8px 15px', borderRadius: '4px' }}>
            {isLoading ? 'Fetching Assets...' : 'Get Assets'}
          </button>
        </div>
      </form>

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {isLoading && <p>Fetching Assets...</p>}

      {!isLoading && !error && hasSubmitted && assets.length === 0 && (
        <p>No assets found for this address on {selectedChain}.</p>
      )}

      {!isLoading && assets.length > 0 && (
        <div>
          <h3>Detected Assets on {chainOptions.find(c => c.value === selectedChain)?.label}:</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Token</th>
                <th style={tableHeaderStyle}>Symbol</th>
                <th style={tableHeaderStyle}>Balance</th>
                <th style={tableHeaderStyle}>Price (USD)</th>
                <th style={tableHeaderStyle}>Value (USD)</th>
              </tr>
            </thead>
            <tbody>
              {assets.map(asset => (
                <tr key={asset.symbol}>
                  <td style={tableCellStyle}>{asset.name}</td>
                  <td style={tableCellStyle}>{asset.symbol}</td>
                  <td style={tableCellStyle}>{asset.balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 8})}</td>
                  <td style={tableCellStyle}>
                    {asset.price !== null && asset.price !== undefined
                      ? asset.price.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
                      : 'N/A'}
                  </td>
                  <td style={tableCellStyle}>
                    {asset.value !== null && asset.value !== undefined && asset.price !== null // ensure price is not null for value display
                      ? asset.value.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
                      : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function DashboardPage() { // Removed workerUrl from props
  const containerStyle = {
    border: '2px solid #26cc66',  // bright green border
    borderRadius: '8px',
    padding: '20px',
    margin: '20px auto',
    maxWidth: '900px',
    backgroundColor: '#121212', // matching dark background
    color: '#d0ffd0',           // matching light green text
    boxSizing: 'border-box',
  };

  return (
    <div style={containerStyle}>
      <p>Welcome to your dashboard.</p>
      <hr />
      <CryptoDisplay />
      <hr />
      <WalletAnalyzer /> {/* Removed workerUrl prop */}
    </div>
  );
}

export default DashboardPage;
