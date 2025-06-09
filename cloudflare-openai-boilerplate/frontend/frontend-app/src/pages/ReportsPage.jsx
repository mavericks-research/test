// frontend/frontend-app/src/pages/ReportsPage.jsx
import React, { useState } from 'react';
import { getWalletTokenHoldings } from '../services/cryptoService'; // Import the new service

// Removed NavigationBar import

function ReportsPage() { // Removed handleLogout from props
  const [walletAddress, setWalletAddress] = useState('');
  const [chainId, setChainId] = useState('ethereum'); // Default to Ethereum
  const [tokenHoldings, setTokenHoldings] = useState([]);
  const [reportNarrative, setReportNarrative] = useState('');
  const [financialSummary, setFinancialSummary] = useState(null);
  const [behavioralAnalysis, setBehavioralAnalysis] = useState(null);
  const [apiWarningNote, setApiWarningNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerateReport = async () => {
    if (!walletAddress) {
      setError('Wallet address is required.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setApiWarningNote('');
    setTokenHoldings([]);
    setFinancialSummary(null);
    setBehavioralAnalysis(null);
    setReportNarrative('');

    try {
      const response = await getWalletTokenHoldings(walletAddress, chainId);

      // Assuming response will always be an object, even with internal .error or .errorNote
      setTokenHoldings(response.tokenHoldings || []);
      setFinancialSummary(response.financialSummary || null);
      setBehavioralAnalysis(response.behavioralAnalysis || null);
      setReportNarrative(response.reportNarrative || '');
      setApiWarningNote(response.warningNote || ''); // Display warnings if any

      // Prioritize errorNote from response over a generic message
      if (response.errorNote) {
        setError(response.errorNote);
      } else if (response.error) { // Handle if the service function itself returned an { error: "..." } object
        setError(response.error);
      }

      // If no data at all and no specific error/warning, set a generic message.
      if (!response.tokenHoldings && !response.reportNarrative && !response.error && !response.errorNote && !response.warningNote) {
        setError('No data returned from the server. Please try again.');
      }

    } catch (err) { // Catch errors from cryptoService (e.g., network failure)
      setError(err.message || 'Failed to fetch wallet report due to a network or unexpected error.');
      // Ensure all data states are cleared on such errors
      setTokenHoldings([]);
      setFinancialSummary(null);
      setBehavioralAnalysis(null);
      setReportNarrative('');
      setApiWarningNote('');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* NavigationBar removed from here */}
      <h1>Reports & Projections Page</h1>
      <p>View AI-generated net worth forecasts, risk assessments, and performance trends.</p>

      {/* Section for Token Holdings Report */}
      <section style={{ marginTop: '2rem', marginBottom: '2rem', padding: '1rem', border: '1px solid #ccc' }}>
        <h2>Comprehensive Wallet Report</h2>
        <div>
          <label htmlFor="walletAddress" style={{ marginRight: '0.5rem' }}>Wallet Address: </label>
          <input
            type="text"
            id="walletAddress"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="Enter wallet address (e.g., 0x...)"
            style={{ minWidth: '300px', padding: '0.5rem' }}
          />
        </div>
        <div style={{ marginTop: '1rem' }}>
          <label htmlFor="chainId" style={{ marginRight: '0.5rem' }}>Chain: </label>
          <select
            id="chainId"
            value={chainId}
            onChange={(e) => setChainId(e.target.value)}
            style={{ padding: '0.5rem' }}
          >
            <option value="ethereum">Ethereum</option>
            {/* Future options can be added here e.g.
            <option value="bsc">Binance Smart Chain</option>
            <option value="polygon">Polygon</option>
            */}
          </select>
        </div>
        <button
          onClick={handleGenerateReport}
          disabled={isLoading}
          style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}
        >
          {isLoading ? 'Generating...' : 'Generate Wallet Report'}
        </button>

        {isLoading && <p style={{ marginTop: '1rem' }}>Loading comprehensive wallet report...</p>}
        {error && <p style={{ marginTop: '1rem', color: 'red', border: '1px solid red', padding: '0.5rem' }}>Error: {error}</p>}
        {apiWarningNote && !error && <p style={{ marginTop: '1rem', color: '#856404', backgroundColor: '#fff3cd', border: '1px solid #ffeeba', padding: '0.5rem' }}>Warning: {apiWarningNote}</p>}

        {/* Financial Summary Display */}
        {!isLoading && !error && financialSummary && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f0f0f0', borderRadius: '4px' }}>
            <h3>Financial Snapshot</h3>
            <p><strong>Total Portfolio Value (USD):</strong> ${financialSummary.totalPortfolioValueUSD}</p>
            <p><strong>Number of Unique Assets:</strong> {financialSummary.numberOfUniqueAssets}</p>
            {financialSummary.topAssetsMessage && <p>{financialSummary.topAssetsMessage}</p>}
          </div>
        )}

        {/* Display Token Holdings Table */}
        {!isLoading && tokenHoldings.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <h4>Token Holdings:</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Name</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Symbol</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Balance</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Price (USD)</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Value (USD)</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Allocation</th>
                </tr>
              </thead>
              <tbody>
                {tokenHoldings.map((token, index) => (
                  <tr key={index}>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{token.name}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{token.symbol}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{token.balance}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>${token.price_usd}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>${token.value_usd}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{token.percentageAllocation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Behavioral Analysis Display */}
        {!isLoading && !error && behavioralAnalysis && behavioralAnalysis.tags && behavioralAnalysis.tags.length > 0 && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#e9f7ef', borderRadius: '4px' }}>
            <h3>Wallet Behavioral Profile</h3>
            <p><strong>Identified Behaviors (Tags):</strong> {behavioralAnalysis.tags.join(', ')}</p>
            <h4>Key Metrics:</h4>
            <ul style={{ listStyleType: 'disc', paddingLeft: '20px' }}>
              <li>Total Transactions Analyzed: {behavioralAnalysis.metrics.totalTransactions ?? 'N/A'}</li>
              <li>Activity Period: ~{behavioralAnalysis.metrics.transactionPeriodDays ?? 'N/A'} days</li>
              <li>Avg. Transactions/Day: {behavioralAnalysis.metrics.avgTransactionsPerDay ?? 'N/A'}</li>
              <li>DEX Interactions: {behavioralAnalysis.metrics.dexInteractionCount ?? 'N/A'}</li>
              <li>NFT Interactions: {behavioralAnalysis.metrics.nftInteractionCount ?? 'N/A'}</li>
              <li>Unique Contracts Interacted With: {behavioralAnalysis.metrics.uniqueContractsInteracted ?? 'N/A'}</li>
              <li>Estimated Gas Spent: {behavioralAnalysis.metrics.gasSpentGwei ? `${behavioralAnalysis.metrics.gasSpentGwei} Gwei` : 'N/A'}</li>
              <li>Stablecoin Transfers: {behavioralAnalysis.metrics.stablecoinTransferCount ?? 'N/A'}</li>
            </ul>
          </div>
        )}
         {!isLoading && !error && behavioralAnalysis && (!behavioralAnalysis.tags || behavioralAnalysis.tags.length === 0) && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: '4px' }}>
                 <h3>Wallet Behavioral Profile</h3>
                 <p>No specific behavioral tags identified, or transaction history was not available/analyzed.</p>
                 {behavioralAnalysis.metrics && behavioralAnalysis.metrics.totalTransactions !== undefined && <p>Total transactions analyzed: {behavioralAnalysis.metrics.totalTransactions}.</p>}
            </div>
        )}


        {/* Display AI Report Narrative */}
        {!isLoading && reportNarrative && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fdfdfe', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
            <h3>AI-Generated Portfolio Analysis:</h3>
            <p style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', background: '#f7f7f7', padding: '1rem', border: '1px solid #eee', borderRadius: '4px' }}>
              {reportNarrative}
            </p>
          </div>
        )}

        {/* Show a message if no data is available after trying (and not loading, no error, no warning) */}
        {!isLoading && !error && !apiWarningNote && tokenHoldings.length === 0 && !reportNarrative && !financialSummary && !behavioralAnalysis && (
            <p style={{ marginTop: '1rem' }}>Enter a wallet address and click "Generate Wallet Report" to see data.</p>
        )}

      </section>

      {/* Original Report Type section - can be kept or modified as needed */}
      <section style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #eee' }}>
        <h2>Other Reports</h2>
        <div>
          <label htmlFor="reportType">Report Type: </label>
          <input type="text" id="reportType" list="reportTypes" />
          <datalist id="reportTypes">
            <option value="Net Worth" />
            <option value="Spending by Category" />
          </datalist>
        </div>
      </section>
    </div>
  );
}

export default ReportsPage;
