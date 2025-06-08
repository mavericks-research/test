import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CryptoDisplay from './CryptoDisplay';

// Mock the global fetch function
global.fetch = jest.fn();

const mockCoinOptions = [
  { value: 'bitcoin', label: 'Bitcoin' },
  { value: 'ethereum', label: 'Ethereum' },
  { value: 'dogecoin', label: 'Dogecoin' },
];

// Helper to mock successful fetch responses
const mockFetchSuccess = (data, endpointMatcher) => {
  fetch.mockImplementationOnce(url => {
    if (endpointMatcher && !url.includes(endpointMatcher)) {
      return Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({ error: "Not Found" }),
        text: async () => "Not Found"
      });
    }
    return Promise.resolve({
      ok: true,
      json: async () => data,
    });
  });
};

// Helper to mock failed fetch responses
const mockFetchFailure = (status = 500, message = "API Error") => {
  fetch.mockImplementationOnce(() => Promise.resolve({
    ok: false,
    status: status,
    json: async () => ({ error: message }),
    text: async () => message
  }));
};

describe('CryptoDisplay Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    fetch.mockClear();

    // Default mocks for initial load (bitcoin, current date)
    // Current price for Bitcoin - now includes new fields
    mockFetchSuccess(
      {
        bitcoin: {
          usd: 50000,
          usd_market_cap: 1000000000000,
          usd_24h_vol: 50000000000,
          usd_24h_change: 2.5,
        }
      },
      '/api/crypto/current?coins=bitcoin&currencies=usd'
    );

    // Enriched historical data for Bitcoin for today's date
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const formattedDateForApi = `${day}-${month}-${year}`; // dd-mm-yyyy for API

    mockFetchSuccess(
      {
        coinGeckoData: {
          market_data: {
            current_price: { usd: 40000 }
          }
        },
        openAiInsights: 'Initial AI insight for Bitcoin.'
      },
      `/api/crypto/enriched-historical-data?coinId=bitcoin&date=${formattedDateForApi}`
    );
  });

  test('renders initial layout correctly', () => {
    render(<CryptoDisplay />);
    expect(screen.getByText('Crypto Price Viewer')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Coin:')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Date:')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveValue('bitcoin');
    // Date input should have today's date in YYYY-MM-DD format
    expect(screen.getByRole('textbox', { type: 'date' })).toHaveValue(new Date().toISOString().slice(0, 10));
  });

  test('loads and displays initial current and historical prices for default coin (Bitcoin)', async () => {
    render(<CryptoDisplay />);

    // Check for current price and new metrics
    await waitFor(() => {
      expect(screen.getByText('Price: $50,000')).toBeInTheDocument();
      expect(screen.getByText('Market Cap: $1,000,000,000,000')).toBeInTheDocument();
      expect(screen.getByText('24h Volume: $50,000,000,000')).toBeInTheDocument();
      expect(screen.getByText('24h Change: 2.50%')).toBeInTheDocument();
    });
    // Check for historical price (from enriched endpoint)
    await waitFor(() => {
      expect(screen.getByText('$40,000')).toBeInTheDocument(); // Historical price
    });
    // Check for percentage change
    await waitFor(() => {
      expect(screen.getByText('25.00%')).toBeInTheDocument(); // Percentage change
    });
     // Check for AI insights
     await waitFor(() => {
      expect(screen.getByText('Initial AI insight for Bitcoin.')).toBeInTheDocument();
    });
    expect(fetch).toHaveBeenCalledTimes(2); // Initial current price + initial enriched historical
  });

  test('allows changing the selected coin and fetches new data including new metrics', async () => {
    render(<CryptoDisplay />);

    // Wait for initial Bitcoin data to load
    await waitFor(() => expect(screen.getByText('Price: $50,000')).toBeInTheDocument());
    fetch.mockClear(); // Clear mocks after initial load

    // Mock calls for Ethereum
    mockFetchSuccess(
      {
        ethereum: {
          usd: 3000,
          usd_market_cap: 360000000000,
          usd_24h_vol: 20000000000,
          usd_24h_change: -1.5,
        }
      },
      '/api/crypto/current?coins=ethereum&currencies=usd'
    );

    const today = new Date();
    const formattedDateForApi = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
    mockFetchSuccess(
      {
        coinGeckoData: { market_data: { current_price: { usd: 2500 } } },
        openAiInsights: 'AI insight for Ethereum.'
      },
      `/api/crypto/enriched-historical-data?coinId=ethereum&date=${formattedDateForApi}`
    );

    fireEvent.change(screen.getByLabelText('Select Coin:'), { target: { value: 'ethereum' } });
    expect(screen.getByRole('combobox')).toHaveValue('ethereum');

    await waitFor(() => {
      expect(screen.getByText('Price: $3,000')).toBeInTheDocument();
      expect(screen.getByText('Market Cap: $360,000,000,000')).toBeInTheDocument();
      expect(screen.getByText('24h Volume: $20,000,000,000')).toBeInTheDocument();
      expect(screen.getByText('24h Change: -1.50%')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('$2,500')).toBeInTheDocument(); // New historical price
    });
    await waitFor(() => {
      expect(screen.getByText('20.00%')).toBeInTheDocument(); // New percentage change
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  test('allows changing the date and fetches new enriched historical data', async () => {
    render(<CryptoDisplay />);
    await waitFor(() => expect(screen.getByText('$40,000')).toBeInTheDocument()); // Initial historical
    fetch.mockClear();

    mockFetchSuccess(
      {
        coinGeckoData: { market_data: { current_price: { usd: 20000 } } },
        openAiInsights: 'Historical AI insight for Bitcoin on 2023-01-15.'
      },
      '/api/crypto/enriched-historical-data?coinId=bitcoin&date=15-01-2023' // dd-mm-yyyy for API
    );

    fireEvent.change(screen.getByLabelText('Select Date for Historical Data:'), { target: { value: '2023-01-15' } }); // YYYY-MM-DD for input
    expect(screen.getByDisplayValue('2023-01-15')).toBeInTheDocument();


    await waitFor(() => expect(screen.getByText('Price: $50,000')).toBeInTheDocument()); // Current price should persist
    await waitFor(() => expect(screen.getByText('$20,000')).toBeInTheDocument()); // New historical
    await waitFor(() => expect(screen.getByText('150.00%')).toBeInTheDocument()); // New percentage change
    await waitFor(() => expect(screen.getByText('Historical AI insight for Bitcoin on 2023-01-15.')).toBeInTheDocument());


    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/crypto/enriched-historical-data?coinId=bitcoin&date=15-01-2023'),
      // expect.anything() // Or more specific if needed
    );
  });

  test('displays error message if current price fetch fails', async () => {
    fetch.mockClear(); // Clear default mocks
    mockFetchFailure(500, 'Failed to fetch current price data', '/api/crypto/current');

    // Mock historical data to ensure the component proceeds that far
    const today = new Date();
    const formattedDateForApi = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
    mockFetchSuccess(
      { coinGeckoData: { market_data: { current_price: { usd: 40000 } } }, openAiInsights: 'Insight' },
      `/api/crypto/enriched-historical-data?coinId=bitcoin&date=${formattedDateForApi}`
    );

    render(<CryptoDisplay />);
    await waitFor(() => {
      // Expecting a message indicating loading or failure for the current price section
      expect(screen.getByText(/Loading current data for bitcoin.../i)).toBeInTheDocument();
    });
  });

  test('displays error message if enriched historical data fetch fails', async () => {
    fetch.mockClear();
    mockFetchSuccess( // Current price succeeds
      { bitcoin: { usd: 50000, usd_market_cap: 1T, usd_24h_vol: 50B, usd_24h_change: 1 } },
      '/api/crypto/current?coins=bitcoin&currencies=usd'
    );
    // Enriched historical data fails
    const today = new Date();
    const formattedDateForApi = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
    mockFetchFailure(500, 'Failed to fetch enriched historical data', `/api/crypto/enriched-historical-data?coinId=bitcoin&date=${formattedDateForApi}`);

    render(<CryptoDisplay />);
    await waitFor(() => {
      expect(screen.getByText('Price: $50,000')).toBeInTheDocument(); // Current price loads
    });
    await waitFor(() => {
      expect(screen.getByText(/Historical price data not available for .*\. Select date to load\./i)).toBeInTheDocument();
      expect(screen.getByText(/No AI insights available for the selected date or an error occurred\. Select date to load\./i)).toBeInTheDocument();
    });
  });

  test('handles API response with missing data gracefully for current price', async () => {
    fetch.mockClear();
    mockFetchSuccess({ bitcoin: {} }, '/api/crypto/current?coins=bitcoin&currencies=usd'); // Incomplete current data
    // Mock historical data as it's fetched on load
    const today = new Date();
    const formattedDateForApi = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
    mockFetchSuccess(
      { coinGeckoData: { market_data: { current_price: { usd: 40000 } } }, openAiInsights: 'Insight' },
      `/api/crypto/enriched-historical-data?coinId=bitcoin&date=${formattedDateForApi}`
    );

    render(<CryptoDisplay />);
    await waitFor(() => {
      // Should show loading or placeholder if critical data (like price) is missing
      expect(screen.getByText(/Loading current data for bitcoin.../i)).toBeInTheDocument();
    });
  });

  test('handles API response with missing data gracefully for enriched historical price', async () => {
    fetch.mockClear();
    mockFetchSuccess( // Current price succeeds
      { bitcoin: { usd: 50000, usd_market_cap: 1000000000000, usd_24h_vol: 50000000000, usd_24h_change: 2.5 } },
      '/api/crypto/current?coins=bitcoin&currencies=usd'
    );
    // Enriched historical data is incomplete
    const today = new Date();
    const formattedDateForApi = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
    mockFetchSuccess(
      { coinGeckoData: { market_data: {} }, openAiInsights: null }, // Missing current_price.usd
      `/api/crypto/enriched-historical-data?coinId=bitcoin&date=${formattedDateForApi}`
    );

    render(<CryptoDisplay />);
    await waitFor(() => {
      expect(screen.getByText(/Historical price data not available for .*\. Select date to load\./i)).toBeInTheDocument();
      expect(screen.getByText(/No AI insights available for the selected date or an error occurred\. Select date to load\./i)).toBeInTheDocument();
    });
  });

  // --- Tests for Blockchain Functionality ---
  test('renders blockchain selector', () => {
    render(<CryptoDisplay />);
    expect(screen.getByLabelText('Select Blockchain:')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /select blockchain/i })).toHaveValue(''); // Default empty
  });

  test('selecting a blockchain calls the correct API endpoint', async () => {
    render(<CryptoDisplay />);
    // Mock the API call for blockchain tokens
    mockFetchSuccess([], '/api/crypto/coins-by-blockchain?platform=ethereum&currency=usd');

    const blockchainSelect = screen.getByLabelText('Select Blockchain:');
    fireEvent.change(blockchainSelect, { target: { value: 'Ethereum' } });

    expect(blockchainSelect).toHaveValue('Ethereum');
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/crypto/coins-by-blockchain?platform=ethereum&currency=usd'),
        // expect.anything()
      );
    });
  });

  test('displays loading state and then tokens for a selected blockchain', async () => {
    const mockEthTokens = [
      { id: 'token-a', name: 'Token A', symbol: 'TKA', current_price: 120.5, market_cap: 12000000, total_volume: 500000, price_change_percentage_24h: 3.5 },
      { id: 'token-b', name: 'Token B', symbol: 'TKB', current_price: 0.99, market_cap: 990000, total_volume: 150000, price_change_percentage_24h: -1.2 },
    ];
    mockFetchSuccess(mockEthTokens, '/api/crypto/coins-by-blockchain?platform=ethereum&currency=usd');

    render(<CryptoDisplay />);
    const blockchainSelect = screen.getByLabelText('Select Blockchain:');
    fireEvent.change(blockchainSelect, { target: { value: 'Ethereum' } });

    // Check for loading state
    expect(screen.getByText('Loading tokens for Ethereum...')).toBeInTheDocument();

    await waitFor(() => {
      // Check for table headers
      expect(screen.queryByRole('columnheader', { name: 'Name' })).not.toBeInTheDocument(); // Name header should be gone
      expect(screen.getByRole('columnheader', { name: 'Symbol' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /Price \(USD\)/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /Market Cap \(USD\)/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /Volume \(24h\)/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /Change \(24h\)/i })).toBeInTheDocument();

      // Check for token data
      expect(screen.queryByText('Token A')).not.toBeInTheDocument(); // Name data should be gone
      expect(screen.getByText('TKA')).toBeInTheDocument();
      expect(screen.getByText('$120.50')).toBeInTheDocument();
      expect(screen.getByText('$12,000,000')).toBeInTheDocument();
      expect(screen.getByText('$500,000')).toBeInTheDocument();
      expect(screen.getByText('3.50%')).toBeInTheDocument();

      expect(screen.queryByText('Token B')).not.toBeInTheDocument(); // Name data should be gone
      expect(screen.getByText('TKB')).toBeInTheDocument();
      expect(screen.getByText('$0.99')).toBeInTheDocument();
      expect(screen.getByText('$990,000')).toBeInTheDocument();
      expect(screen.getByText('$150,000')).toBeInTheDocument();
      expect(screen.getByText('-1.20%')).toBeInTheDocument();
    });

    // Ensure loading message is gone
    expect(screen.queryByText('Loading tokens for Ethereum...')).not.toBeInTheDocument();
  });

  test('clears selected coin when a blockchain is selected', async () => {
    render(<CryptoDisplay />);
    // Initial selection
    const coinSelect = screen.getByLabelText('Select Coin:');
    expect(coinSelect).toHaveValue('bitcoin');
    await waitFor(() => expect(screen.getByText('Price: $50,000')).toBeInTheDocument());


    mockFetchSuccess([], '/api/crypto/coins-by-blockchain?platform=ethereum&currency=usd');
    const blockchainSelect = screen.getByLabelText('Select Blockchain:');
    fireEvent.change(blockchainSelect, { target: { value: 'Ethereum' } });

    await waitFor(() => expect(blockchainSelect).toHaveValue('Ethereum'));
    // Coin select should be cleared or set to its placeholder
    expect(coinSelect).toHaveValue(''); // Assuming empty string is the "Select a Coin" option value

    // Single coin data should be cleared / not visible
    expect(screen.queryByText('Price: $50,000')).not.toBeInTheDocument();
    expect(screen.queryByText('Market Cap: $1,000,000,000,000')).not.toBeInTheDocument();
  });

  test('displays message if no tokens are found for a blockchain', async () => {
    mockFetchSuccess([], '/api/crypto/coins-by-blockchain?platform=solana&currency=usd');
    render(<CryptoDisplay />);

    const blockchainSelect = screen.getByLabelText('Select Blockchain:');
    fireEvent.change(blockchainSelect, { target: { value: 'Solana' } });

    await waitFor(() => {
      expect(screen.getByText('No tokens found for Solana or data is unavailable.')).toBeInTheDocument();
    });
  });

  test('handles API error when fetching blockchain tokens', async () => {
    mockFetchFailure(500, "Error fetching Solana tokens", '/api/crypto/coins-by-blockchain?platform=solana&currency=usd');
    render(<CryptoDisplay />);

    const blockchainSelect = screen.getByLabelText('Select Blockchain:');
    fireEvent.change(blockchainSelect, { target: { value: 'Solana' } });

    expect(screen.getByText('Loading tokens for Solana...')).toBeInTheDocument();
    await waitFor(() => {
      // Should display a generic error or "no tokens found" message as per current implementation
      expect(screen.getByText('No tokens found for Solana or data is unavailable.')).toBeInTheDocument();
      // Optionally, check console.error if specific error handling is implemented
    });
  });

});
