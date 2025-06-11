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

  const handleSymbolSubmit = async (symbol) => {
    setIsStockLoading(true);
    setStockError(null);
    setSelectedStockSymbol(symbol);
    // Clear previous data
    setStockProfileData(null);
    setStockQuoteData(null);
    setStockHistoricalData(null);

    try {
      // Using Promise.all to fetch in parallel
      // Note: FMP API often returns arrays for profile/quote even for single symbol. Service functions should handle this if needed,
      // or it can be handled here. For now, assuming service functions return the expected object/array.
      const [profile, quote, historical] = await Promise.all([
        getStockProfile(symbol),
        getStockQuote(symbol),
        getStockHistoricalData(symbol)
      ]);

      setStockProfileData(profile); // Assumes getStockProfile returns the first element if FMP returns array
      setStockQuoteData(quote);     // Assumes getStockQuote returns the first element if FMP returns array
      setStockHistoricalData(historical); // historical is expected to be an array

    } catch (error) {
      console.error("Failed to fetch stock data:", error);
      setStockError(error.message || 'Failed to fetch stock data. Please check the symbol or try again.');
    } finally {
      setIsStockLoading(false);
    }
  };

  const handleNaturalStockSearch = async () => {
    if (!naturalSearchQuery.trim()) {
      setNaturalSearchError('Please enter a search query.');
      setNaturalSearchResults([]);
      setOpenAICriteria(null);
      return;
    }
    setIsNaturalSearchLoading(true);
    setNaturalSearchError(null);
    setNaturalSearchResults([]);
    setOpenAICriteria(null);

    try {
      // Assuming API is relative to the current host if workerUrl is not explicitly for this
      const response = await fetch(`/api/stocks/natural-search?q=${encodeURIComponent(naturalSearchQuery)}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response from server.' }));
        throw new Error(errorData.error || `Network response was not ok: ${response.status}`);
      }

      const data = await response.json();
      setNaturalSearchResults(data.fmpResults || []);
      setOpenAICriteria(data.openAICriteria || null);
      if (!data.fmpResults || data.fmpResults.length === 0) {
        setNaturalSearchError('No stocks found matching your criteria.');
      }
    } catch (err) {
      console.error('Natural stock search error:', err);
      setNaturalSearchError(err.message || 'Failed to fetch natural search results.');
      setNaturalSearchResults([]);
    } finally {
      setIsNaturalSearchLoading(false);
    }
  };

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


<div className="stock-section">
        <h2>Stock Market Data</h2>
        <StockSelector onSymbolSubmit={handleSymbolSubmit} />

        {isStockLoading && <p>Loading stock data...</p>}
        {stockError && (
          <p className="error">
            Error: {stockError}
          </p>
        )}

        {!isStockLoading && !stockError && selectedStockSymbol && (
          <div>
            {stockQuoteData && (
              <StockQuoteDisplay
                quoteData={stockQuoteData}
                profileData={stockProfileData}
                currency={settings.currency}
              />
            )}

            {stockHistoricalData?.length > 0 ? (
              <StockHistoricalChart
                historicalData={stockHistoricalData}
                stockName={stockQuoteData?.name || selectedStockSymbol}
              />
            ) : (
              <p>No historical data points found for {stockQuoteData?.name || selectedStockSymbol}.</p>
            )}
          </div>
        )}

        {!isStockLoading && !stockError && !selectedStockSymbol && (
          <p>Enter a stock symbol above to view its data.</p>
        )}
      </div>

      {/* Natural Language Stock Search Section */}
      <div className="natural-stock-search-section" style={themedSectionStyle}>
        <h2>Natural Language Stock Search</h2>
        <div style={{ marginBottom: '10px' }}>
          <input
            type="text"
            value={naturalSearchQuery}
            onChange={(e) => setNaturalSearchQuery(e.target.value)}
            placeholder="e.g., 'tech stocks with high P/E and large market cap'"
            style={{ width: '70%', marginRight: '10px', padding: '8px' }}
            disabled={isNaturalSearchLoading}
          />
          <button onClick={handleNaturalStockSearch} disabled={isNaturalSearchLoading}>
            {isNaturalSearchLoading ? 'Searching...' : 'Search Stocks'}
          </button>
        </div>

        {isNaturalSearchLoading && <p>Loading search results...</p>}
        {naturalSearchError && (
          <p style={{ color: 'var(--color-error)' }}>Error: {naturalSearchError}</p>
        )}

        {openAICriteria && (
          <div style={{ marginTop: '10px', marginBottom: '10px', padding: '10px', background: settings.theme === 'dark' ? '#555' : '#f0f0f0', borderRadius: '4px' }}>
            <strong>OpenAI Extracted Criteria:</strong>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '0.9em' }}>
              {JSON.stringify(openAICriteria, null, 2)}
            </pre>
          </div>
        )}

        {naturalSearchResults.length > 0 && (
          <div>
            <h3>Search Results:</h3>
            <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
              {naturalSearchResults.map((stock, index) => (
                <li key={stock.symbol || index} style={{ marginBottom: '5px', padding: '5px', background: settings.theme === 'dark' ? '#3c3c3c' : '#f9f9f9', borderRadius: '3px' }}>
                  <strong>{stock.symbol}</strong>: {stock.companyName} (Price: {stock.price || 'N/A'}, Sector: {stock.sector || 'N/A'})
                </li>
              ))}
            </ul>
          </div>
        )}
        {!isNaturalSearchLoading && naturalSearchResults.length === 0 && !naturalSearchError && openAICriteria && (
          <p>No stocks found matching the extracted criteria.</p>
        )}
      </div>
      {/* End of Natural Language Stock Search Section */}

    </div>
  );
}

export default DashboardPage;
