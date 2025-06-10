import React, { useState, useEffect } from 'react';
import { getGlobalMarketData } from '../services/cryptoService';

const GlobalMarketOverview = () => {
  const [marketData, setMarketData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMarketData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getGlobalMarketData();
        // The API often nests the actual data inside a "data" object
        setMarketData(response.data || response);
      } catch (err) {
        console.error('Error fetching global market data:', err);
        setError(err.message || 'Failed to fetch global market data');
        setMarketData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarketData();
  }, []);

  const formatCurrency = (value, currency = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value) => {
    return `${Number(value).toFixed(2)}%`;
  };

  if (isLoading) {
    return <p style={styles.message}>Loading global market overview...</p>;
  }

  if (error) {
    return <p style={{ ...styles.message, color: 'red' }}>Error: {error}</p>;
  }

  if (!marketData) {
    return <p style={styles.message}>No global market data found.</p>;
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>Global Cryptocurrency Market Overview</h2>
      <div style={styles.grid}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Total Market Cap</h3>
          <p style={styles.cardValue}>{formatCurrency(marketData.total_market_cap?.usd)}</p>
        </div>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Total Volume (24h)</h3>
          <p style={styles.cardValue}>{formatCurrency(marketData.total_volume?.usd)}</p>
        </div>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Active Cryptocurrencies</h3>
          <p style={styles.cardValue}>{marketData.active_cryptocurrencies?.toLocaleString()}</p>
        </div>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Ongoing ICOs</h3>
          <p style={styles.cardValue}>{marketData.ongoing_icos?.toLocaleString()}</p>
        </div>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Ended ICOs</h3>
          <p style={styles.cardValue}>{marketData.ended_icos?.toLocaleString()}</p>
        </div>
         <div style={styles.card}>
          <h3 style={styles.cardTitle}>Markets</h3>
          <p style={styles.cardValue}>{marketData.markets?.toLocaleString()}</p>
        </div>
      </div>

      <h3 style={{ ...styles.header, fontSize: '1.3em', marginTop: '30px' }}>Market Cap Dominance</h3>
      <div style={styles.grid}>
        {marketData.market_cap_percentage && Object.entries(marketData.market_cap_percentage).map(([key, value]) => (
          <div style={styles.card} key={key}>
            <h4 style={styles.cardTitleSmall}>{key.toUpperCase()} Dominance</h4>
            <p style={styles.cardValueSmall}>{formatPercentage(value)}</p>
          </div>
        ))}
      </div>

      {marketData.market_cap_change_percentage_24h_usd && (
        <div style={{...styles.card, marginTop: '20px', backgroundColor: '#f9f9f9'}}>
            <h3 style={styles.cardTitle}>Market Cap Change (24h USD)</h3>
            <p style={{...styles.cardValue, color: marketData.market_cap_change_percentage_24h_usd >= 0 ? 'green' : 'red'}}>
                {formatPercentage(marketData.market_cap_change_percentage_24h_usd)}
            </p>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    fontFamily: 'Arial, sans-serif',
    maxWidth: '900px',
    margin: '20px auto',
    padding: '20px',
    boxShadow: '0 6px 12px rgba(0,0,0,0.1)',
    borderRadius: '10px',
    backgroundColor: '#fff',
  },
  header: {
    textAlign: 'center',
    color: '#2c3e50',
    marginBottom: '30px',
    fontSize: '1.8em',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
  },
  card: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    textAlign: 'center',
  },
  cardTitle: {
    margin: '0 0 10px 0',
    fontSize: '1.1em',
    color: '#34495e',
  },
  cardValue: {
    margin: 0,
    fontSize: '1.4em',
    fontWeight: 'bold',
    color: '#16a085',
  },
  cardTitleSmall: {
    margin: '0 0 8px 0',
    fontSize: '0.95em',
    color: '#34495e',
  },
  cardValueSmall: {
    margin: 0,
    fontSize: '1.2em',
    fontWeight: 'bold',
    color: '#16a085',
  },
  message: {
    textAlign: 'center',
    margin: '20px',
    fontSize: '1.1em',
    color: '#555',
  }
};

export default GlobalMarketOverview;
