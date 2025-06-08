import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardPage from './DashboardPage'; // Assuming WalletAnalyzer is exported or tested via DashboardPage
// If WalletAnalyzer is a separate component and can be imported directly:
// import { WalletAnalyzer } from './DashboardPage'; // Or wherever it's defined

// Mock global.fetch
global.fetch = vi.fn();

// Helper to mock successful fetch responses
const mockFetchSuccess = (data, endpointMatcher, method = 'GET') => {
  fetch.mockImplementationOnce(async (url, options) => {
    if (endpointMatcher && !url.includes(endpointMatcher)) {
      console.warn(`URL ${url} not matched by ${endpointMatcher}`);
      return Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({ error: "Not Found - Unmatched mock" }),
        text: async () => "Not Found - Unmatched mock"
      });
    }
    if (options && options.method && options.method !== method) {
        console.warn(`Method ${options.method} not matched by ${method} for ${url}`);
        return Promise.resolve({
            ok: false, status: 405, json: async () => ({ error: "Method Not Allowed" }), text: async () => "Method Not Allowed"
        });
    }
    return Promise.resolve({
      ok: true,
      json: async () => data,
    });
  });
};

// Helper to mock failed fetch responses
const mockFetchFailure = (status = 500, data = { error: "API Error" }, endpointMatcher, method = 'GET') => {
  fetch.mockImplementationOnce(async (url, options) => {
     if (endpointMatcher && !url.includes(endpointMatcher)) {
      console.warn(`URL ${url} not matched by ${endpointMatcher} for failure mock`);
      return Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({ error: "Not Found - Unmatched mock for failure" }),
        text: async () => "Not Found - Unmatched mock for failure"
      });
    }
    return Promise.resolve({
      ok: false,
      status: status,
      json: async () => data,
      text: async () => JSON.stringify(data) // Or a simpler text version
    });
  });
};


describe('DashboardPage - WalletAnalyzer Component', () => {
  // It's often better to test WalletAnalyzer in isolation if possible.
  // However, if it's deeply integrated into DashboardPage or for simplicity here,
  // we test it via DashboardPage. If WalletAnalyzer can be imported directly, that's preferred.
  // For now, assuming we test by rendering DashboardPage which includes WalletAnalyzer.

  beforeEach(() => {
    fetch.mockClear();
    // Any default mocks for other components within DashboardPage can go here if needed
    // For WalletAnalyzer, specific mocks will be set in each test.
  });

  test('initial render of WalletAnalyzer within DashboardPage', () => {
    render(<DashboardPage />);
    // Check for WalletAnalyzer specific elements
    expect(screen.getByText('Wallet Asset Viewer')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Chain:')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /select chain/i })).toHaveValue('ethereum'); // Default
    expect(screen.getByPlaceholderText(/Enter Ethereum Wallet Address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Get Assets/i })).toBeInTheDocument();
  });

  test('successful asset fetch and display', async () => {
    const mockAssets = [
      { name: 'Ethereum', symbol: 'ETH', balance: 2.5, price: 3000, value: 7500 },
      { name: 'Cool Token', symbol: 'COOL', balance: 1000, price: 0.5, value: 500 },
    ];
    mockFetchSuccess(mockAssets, '/api/wallet/assets');

    render(<DashboardPage />);

    const addressInput = screen.getByPlaceholderText(/Enter Ethereum Wallet Address/i);
    const getAssetsButton = screen.getByRole('button', { name: /Get Assets/i });

    fireEvent.change(addressInput, { target: { value: '0x123Test' } });
    fireEvent.click(getAssetsButton);

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/wallet/assets?address=0x123Test&chain=ethereum'),
      undefined // For GET request, options might be undefined or only headers
    );

    expect(screen.getByText('Fetching Assets...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('Fetching Assets...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Detected Assets on Ethereum:')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Token' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Symbol' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Balance' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Price (USD)' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Value (USD)' })).toBeInTheDocument();

    // Check for first asset
    expect(screen.getByText('Ethereum')).toBeInTheDocument();
    expect(screen.getByText('ETH')).toBeInTheDocument();
    expect(screen.getByText('2.50000000')).toBeInTheDocument(); // Default toLocaleString for balance
    expect(screen.getByText('$3,000.00')).toBeInTheDocument(); // Price formatted
    expect(screen.getByText('$7,500.00')).toBeInTheDocument(); // Value formatted

    // Check for second asset
    expect(screen.getByText('Cool Token')).toBeInTheDocument();
    expect(screen.getByText('COOL')).toBeInTheDocument();
    expect(screen.getByText('1,000.00000000')).toBeInTheDocument();
    expect(screen.getByText('$0.50')).toBeInTheDocument();
    expect(screen.getByText('$500.00')).toBeInTheDocument();
  });

  test('displays "No assets found" message', async () => {
    mockFetchSuccess([], '/api/wallet/assets'); // Empty array response

    render(<DashboardPage />);
    const addressInput = screen.getByPlaceholderText(/Enter Ethereum Wallet Address/i);
    const getAssetsButton = screen.getByRole('button', { name: /Get Assets/i });

    fireEvent.change(addressInput, { target: { value: '0xNoAssets' } });
    fireEvent.click(getAssetsButton);

    await waitFor(() => {
      expect(screen.queryByText('Fetching Assets...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('No assets found for this address on ethereum.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  test('displays error message on API error', async () => {
    mockFetchFailure(500, { error: 'Internal Server Error' }, '/api/wallet/assets');

    render(<DashboardPage />);
    const addressInput = screen.getByPlaceholderText(/Enter Ethereum Wallet Address/i);
    const getAssetsButton = screen.getByRole('button', { name: /Get Assets/i });

    fireEvent.change(addressInput, { target: { value: '0xErrorCase' } });
    fireEvent.click(getAssetsButton);

    await waitFor(() => {
      expect(screen.queryByText('Fetching Assets...')).not.toBeInTheDocument();
    });

    // Check for the specific error message from the backend if possible, or a generic one
    expect(screen.getByText(/Error: 500 Internal Server Error/i)).toBeInTheDocument();
    // Or, if the component shows a more generic message:
    // expect(screen.getByText(/Failed to fetch assets/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  test('shows input validation error if address is missing', () => {
    render(<DashboardPage />);
    const getAssetsButton = screen.getByRole('button', { name: /Get Assets/i });

    fireEvent.click(getAssetsButton);

    expect(screen.getByText('Please enter a wallet address.')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  test('updates placeholder when chain is changed', () => {
    render(<DashboardPage />);
    const chainSelect = screen.getByLabelText('Select Chain:');

    fireEvent.change(chainSelect, { target: { value: 'bsc' } });
    expect(screen.getByPlaceholderText(/Enter BSC Wallet Address/i)).toBeInTheDocument();

    fireEvent.change(chainSelect, { target: { value: 'solana' } });
    expect(screen.getByPlaceholderText(/Enter Solana Wallet Address/i)).toBeInTheDocument();
  });

});
