import React, { useState, useEffect } from 'react';

const BlockchainDataViewer = () => {
  const [selectedBlockchain, setSelectedBlockchain] = useState('');
  const [blockchainTokens, setBlockchainTokens] = useState([]);
  const [isLoadingBlockchainTokens, setIsLoadingBlockchainTokens] = useState(false);

  // Define API_BASE_URL using Vite's import.meta.env
  // Fallback to empty string for local dev (uses Vite proxy with relative paths)
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

  // useEffect for fetching tokens by blockchain
  useEffect(() => {
    const fetchTokensByBlockchain = async () => {
      if (!selectedBlockchain) {
        setBlockchainTokens([]); // Clear tokens if no blockchain is selected
        return;
      }

      setIsLoadingBlockchainTokens(true);
      setBlockchainTokens([]); // Clear previous results

      let platformApiName = '';
      switch (selectedBlockchain) {
        case 'Ethereum':
          platformApiName = 'ethereum';
          break;
        case 'Binance Smart Chain':
          platformApiName = 'binance-smart-chain';
          break;
        case 'Solana':
          platformApiName = 'solana';
          break;
        // Add other cases here if more blockchains are supported in the future
        default:
          // If a blockchain is selected that's not in the case list,
          // it might be an oversight or a new addition not yet handled.
          // For now, we'll stop loading and potentially log this or show a message.
          console.warn(`Selected blockchain "${selectedBlockchain}" is not explicitly handled for API calls.`);
          setIsLoadingBlockchainTokens(false);
          // Optionally, set an error message to display to the user
          // setError(`Details for ${selectedBlockchain} are not available at the moment.`);
          return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/crypto/coins-by-blockchain?platform=${platformApiName}&currency=usd`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: response.statusText }));
          throw new Error(`Error fetching tokens for ${selectedBlockchain}: ${errorData.error || response.statusText}`);
        }
        const data = await response.json();
        setBlockchainTokens(data || []); // Ensure data is an array
      } catch (error) {
        console.error(`Failed to fetch tokens for ${selectedBlockchain}:`, error);
        setBlockchainTokens([]); // Clear on error
        // You might want to set an error message state here to display to the user
      } finally {
        setIsLoadingBlockchainTokens(false);
      }
    };

    fetchTokensByBlockchain();
  }, [selectedBlockchain, API_BASE_URL]);

  return (
    <div style={{ marginTop: '20px' }}>
      {/* Blockchain Selector */}
      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="blockchain-data-viewer-select" style={{ marginRight: '10px', fontWeight: 'bold' }}>Select Blockchain:</label>
        <select
          id="blockchain-data-viewer-select" // Unique ID for the select element
          value={selectedBlockchain}
          onChange={(e) => {
            setSelectedBlockchain(e.target.value);
          }}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          <option value="">Select Blockchain</option>
          <option value="Ethereum">Ethereum</option>
          <option value="Binance Smart Chain">Binance Smart Chain</option>
          <option value="Solana">Solana</option>
          {/* Add more blockchain options here if needed, matching the switch cases */}
        </select>
      </div>

      {/* Display for Blockchain Tokens */}
      {selectedBlockchain && (
        <div>
          <h3>Tokens on {selectedBlockchain}</h3>
          {isLoadingBlockchainTokens ? (
            <p>Loading tokens for {selectedBlockchain}...</p>
          ) : blockchainTokens.length > 0 ? (
            <div style={{ overflowX: 'auto', maxWidth: '100%', border: '1px solid #ddd', borderRadius: '4px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f0f0f0' }}>
                    <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Name</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Symbol</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Price (USD)</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Market Cap (USD)</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Volume (24h)</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Change (24h)</th>
                  </tr>
                </thead>
                <tbody>
                  {blockchainTokens.map(token => (
                    <tr key={token.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{token.name}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{token.symbol.toUpperCase()}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>${token.current_price ? token.current_price.toLocaleString() : 'N/A'}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>${token.market_cap ? token.market_cap.toLocaleString() : 'N/A'}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>${token.total_volume ? token.total_volume.toLocaleString() : 'N/A'}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{token.price_change_percentage_24h ? token.price_change_percentage_24h.toFixed(2) + '%' : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No tokens found for {selectedBlockchain} or data is unavailable.</p>
          )}
        </div>
      )}
       {!selectedBlockchain && (
        <p>Please select a blockchain to view its tokens.</p>
      )}
    </div>
  );
};

export default BlockchainDataViewer;
