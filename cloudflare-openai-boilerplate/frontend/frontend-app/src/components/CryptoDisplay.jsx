import React, { useState, useEffect } from 'react';
import { getCoinMarketChart } from '../../services/cryptoService.js'; // Adjusted path
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

  // New states for coin market chart
  const [selectedChartDays, setSelectedChartDays] = useState(30);
  const [coinChartData, setCoinChartData] = useState(null);
  const [isCoinChartLoading, setIsCoinChartLoading] = useState(false);
  const [coinChartError, setCoinChartError] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

  const coinOptions = [
    { value: 'bitcoin', label: 'Bitcoin' },
    { value: 'ethereum', label: 'Ethereum' },
    { value: 'tether', label: 'Tether' },
    { value: 'xrp', label: 'XRP' },
    { value: 'binancecoin', label: 'BNB' },
    { value: 'solana', label: 'Solana' },
    { value: 'usd-coin', label: 'USDC' },
    { value: 'dogecoin', label: 'Dogecoin' },
    { value: 'tron', label: 'TRON' },
    { value: 'cardano', label: 'Cardano' },
    { value: 'staked-ether', label: 'Lido Staked Ether' },
    { value: 'wrapped-bitcoin', label: 'Wrapped Bitcoin' },
    { value: 'hyperliquid', label: 'Hyperliquid' },
    { value: 'sui', label: 'Sui' },
    { value: 'wrapped-steth', label: 'Wrapped stETH' },
    { value: 'chainlink', label: 'Chainlink' },
    { value: 'avalanche-2', label: 'Avalanche' },
    { value: 'leo-token', label: 'LEO Token' },
    { value: 'stellar', label: 'Stellar' },
    { value: 'bitcoin-cash', label: 'Bitcoin Cash' }
  ];

  // Effect for current price (existing)
  useEffect(() => {
    const fetchCurrentPrice = async () => {
      if (!selectedCoin) return;
      setCurrentPrice(null);
      setMarketCap(null);
      setVolume24h(null);
      setChange24h(null);
      setPercentageChange(null);

      try {
        const response = await fetch(`${API_BASE_URL}/api/crypto/current?coins=${selectedCoin}&currencies=usd`);
        if (!response.ok) throw new Error(`Error fetching current price data: ${response.statusText}`);
        const data = await response.json();
        const coinData = data[selectedCoin];
        if (coinData) {
          setCurrentPrice(coinData.usd || null);
          setMarketCap(coinData.usd_market_cap || null);
          setVolume24h(coinData.usd_24h_vol || null);
          setChange24h(coinData.usd_24h_change || null);
        } else console.error('Current price and market data not found in response:', data);
      } catch (error) {
        console.error("Failed to fetch current price and market data:", error);
        setCurrentPrice(null); setMarketCap(null); setVolume24h(null); setChange24h(null);
      }
    };
    if (selectedCoin) fetchCurrentPrice();
    else {
      setCurrentPrice(null); setMarketCap(null); setVolume24h(null); setChange24h(null);
      setHistoricalPrice(null); setOpenAiInsights(null); setPercentageChange(null);
    }
  }, [selectedCoin, API_BASE_URL]);

  // Effect for single-date historical price and AI insights (existing)
  useEffect(() => {
    const fetchEnrichedHistoricalData = async () => {
      if (!selectedCoin || !selectedDate) return;
      setIsLoadingEnrichedData(true);
      setHistoricalPrice(null); setOpenAiInsights(null); setPercentageChange(null);
      const [year, month, day] = selectedDate.split('-');
      const formattedDate = `${day}-${month}-${year}`;
      try {
        const response = await fetch(`${API_BASE_URL}/api/crypto/enriched-historical-data?coinId=${selectedCoin}&date=${formattedDate}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error fetching enriched historical data: ${errorData.error || response.statusText}`);
        }
        const data = await response.json();
        if (data.coinGeckoData?.market_data?.current_price?.usd) {
          setHistoricalPrice(data.coinGeckoData.market_data.current_price.usd);
        } else {
          console.error('Historical price data not found in API response:', data);
          setHistoricalPrice(null);
        }
        setOpenAiInsights(data.openAiInsights || 'No insights available.');
      } catch (error) {
        console.error("Failed to fetch enriched historical data:", error);
        setHistoricalPrice(null); setOpenAiInsights('Failed to load insights.');
      } finally {
        setIsLoadingEnrichedData(false);
      }
    };
    if (selectedCoin && selectedDate) fetchEnrichedHistoricalData();
  }, [selectedCoin, selectedDate, API_BASE_URL]);

  // Effect for percentage change (existing)
  useEffect(() => {
    if (currentPrice !== null && historicalPrice !== null && historicalPrice !== 0) {
      const change = ((currentPrice - historicalPrice) / historicalPrice) * 100;
      setPercentageChange(change.toFixed(2));
    } else setPercentageChange(null);
  }, [currentPrice, historicalPrice]);

  // New useEffect for fetching coin market chart data
  useEffect(() => {
    if (selectedCoin && selectedChartDays) {
      const fetchCoinChartData = async () => {
        setIsCoinChartLoading(true);
        setCoinChartError(null);
        setCoinChartData(null); // Clear previous chart data
        try {
          let data = await getCoinMarketChart(selectedCoin, selectedChartDays);
          if (Array.isArray(data)) {
            // Ensure data is sorted by date, as Recharts expects this for time series lines
            data.sort((a, b) => new Date(a.date) - new Date(b.date));
            setCoinChartData(data);
          } else {
            throw new Error("Chart data is not in expected format (array)");
          }
        } catch (error) {
          console.error("Failed to fetch coin market chart:", error);
          setCoinChartError(error.message || 'Failed to load chart data.');
          setCoinChartData(null);
        } finally {
          setIsCoinChartLoading(false);
        }
      };
      fetchCoinChartData();
    } else {
      setCoinChartData(null); // Clear chart if no coin selected or days not set
    }
  }, [selectedCoin, selectedChartDays]);

  const chartButtonContainerStyle = {
    margin: '10px 0',
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  };

  const chartButtonStyle = (days) => ({
    padding: '8px 12px',
    border: '1px solid #007bff',
    borderRadius: '4px',
    backgroundColor: selectedChartDays === days ? '#007bff' : 'white',
    color: selectedChartDays === days ? 'white' : '#007bff',
    cursor: 'pointer',
    fontSize: '14px',
  });


  return (
    <div style={{padding: '20px', border: '1px solid #ddd', borderRadius: '8px', marginTop: '20px'}}>
      <h2 style={{textAlign: 'center', marginBottom: '20px'}}>Crypto Coin Data Viewer</h2>

      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="coin-select" style={{marginRight: '10px', fontWeight: 'bold'}}>Select Coin:</label>
        <select
          id="coin-select"
          value={selectedCoin}
          onChange={(e) => setSelectedCoin(e.target.value)}
          style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '16px' }}
        >
          <option value="">Select a Coin</option>
          {coinOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {selectedCoin && (
        <>
          <div style={{border: '1px solid #eee', padding: '15px', borderRadius: '5px', marginBottom: '20px'}}>
            <h3>Current Data for {coinOptions.find(c => c.value === selectedCoin)?.label || selectedCoin}</h3>
            {currentPrice !== null ? (
              <>
                <p>Price: ${currentPrice.toLocaleString()}</p>
                {marketCap !== null && <p>Market Cap: ${marketCap.toLocaleString()}</p>}
                {volume24h !== null && <p>24h Volume: ${volume24h.toLocaleString()}</p>}
                {change24h !== null && <p>24h Change: {change24h.toFixed(2)}%</p>}
              </>
            ) : <p>Loading current data...</p>}
          </div>

          <div style={{border: '1px solid #eee', padding: '15px', borderRadius: '5px', marginBottom: '20px'}}>
            <div style={{display: 'flex', alignItems: 'center', marginBottom: '10px'}}>
                <label htmlFor="date-picker" style={{marginRight: '10px', fontWeight: 'bold'}}>Select Date for Historical Snapshot:</label>
                <input
                type="date"
                id="date-picker"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
            </div>
            {isLoadingEnrichedData ? <p>Loading historical snapshot...</p> : (
                <>
                    {historicalPrice !== null && (
                        <div>
                        <h3>Price on {selectedDate}:</h3>
                        <p>${historicalPrice.toLocaleString()}</p>
                        </div>
                    )}
                    {percentageChange !== null && currentPrice !== null && historicalPrice !== null && (
                        <div>
                        <h3>Percentage Change (Current vs {selectedDate}):</h3>
                        <p>{percentageChange}%</p>
                        </div>
                    )}
                    <div>
                        <h3>AI Insights (for {selectedDate}):</h3>
                        <p>{openAiInsights || 'No AI insights available for the selected date or an error occurred.'}</p>
                    </div>
                </>
            )}
            {!historicalPrice && !isLoadingEnrichedData && <p>Historical price data not available for {selectedDate}. Select date to load.</p>}
          </div>

          {/* Coin Market Chart Section */}
          <div style={{border: '1px solid #eee', padding: '15px', borderRadius: '5px', marginTop: '20px'}}>
            <h4 style={{marginBottom: '10px'}}>Price Chart ({coinOptions.find(c => c.value === selectedCoin)?.label || selectedCoin})</h4>
            <div style={chartButtonContainerStyle}>
              {[7, 30, 90, 365].map(days => (
                <button
                  key={days}
                  onClick={() => setSelectedChartDays(days)}
                  style={chartButtonStyle(days)}
                >
                  {days === 365 ? '1Y' : `${days}D`}
                </button>
              ))}
            </div>

            {isCoinChartLoading && <p>Loading chart data...</p>}
            {coinChartError && <p style={{ color: 'red' }}>Error: {coinChartError}</p>}
            {!isCoinChartLoading && !coinChartError && coinChartData && coinChartData.length > 0 && (
              <div style={{ width: '100%', height: 350, marginTop: '10px' }}>
                <ResponsiveContainer>
                  <LineChart data={coinChartData} margin={{ top: 5, right: 25, left: 25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ccc"/>
                    <XAxis dataKey="date" stroke="#333" />
                    <YAxis
                        domain={['auto', 'auto']}
                        stroke="#333"
                        tickFormatter={(value) => `$${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
                    />
                    <Tooltip
                        formatter={(value) => [`$${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, "Price"]}
                        labelFormatter={(label) => `Date: ${label}`}
                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '5px', padding: '10px', border: '1px solid #ccc' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }}/>
                    <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#007bff"
                        strokeWidth={2}
                        name={coinOptions.find(c => c.value === selectedCoin)?.label || selectedCoin}
                        dot={false}
                        activeDot={{ r: 6, stroke: '#0056b3', fill: '#007bff' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            {!isCoinChartLoading && !coinChartError && (!coinChartData || coinChartData.length === 0) && selectedCoin && (
              <p style={{marginTop: '10px'}}>No chart data available for the selected period ({selectedChartDays} days).</p>
            )}
          </div>
        </>
      )}

      {!selectedCoin && <p style={{textAlign: 'center', marginTop: '20px'}}>Please select a coin to view its data.</p>}
    </div>
  );
};

export default CryptoDisplay;
