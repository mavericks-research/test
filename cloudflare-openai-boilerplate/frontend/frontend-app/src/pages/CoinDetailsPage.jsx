import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCoinDetails, getCoinMarketChart } from '../../services/cryptoService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CoinDetailsPage = () => {
  const { coinId } = useParams();
  const navigate = useNavigate();
  const [coinData, setCoinData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCoinData = async () => {
      try {
        setLoading(true);
        setError(null);

        const details = await getCoinDetails(coinId);
        setCoinData(details);

        const marketChart = await getCoinMarketChart(coinId, 'usd', 7); // 7 days data
        setChartData(marketChart.prices.map(price => ({
          date: new Date(price[0]).toLocaleDateString(),
          price: price[1],
        })));

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (coinId) {
      fetchCoinData();
    }
  }, [coinId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!coinData) {
    return <div>No coin data found.</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: '20px' }}>
        &larr; Back
      </button>
      <h1>{coinData.name} ({coinData.symbol.toUpperCase()})</h1>
      <div dangerouslySetInnerHTML={{ __html: coinData.description?.en }} />

      <h2>Current Price</h2>
      <p>${coinData.market_data?.current_price?.usd?.toLocaleString()}</p>

      <h2>Market Cap</h2>
      <p>${coinData.market_data?.market_cap?.usd?.toLocaleString()}</p>

      <h2>Price Chart (Last 7 Days)</h2>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="price" stroke="#8884d8" activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p>No chart data available.</p>
      )}
    </div>
  );
};

export default CoinDetailsPage;
