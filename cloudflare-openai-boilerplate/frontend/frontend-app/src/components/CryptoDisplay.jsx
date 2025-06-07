import React, { useState, useEffect } from 'react';

const CryptoDisplay = () => {
  const [selectedCoin, setSelectedCoin] = useState('bitcoin');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [currentPrice, setCurrentPrice] = useState(null);
  const [historicalPrice, setHistoricalPrice] = useState(null);
  const [percentageChange, setPercentageChange] = useState(null);
  const [openAiInsights, setOpenAiInsights] = useState(null);
  const [isLoadingEnrichedData, setIsLoadingEnrichedData] = useState(false);

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
      ) : isLoadingEnrichedData ? (
        <p>Loading historical price for {selectedDate}...</p>
      ) : (
        <p>Historical price data not available for {selectedDate}.</p>
      )}

      {percentageChange !== null ? (
        <div>
          <h3>Percentage Change:</h3>
          <p>{percentageChange}%</p>
        </div>
      ) : (currentPrice !== null && historicalPrice !== null && !isLoadingEnrichedData && <p>Calculating percentage change...</p>)}

      <div>
        <h3>AI Insights:</h3>
        {isLoadingEnrichedData ? (
          <p>Loading AI insights...</p>
        ) : openAiInsights ? (
          <p>{openAiInsights}</p>
        ) : (
          <p>No AI insights available for the selected date or an error occurred.</p>
        )}
      </div>

      {!selectedCoin && <p>Please select a coin.</p>}
    </div>
  );
};

export default CryptoDisplay;
