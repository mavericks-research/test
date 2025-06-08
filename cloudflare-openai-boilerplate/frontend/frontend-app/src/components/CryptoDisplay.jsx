import React, { useState, useEffect } from 'react';

const CryptoDisplay = () => {
  const [selectedCoin, setSelectedCoin] = useState('bitcoin');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [currentPrice, setCurrentPrice] = useState(null);
  const [marketCap, setMarketCap] = useState(null);
  const [volume24h, setVolume24h] = useState(null);
  const [change24h, setChange24h] = useState(null);
  const [historicalPrice, setHistoricalPrice] = useState(null);
  const [percentageChange, setPercentageChange] = useState(null);
  const [openAiInsights, setOpenAiInsights] = useState(null);
  const [isLoadingEnrichedData, setIsLoadingEnrichedData] = useState(false);
  const [selectedBlockchain, setSelectedBlockchain] = useState('');
  const [blockchainTokens, setBlockchainTokens] = useState([]);
  const [isLoadingBlockchainTokens, setIsLoadingBlockchainTokens] = useState(false);

  // Define API_BASE_URL using Vite's import.meta.env
  // Fallback to empty string for local dev (uses Vite proxy with relative paths)
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

  const coinOptions = [
    { value: 'bitcoin', label: 'Bitcoin' },
    { value: 'ethereum', label: 'Ethereum' },
    { value: 'dogecoin', label: 'Dogecoin' },
  ];

  useEffect(() => {
    const fetchCurrentPrice = async () => {
      if (!selectedCoin) return;
      setCurrentPrice(null);
      setMarketCap(null);
      setVolume24h(null);
      setChange24h(null);
      setPercentageChange(null); // Reset dependent calculations

      try {
        // The backend /api/crypto/current endpoint was updated to include these details
        const response = await fetch(`${API_BASE_URL}/api/crypto/current?coins=${selectedCoin}&currencies=usd`);
        if (!response.ok) {
          throw new Error(`Error fetching current price data: ${response.statusText}`);
        }
        const data = await response.json();
        const coinData = data[selectedCoin];

        if (coinData) {
          setCurrentPrice(coinData.usd || null);
          setMarketCap(coinData.usd_market_cap || null);
          setVolume24h(coinData.usd_24h_vol || null);
          setChange24h(coinData.usd_24h_change || null);
        } else {
          console.error('Current price and market data not found in response:', data);
        }
      } catch (error) {
        console.error("Failed to fetch current price and market data:", error);
        // Reset all fields on error
        setCurrentPrice(null);
        setMarketCap(null);
        setVolume24h(null);
        setChange24h(null);
      }
    };

    if (selectedCoin) { // Only fetch if a coin is selected
      fetchCurrentPrice();
    } else { // Clear data if no coin is selected (e.g., when focusing on blockchain view)
      setCurrentPrice(null);
      setMarketCap(null);
      setVolume24h(null);
      setChange24h(null);
      setHistoricalPrice(null);
      setOpenAiInsights(null);
      setPercentageChange(null);
    }
  }, [selectedCoin, API_BASE_URL]);

  // New useEffect for fetching tokens by blockchain
  useEffect(() => {
    const fetchTokensByBlockchain = async () => {
      if (!selectedBlockchain) {
        setBlockchainTokens([]); // Clear tokens if no blockchain is selected
        return;
      }

      setIsLoadingBlockchainTokens(true);
      setBlockchainTokens([]); // Clear previous results
      // Also clear single coin data when focusing on blockchain
      // setSelectedCoin('');

      let platformApiName = '';
      switch (selectedBlockchain) {
        case 'Ethereum':
          platformApiName = 'ethereum';
          break;
        case 'Binance Smart Chain':
          platformApiName = 'bsc';
          break;
        case 'Solana':
          platformApiName = 'solana';
          break;
        default:
          setIsLoadingBlockchainTokens(false);
          return; // Should not happen if select options are controlled
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

  useEffect(() => {
    const fetchEnrichedHistoricalData = async () => {
      if (!selectedCoin || !selectedDate) return;

      setIsLoadingEnrichedData(true);
      setHistoricalPrice(null);
      setOpenAiInsights(null);
      setPercentageChange(null);

      const [year, month, day] = selectedDate.split('-');
      const formattedDate = `${day}-${month}-${year}`; // For the backend API parameter

      try {
        // Corrected query parameter names: coinId instead of coin
        const response = await fetch(`${API_BASE_URL}/api/crypto/enriched-historical-data?coinId=${selectedCoin}&date=${formattedDate}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: response.statusText }));
          throw new Error(`Error fetching enriched historical data: ${errorData.error || response.statusText}`);
        }
        const data = await response.json();

        if (data.coinGeckoData && data.coinGeckoData.market_data && data.coinGeckoData.market_data.current_price && data.coinGeckoData.market_data.current_price.usd) {
          setHistoricalPrice(data.coinGeckoData.market_data.current_price.usd);
        } else {
          console.error('Historical price data not found in API response:', data);
          setHistoricalPrice(null);
        }

        if (data.openAiInsights) {
          setOpenAiInsights(data.openAiInsights);
        } else {
          console.error('OpenAI insights not found in API response:', data);
          setOpenAiInsights('No insights available.');
        }
      } catch (error) {
        console.error("Failed to fetch enriched historical data:", error);
        setHistoricalPrice(null);
        setOpenAiInsights('Failed to load insights.');
      } finally {
        setIsLoadingEnrichedData(false);
      }
    };

    fetchEnrichedHistoricalData();
  }, [selectedCoin, selectedDate]);

  useEffect(() => {
    if (currentPrice !== null && historicalPrice !== null && historicalPrice !== 0) {
      const change = ((currentPrice - historicalPrice) / historicalPrice) * 100;
      setPercentageChange(change.toFixed(2));
    } else {
      setPercentageChange(null);
    }
  }, [currentPrice, historicalPrice]);

  return (
    <div>
      <h2>Crypto Price Viewer</h2>

      <div>
        <label htmlFor="coin-select">Select Coin: </label>
        <select
          id="coin-select"
          value={selectedCoin}
          onChange={(e) => {
            setSelectedCoin(e.target.value);
            // Optionally clear blockchain selection when a specific coin is chosen
            // setSelectedBlockchain('');
            // setBlockchainTokens([]);
          }}
        >
          <option value="">Select a Coin</option> {/* Allow unselecting coin */}
          {coinOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Blockchain Selector */}
      <div>
        <label htmlFor="blockchain-select">Select Blockchain: </label>
        <select
          id="blockchain-select"
          value={selectedBlockchain}
          onChange={(e) => {
            setSelectedBlockchain(e.target.value);
            if (e.target.value) { // If a blockchain is selected
              setSelectedCoin(''); // Clear selected coin to avoid confusion
            }
          }}
        >
          <option value="">Select Blockchain</option>
          <option value="Ethereum">Ethereum</option>
          <option value="Binance Smart Chain">Binance Smart Chain</option>
          <option value="Solana">Solana</option>
        </select>
      </div>

      {/* Date picker - only relevant if a single coin is selected */}
      {selectedCoin && (
      <div>
        <label htmlFor="date-picker">Select Date for Historical Data: </label>
        <input
          type="date"
          id="date-picker"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>
      )} {/* Correctly closing the parenthesis for the date picker conditional */}

      {/* Display for single selected coin */}
      {selectedCoin && (
        <>
          {currentPrice !== null ? (
            <div>
              <h3>Current Data for {coinOptions.find(c => c.value === selectedCoin)?.label || selectedCoin}:</h3>
              <p>Price: ${currentPrice.toLocaleString()}</p>
              {marketCap !== null && <p>Market Cap: ${marketCap.toLocaleString()}</p>}
              {volume24h !== null && <p>24h Volume: ${volume24h.toLocaleString()}</p>}
              {change24h !== null && <p>24h Change: {change24h.toFixed(2)}%</p>}
            </div>
          ) : <p>Loading current data for {selectedCoin}...</p>}

          {historicalPrice !== null ? (
            <div>
              <h3>Price on {selectedDate} ({coinOptions.find(c => c.value === selectedCoin)?.label || selectedCoin}):</h3>
              <p>${historicalPrice.toLocaleString()}</p>
            </div>
          ) : isLoadingEnrichedData ? (
            <p>Loading historical price for {selectedDate}...</p>
          ) : (
            <p>Historical price data not available for {selectedDate}. Select date to load.</p>
          )}

          {percentageChange !== null && currentPrice !== null && historicalPrice !== null ? (
            <div>
              <h3>Percentage Change (Current vs {selectedDate}):</h3>
              <p>{percentageChange}%</p>
            </div>
          ) : (selectedCoin && currentPrice !== null && historicalPrice !== null && !isLoadingEnrichedData && <p>Calculating percentage change...</p>)}

          <div>
            <h3>AI Insights (for {selectedCoin} on {selectedDate}):</h3>
            {isLoadingEnrichedData ? (
              <p>Loading AI insights...</p>
            ) : openAiInsights ? (
              <p>{openAiInsights}</p>
            ) : (
              <p>No AI insights available for the selected date or an error occurred. Select date to load.</p>
            )}
          </div>
        </>
      )}

      {/* Display for Blockchain Tokens */}
      {selectedBlockchain && (
        <div style={{ fontSize: '0.9em' }}>
          <h3>Tokens on {selectedBlockchain}</h3>
          {isLoadingBlockchainTokens ? (
            <p>Loading tokens for {selectedBlockchain}...</p>
          ) : blockchainTokens.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Price (USD)</th>
                  <th>Market Cap (USD)</th>
                  <th>Volume (24h)</th>
                  <th>Change (24h)</th>
                </tr>
              </thead>
              <tbody>
                {blockchainTokens.map(token => (
                  <tr key={token.id}>
                    <td>{token.symbol.toUpperCase()}</td>
                    <td>${token.current_price ? token.current_price.toLocaleString() : 'N/A'}</td>
                    <td>${token.market_cap ? token.market_cap.toLocaleString() : 'N/A'}</td>
                    <td>${token.total_volume ? token.total_volume.toLocaleString() : 'N/A'}</td>
                    <td>{token.price_change_percentage_24h ? token.price_change_percentage_24h.toFixed(2) + '%' : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No tokens found for {selectedBlockchain} or data is unavailable.</p>
          )}
        </div>
      )}
      {!selectedCoin && !selectedBlockchain && <p>Please select a coin or a blockchain to view data.</p>}
    </div>
  );
};

export default CryptoDisplay;
