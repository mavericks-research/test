import React, { useState, useEffect } from 'react';

const CryptoDisplay = () => {
  const [selectedCoin, setSelectedCoin] = useState('bitcoin');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [currentPrice, setCurrentPrice] = useState(null);
  const [historicalPrice, setHistoricalPrice] = useState(null);
  const [percentageChange, setPercentageChange] = useState(null);

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
      setCurrentPrice(null); // Reset while fetching
      setPercentageChange(null); // Reset
      try {
        const response = await fetch(`${API_BASE_URL}/api/crypto/current?coins=${selectedCoin}&currencies=usd`);
        if (!response.ok) {
          throw new Error(`Error fetching current price: ${response.statusText}`);
        }
        const data = await response.json();
        if (data[selectedCoin] && data[selectedCoin].usd) {
          setCurrentPrice(data[selectedCoin].usd);
        } else {
          console.error('Current price data not found in response:', data);
          setCurrentPrice(null);
        }
      } catch (error) {
        console.error("Failed to fetch current price:", error);
        setCurrentPrice(null);
      }
    };

    fetchCurrentPrice();
  }, [selectedCoin]);

  useEffect(() => {
    const fetchHistoricalPrice = async () => {
      if (!selectedCoin || !selectedDate) return;
      setHistoricalPrice(null); // Reset while fetching
      setPercentageChange(null); // Reset

      // Format date from YYYY-MM-DD to DD-MM-YYYY
      const [year, month, day] = selectedDate.split('-');
      const formattedDate = `${day}-${month}-${year}`; // This is for the backend API parameter

      try {
        const response = await fetch(`${API_BASE_URL}/api/crypto/historical?coin=${selectedCoin}&date=${formattedDate}`);
        if (!response.ok) {
          throw new Error(`Error fetching historical price: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.market_data && data.market_data.current_price && data.market_data.current_price.usd) {
          setHistoricalPrice(data.market_data.current_price.usd);
        } else {
          console.error('Historical price data not found in response:', data);
          setHistoricalPrice(null);
        }
      } catch (error) {
        console.error("Failed to fetch historical price:", error);
        setHistoricalPrice(null);
      }
    };

    fetchHistoricalPrice();
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
          onChange={(e) => setSelectedCoin(e.target.value)}
        >
          {coinOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="date-picker">Select Date: </label>
        <input
          type="date"
          id="date-picker"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      {currentPrice !== null ? (
        <div>
          <h3>Current Price ({coinOptions.find(c => c.value === selectedCoin)?.label}):</h3>
          <p>${currentPrice.toLocaleString()}</p>
        </div>
      ) : <p>Loading current price...</p>}

      {historicalPrice !== null ? (
        <div>
          <h3>Price on {selectedDate} ({coinOptions.find(c => c.value === selectedCoin)?.label}):</h3>
          <p>${historicalPrice.toLocaleString()}</p>
        </div>
      ) : <p>Loading historical price for {selectedDate} or data not available...</p>}

      {percentageChange !== null ? (
        <div>
          <h3>Percentage Change:</h3>
          <p>{percentageChange}%</p>
        </div>
      ) : (currentPrice !== null && historicalPrice !== null && <p>Calculating percentage change...</p>)}

      {!selectedCoin && <p>Please select a coin.</p>}
    </div>
  );
};

export default CryptoDisplay;
