import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

// Assume the Cloudflare Worker is deployed at this URL
// The user will need to replace this with their actual worker URL.
const WORKER_URL = 'https://worker-backend.lumexai.workers.dev'; // Placeholder

function App() {
  const [walletAddress, setWalletAddress] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [transactionData, setTransactionData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!walletAddress.trim()) {
      setError('Please enter a wallet address.');
      return;
    }
    setLoading(true);
    setError('');
    setAiSummary('');
    setTransactionData([]);

    try {
      const result = await axios.post(WORKER_URL, { walletAddress });

      if (result.data) {
        setAiSummary(result.data.summary || result.data.message || 'No summary or message provided.');
        setTransactionData(result.data.transactionData || []);
        setError(''); // Clear error on successful fetch
      } else {
        setAiSummary('No valid data received from server.');
        setTransactionData([]);
      }
    } catch (err) {
      console.error('Error calling worker:', err);
      let errorMessage = 'Failed to fetch response from the worker.';
      if (err.response) {
        errorMessage += ` Status: ${err.response.status} - ${typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data)}`;
      } else if (err.request) {
        errorMessage += ' No response received from server. Check worker URL and if the worker is running.';
      } else {
        errorMessage += ` ${err.message}`;
      }
      setError(errorMessage);
      setAiSummary('');
      setTransactionData([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Ethereum Wallet Activity Analyzer</h1>
        <p>Enter Ethereum Wallet Address:</p>
        <input
          type="text"
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
          placeholder="Enter Ethereum wallet address (e.g., 0x...)"
          style={{ width: '400px', padding: '8px', margin: '10px 0' }}
        />
        <button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Analyzing...' : 'Analyze Wallet Activity'}
        </button>
        {error && <p className="error-message" style={{ color: 'red' }}>Error: {error}</p>}

        {aiSummary && (
          <div className="response-area ai-summary-area">
            <h2>AI Generated Summary:</h2>
            <pre>{aiSummary}</pre>
          </div>
        )}

        {transactionData.length > 0 && (
          <div className="response-area transaction-data-area">
            <h2>Transaction Data:</h2>
            <ul className="transaction-list" style={{ listStyleType: 'none', padding: 0 }}>
              {transactionData.map((tx, index) => (
                <li key={tx.hash || index} className="transaction-item" style={{ border: '1px solid #ccc', margin: '10px 0', padding: '10px', borderRadius: '5px' }}>
                  <p><strong>Date:</strong> {tx.dateTime || new Date(tx.timeStamp * 1000).toISOString()}</p>
                  {tx.tokenInvolved && <p><strong>Token:</strong> {tx.tokenInvolved}</p>}
                  <p><strong>From:</strong> {tx.from}</p>
                  <p><strong>To:</strong> {tx.to}</p>
                  <p><strong>Value:</strong> {tx.value} (Wei)</p>
                  {tx.valueUSD && <p><strong>Value (USD Placeholder):</strong> {tx.valueUSD} (Wei)</p>}
                  <p><a href={`https://etherscan.io/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer">View on Etherscan</a></p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!loading && !error && !aiSummary && transactionData.length === 0 && walletAddress !== '' && (
          // This case might occur if the handleSubmit was called, completed,
          // and the backend returned an empty summary and no transactions,
          // or if the initial state after a non-error response is empty.
          // The current logic in handleSubmit sets aiSummary to a message like "No summary..."
          // so this specific condition might be rare unless the backend returns truly empty data.
          <div className="response-area">
            <p>No information to display. The wallet might have no transactions, or the summary was empty.</p>
          </div>
        )}

      </header>
    </div>
  );
}

export default App;
