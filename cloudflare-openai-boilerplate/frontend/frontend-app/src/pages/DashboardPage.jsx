import React, { useState, useEffect } from 'react'; // Added useState for WalletAnalyzer, useEffect for stock data
import CryptoDisplay from '../components/CryptoDisplay'; // Import CryptoDisplay
import StockSelector from '../components/StockSelector';
import StockQuoteDisplay from '../components/StockQuoteDisplay';
import StockHistoricalChart from '../components/StockHistoricalChart';
import BlockchainDataViewer from '../components/BlockchainDataViewer'; // New import
import { getStockProfile, getStockQuote, getStockHistoricalData } from '../services/stockService';
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
  // Stock Market Data States
  const [selectedStockSymbol, setSelectedStockSymbol] = useState('');
  const [stockProfileData, setStockProfileData] = useState(null);
  const [stockQuoteData, setStockQuoteData] = useState(null);
  const [stockHistoricalData, setStockHistoricalData] = useState(null);
  const [isStockLoading, setIsStockLoading] = useState(false);
  const [stockError, setStockError] = useState(null);

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

  const containerStyle = {
    border: '2px solid var(--color-accent)',
    borderRadius: '8px',
    padding: '20px',
    margin: '20px auto',
    maxWidth: '100%', // Changed from 900px
    overflowX: 'auto', // Added this line
    // minWidth: '750px', // Removed this line
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    boxSizing: 'border-box',
  };

  return (
    <div style={containerStyle}>
      <p>Welcome to your dashboard.</p>
      <hr />
      <CryptoDisplay />
      <hr />
      <WalletAnalyzer workerUrl={workerUrl} />
      <hr style={{ margin: '30px 0', borderColor: 'var(--color-border)' }}/>

      <div style={{ marginTop: '20px' }}>
        <h2>Stock Market Data</h2>
        <StockSelector onSymbolSubmit={handleSymbolSubmit} />

        {isStockLoading && <p>Loading stock data...</p>}
        {stockError && <p style={{ color: 'red' }}>Error: {stockError}</p>}

        {!isStockLoading && !stockError && selectedStockSymbol && (
          <div style={{ marginTop: '20px' }}>
            {stockQuoteData && <StockQuoteDisplay quoteData={stockQuoteData} profileData={stockProfileData} />}
            {stockHistoricalData && stockHistoricalData.length > 0 && (
              <StockHistoricalChart
                historicalData={stockHistoricalData}
                stockName={stockQuoteData?.name || selectedStockSymbol}
              />
            )}
            {stockHistoricalData && stockHistoricalData.length === 0 && (
              <p>No historical data points found for {stockQuoteData?.name || selectedStockSymbol}.</p>
            )}
          </div>
        )}
         {!isStockLoading && !stockError && !selectedStockSymbol && (
          <p>Enter a stock symbol above to view its data.</p>
        )}
      </div>

      <hr style={{ margin: '30px 0', borderColor: 'var(--color-border)' }}/>
      <div style={{ marginTop: '20px' }}>
        <h2>Blockchain Explorer</h2>
        <BlockchainDataViewer />
      </div>
    </div>
  );
}

export default DashboardPage;
