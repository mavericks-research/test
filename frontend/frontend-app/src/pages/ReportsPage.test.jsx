// frontend/frontend-app/src/pages/ReportsPage.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReportsPage from './ReportsPage'; // Adjust path as needed
import * as cryptoService from '../services/cryptoService'; // To mock its functions

// Mock the cryptoService module
vi.mock('../services/cryptoService.js', () => ({
  getWalletTokenHoldings: vi.fn(),
}));

describe('ReportsPage', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();
    // Clear any previous console errors if necessary, e.g., from caught exceptions in async event handlers
    // vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  const renderComponent = () => render(<ReportsPage />);

  it('should render initial UI elements correctly', () => {
    renderComponent();
    expect(screen.getByLabelText(/Wallet Address:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Chain:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate Wallet Report/i })).toBeInTheDocument();

    // Check that data sections are not initially visible or show placeholder text
    expect(screen.queryByText(/Financial Snapshot/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Token Holdings:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Wallet Behavioral Profile/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/AI-Generated Portfolio Analysis/i)).not.toBeInTheDocument();
    // Check for placeholder if you have one for initial state
    expect(screen.getByText(/Enter a wallet address and click "Generate Wallet Report" to see data./i)).toBeInTheDocument();
  });

  it('should display comprehensive report on successful API call', async () => {
    const mockData = {
      financialSummary: { totalPortfolioValueUSD: '12345.67', numberOfUniqueAssets: 3, topAssetsMessage: 'Top assets are Bitcoin and Ethereum.' },
      tokenHoldings: [
        { name: 'Bitcoin', symbol: 'BTC', balance: '1', price_usd: '10000.00', value_usd: '10000.00', percentageAllocation: '81.00%' },
        { name: 'Ethereum', symbol: 'ETH', balance: '1.5', price_usd: '1563.78', value_usd: '2345.67', percentageAllocation: '19.00%' },
      ],
      behavioralAnalysis: {
        tags: ['DEX User', 'Active User'],
        metrics: { totalTransactions: 50, dexInteractionCount: 10, nftInteractionCount: 2, transactionPeriodDays: 30, avgTransactionsPerDay: 1.67, uniqueContractsInteracted: 5, gasSpentGwei: '100000', stablecoinTransferCount: 5 },
      },
      reportNarrative: 'This is a comprehensive AI analysis.',
      warningNote: '',
      errorNote: null,
    };
    cryptoService.getWalletTokenHoldings.mockResolvedValue(mockData);

    renderComponent();

    fireEvent.change(screen.getByLabelText(/Wallet Address:/i), { target: { value: '0xTestAddress' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate Wallet Report/i }));

    expect(screen.getByText(/Loading comprehensive wallet report.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(/Loading comprehensive wallet report.../i)).not.toBeInTheDocument();
    });

    // Check Financial Snapshot
    expect(screen.getByText(/Financial Snapshot/i)).toBeInTheDocument();
    expect(screen.getByText(/\$12345.67/i)).toBeInTheDocument();
    expect(screen.getByText(/Number of Unique Assets: 3/i)).toBeInTheDocument();
    expect(screen.getByText(/Top assets are Bitcoin and Ethereum./i)).toBeInTheDocument();

    // Check Token Holdings Table (basic check for table presence and some content)
    expect(screen.getByText('Token Holdings:')).toBeInTheDocument();
    expect(screen.getByText('Bitcoin')).toBeInTheDocument();
    expect(screen.getByText('81.00%')).toBeInTheDocument(); // Check for allocation
    expect(screen.getByText('Ethereum')).toBeInTheDocument();
    expect(screen.getByText('19.00%')).toBeInTheDocument();

    // Check Behavioral Profile
    expect(screen.getByText(/Wallet Behavioral Profile/i)).toBeInTheDocument();
    expect(screen.getByText(/Identified Behaviors \(Tags\): DEX User, Active User/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Transactions Analyzed: 50/i)).toBeInTheDocument();
    expect(screen.getByText(/DEX Interactions: 10/i)).toBeInTheDocument();
    expect(screen.getByText(/Activity Period: ~30 days/i)).toBeInTheDocument();


    // Check AI Narrative
    expect(screen.getByText(/AI-Generated Portfolio Analysis/i)).toBeInTheDocument();
    expect(screen.getByText('This is a comprehensive AI analysis.')).toBeInTheDocument();

    // No errors or warnings
    expect(screen.queryByText(/Error:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Warning:/i)).not.toBeInTheDocument();
  });

  it('should display partial data and warning note correctly', async () => {
    const mockPartialData = {
      financialSummary: { totalPortfolioValueUSD: '500.00', numberOfUniqueAssets: 1, topAssetsMessage: 'Only TestCoin.' },
      tokenHoldings: [{ name: 'TestCoin', symbol: 'TC', balance: '50', price_usd: '10.00', value_usd: '500.00', percentageAllocation: '100%' }],
      behavioralAnalysis: null, // No behavioral analysis
      reportNarrative: 'AI analysis based on financial data only.',
      warningNote: 'Transaction history processing failed; behavioral analysis is unavailable.',
      errorNote: null,
    };
    cryptoService.getWalletTokenHoldings.mockResolvedValue(mockPartialData);

    renderComponent();
    fireEvent.change(screen.getByLabelText(/Wallet Address:/i), { target: { value: '0xPartialAddress' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate Wallet Report/i }));

    await waitFor(() => {
      expect(screen.getByText(/Financial Snapshot/i)).toBeInTheDocument();
      expect(screen.getByText('TestCoin')).toBeInTheDocument(); // Holdings table
    });

    // Check warning note
    expect(screen.getByText(/Warning: Transaction history processing failed; behavioral analysis is unavailable./i)).toBeInTheDocument();

    // Check behavioral profile shows fallback or relevant message
    expect(screen.getByText(/Wallet Behavioral Profile/i)).toBeInTheDocument();
    expect(screen.getByText(/No specific behavioral tags identified, or transaction history was not available\/analyzed./i)).toBeInTheDocument();


    // AI Narrative should still be displayed
    expect(screen.getByText('AI analysis based on financial data only.')).toBeInTheDocument();
    expect(screen.queryByText(/^Error:/i)).not.toBeInTheDocument(); // Note: use ^Error: to avoid matching "ErrorNote"
  });

  it('should display error message on API failure', async () => {
    cryptoService.getWalletTokenHoldings.mockRejectedValue(new Error('Network Error: Failed to fetch'));

    renderComponent();
    fireEvent.change(screen.getByLabelText(/Wallet Address:/i), { target: { value: '0xErrorAddress' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate Wallet Report/i }));

    await waitFor(() => {
      expect(screen.getByText(/Error: Network Error: Failed to fetch/i)).toBeInTheDocument();
    });

    // Data sections should not be visible
    expect(screen.queryByText(/Financial Snapshot/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Token Holdings:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Wallet Behavioral Profile/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/AI-Generated Portfolio Analysis/i)).not.toBeInTheDocument();
  });

  it('should display error message from response.errorNote', async () => {
    const errorData = {
      tokenHoldings: [],
      financialSummary: null,
      behavioralAnalysis: null,
      reportNarrative: '',
      warningNote: '',
      errorNote: 'Backend processing failed: Moralis key invalid.',
    };
    cryptoService.getWalletTokenHoldings.mockResolvedValue(errorData);

    renderComponent();
    fireEvent.change(screen.getByLabelText(/Wallet Address:/i), { target: { value: '0xBackendError' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate Wallet Report/i }));

    await waitFor(() => {
      expect(screen.getByText(/Error: Backend processing failed: Moralis key invalid./i)).toBeInTheDocument();
    });
     expect(screen.queryByText(/Financial Snapshot/i)).not.toBeInTheDocument();
  });

   it('should require wallet address before generating report', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Generate Wallet Report/i }));
    expect(screen.getByText('Error: Wallet address is required.')).toBeInTheDocument();
    expect(cryptoService.getWalletTokenHoldings).not.toHaveBeenCalled();
  });

});
