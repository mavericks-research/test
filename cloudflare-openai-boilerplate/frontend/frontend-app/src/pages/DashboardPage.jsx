// frontend/frontend-app/src/pages/DashboardPage.jsx
import React, { useState } from 'react'; // Added useState for WalletAnalyzer
// Removed NavigationBar import

// Re-define or import WalletAnalyzer here. For simplicity, defining it again.
// In a larger app, WalletAnalyzer would be its own component.
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
      const response = await fetch(workerUrl, { // Use the passed workerUrl
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

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {summary && (
        <div>
          <h3>AI Summary:</h3>
          <p>{summary}</p>
        </div>
      )}
      {transactions.length > 0 && (
        <div>
          <h3>Transactions:</h3>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#f4f4f4', padding: '10px', maxHeight: '300px', overflowY: 'auto' }}>
            {JSON.stringify(transactions, null, 2)}
          </pre>
        </div>
      )}
    </>
  );
}


function DashboardPage({ workerUrl }) { // Removed handleLogout from props
  return (
    <div>
      {/* NavigationBar removed from here */}
      <h1>Dashboard</h1>
      <p>Welcome to your dashboard.</p>
      <hr />
      {/* Embed the WalletAnalyzer functionality here */}
      <WalletAnalyzer workerUrl={workerUrl} />
      <hr /> {/* Added a separator */}
      <CryptoDisplay /> {/* Added the new component */}
    </div>
  );
}

export default DashboardPage;
