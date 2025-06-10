import React, { useState, useEffect } from 'react';
import { getTrendingCoins } from '../services/cryptoService';

const TrendingCoins = () => {
  const [trendingCoins, setTrendingCoins] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTrending = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getTrendingCoins();
        setTrendingCoins(data.coins || []); // Assuming the API returns { coins: [...] }
      } catch (err) {
        console.error('Error fetching trending coins:', err);
        setError(err.message || 'Failed to fetch trending coins');
        setTrendingCoins([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrending();
  }, []);

  if (isLoading) {
    return <p style={{ textAlign: 'center', margin: '20px' }}>Loading trending coins...</p>;
  }

  if (error) {
    return <p style={{ textAlign: 'center', margin: '20px', color: 'red' }}>Error: {error}</p>;
  }

  if (trendingCoins.length === 0) {
    return <p style={{ textAlign: 'center', margin: '20px' }}>No trending coins found.</p>;
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '20px auto', padding: '20px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', borderRadius: '8px' }}>
      <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '25px' }}>Trending Coins</h2>
      <ul style={{ listStyleType: 'none', padding: 0 }}>
        {trendingCoins.map(coin => (
          <li key={coin.item.id || coin.item.coin_id} style={{ display: 'flex', alignItems: 'center', padding: '15px 10px', borderBottom: '1px solid #eee', transition: 'background-color 0.2s ease' }}>
            <img src={coin.item.small} alt={coin.item.name} style={{ width: '32px', height: '32px', marginRight: '15px', borderRadius: '50%' }} />
            <div style={{ flexGrow: 1 }}>
              <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1em', color: '#555' }}>{coin.item.name} ({coin.item.symbol.toUpperCase()})</h3>
              <p style={{ margin: 0, fontSize: '0.9em', color: '#777' }}>Market Cap Rank: {coin.item.market_cap_rank || 'N/A'}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TrendingCoins;
