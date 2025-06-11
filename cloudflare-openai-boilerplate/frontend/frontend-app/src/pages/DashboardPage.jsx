import React, { useState, useEffect, useContext } from 'react'; // Added useState for WalletAnalyzer, useEffect for stock data, useContext for settings
import { SettingsContext } from '../contexts/SettingsContext.jsx'; // Import SettingsContext
import CryptoDisplay from '../components/CryptoDisplay'; // Import CryptoDisplay
import StockSelector from '../components/StockSelector';
import StockQuoteDisplay from '../components/StockQuoteDisplay';
import StockHistoricalChart from '../components/StockHistoricalChart';
import BlockchainDataViewer from '../components/BlockchainDataViewer';
import TrendingCoins from '../components/TrendingCoins'; // New import
import GlobalMarketOverview from '../components/GlobalMarketOverview'; // New import
import NewsWidget from '../components/NewsWidget'; // Import NewsWidget
import { getStockProfile, getStockQuote, getStockHistoricalData } from '../services/stockService';
import './DashboardPage.css'; // Import the CSS file
// Removed NavigationBar import

function WalletAnalyzer({ workerUrl }) {
  const [walletAddress, setWalletAddress] = useState('');
  const [summary, setSummary] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!walletAddress) {
      setError('Please enter a wallet address.');
      return;
    }
    setIsLoading(true);
    setError('');
    setSummary('');
    setTransactions([]);

    try {
      const response = await fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Network response was not ok: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      setSummary(data.summary || 'No summary returned.');
      setTransactions(data.transactionData || []);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message || 'Failed to fetch data.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <h2>Wallet Activity Analyzer</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
          placeholder="Enter Ethereum Wallet Address"
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Analyzing...' : 'Get Summary'}
        </button>
      </form>

      {error && <p style={{ color: 'var(--color-error)' }}>Error: {error}</p>}
      {summary && (
        <div>
          <h3>AI Summary:</h3>
          <p>{summary}</p>
        </div>
      )}
      {transactions.length > 0 && (
        <div>
          <h3>Transactions:</h3>
          <pre style={{ whiteSpace: 'pre', background: '#f4f4f4', padding: '10px', maxHeight: '300px', overflowY: 'auto' }}>
            {JSON.stringify(transactions, null, 2)}
          </pre>
        </div>
      )}
    </>
  );
}

function DashboardPage({ workerUrl }) {
  const settings = useContext(SettingsContext);
  console.log("Dashboard displaying with settings:", settings);
  console.log("Current currency from context:", settings.currency);

  // Stock Market Data States
  const [selectedStockSymbol, setSelectedStockSymbol] = useState('');
  const [stockProfileData, setStockProfileData] = useState(null);
  const [stockQuoteData, setStockQuoteData] = useState(null);
  const [stockHistoricalData, setStockHistoricalData] = useState(null);
  const [isStockLoading, setIsStockLoading] = useState(false);
  const [stockError, setStockError] = useState(null);

  // Natural Language Stock Search States
  const [naturalSearchQuery, setNaturalSearchQuery] = useState('');
  const [naturalSearchResults, setNaturalSearchResults] = useState([]);
  const [isNaturalSearchLoading, setIsNaturalSearchLoading] = useState(false);
  const [naturalSearchError, setNaturalSearchError] = useState(null);
  const [openAICriteria, setOpenAICriteria] = useState(null);

  const containerStyle = {
    border: '2px solid var(--color-accent)',
    borderRadius: '8px',
    padding: '20px',
    margin: '20px auto',
    maxWidth: '100%', // Changed from 900px
    overflowX: 'auto', // Added this line
    // minWidth: '750px', // Removed this line
    backgroundColor: settings.theme === 'dark' ? '#333' : '#FFF', // Theme-based background
    color: settings.theme === 'dark' ? '#FFF' : '#333', // Theme-based text color
    boxSizing: 'border-box',
  };

  const themedSectionStyle = {
    backgroundColor: settings.theme === 'dark' ? '#444' : '#EEE', // Slightly different for contrast
    color: settings.theme === 'dark' ? '#FFF' : '#333',
    padding: '10px',
    borderRadius: '4px',
    margin: '10px 0',
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <p>Welcome to your dashboard.</p>
        <p>Current Data Refresh Interval: {settings.dataRefreshInterval}</p>
      </div>

      
      <div className="dashboard-grid">
        <div className="widget">
          <NewsWidget />
        </div>

        <div className="widget">
          <GlobalMarketOverview />
          <hr />
          <TrendingCoins />
          <hr />
          <CryptoDisplay currency={settings.currency} />
          <hr />
          <WalletAnalyzer workerUrl={workerUrl} />
        </div>

        <div className="widget">
          <BlockchainDataViewer />
        </div>
      </div>


    </div>
  );
}

export default DashboardPage;
