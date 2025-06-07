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
    // Current price
    mockFetchSuccess({ bitcoin: { usd: 50000 } }, 'api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    // Historical price (date will be dynamic, so this is a general mock for bitcoin history)
    // The date in the component is new Date().toISOString().slice(0, 10)
    // For consistency, let's pick a fixed date for testing historical fetches or make matcher more robust
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // JS months are 0-indexed
    const day = String(today.getDate()).padStart(2, '0');
    const formattedDateForApi = `${day}-${month}-${year}`;
    mockFetchSuccess({ market_data: { current_price: { usd: 40000 } } }, `api.coingecko.com/api/v3/coins/bitcoin/history?date=${formattedDateForApi}`);
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

    await waitFor(() => {
      expect(screen.getByText('$50,000')).toBeInTheDocument(); // Current price
    });
    await waitFor(() => {
      expect(screen.getByText('$40,000')).toBeInTheDocument(); // Historical price
    });
    await waitFor(() => {
      expect(screen.getByText('25.00%')).toBeInTheDocument(); // Percentage change
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  test('allows changing the selected coin and fetches new data', async () => {
    render(<CryptoDisplay />);

    // Wait for initial Bitcoin data to load to ensure we don't have race conditions with mocks
    await waitFor(() => expect(screen.getByText('$50,000')).toBeInTheDocument());
    fetch.mockClear(); // Clear mocks after initial load

    // Mock calls for Ethereum
    mockFetchSuccess({ ethereum: { usd: 3000 } }, 'simple/price?ids=ethereum');
    // Assuming the date hasn't changed for this part of the test
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const formattedDateForApi = `${day}-${month}-${year}`;
    mockFetchSuccess({ market_data: { current_price: { usd: 2500 } } }, `/coins/ethereum/history?date=${formattedDateForApi}`);

    fireEvent.change(screen.getByLabelText('Select Coin:'), { target: { value: 'ethereum' } });

    expect(screen.getByRole('combobox')).toHaveValue('ethereum');

    await waitFor(() => {
      expect(screen.getByText('$3,000')).toBeInTheDocument(); // New current price
    });
    await waitFor(() => {
      expect(screen.getByText('$2,500')).toBeInTheDocument(); // New historical price
    });
    await waitFor(() => {
      expect(screen.getByText('20.00%')).toBeInTheDocument(); // New percentage change
    });
    expect(fetch).toHaveBeenCalledTimes(2); // One for current, one for historical
  });

  test('allows changing the date and fetches new historical data', async () => {
    render(<CryptoDisplay />);
    // Wait for initial Bitcoin data to load
    await waitFor(() => expect(screen.getByText('$40,000')).toBeInTheDocument());
    fetch.mockClear();

    // Current price for Bitcoin (shouldn't change when only date changes, but component might refetch)
    // For this test, we only care about historical, so we can be less strict on current price mock if it's refetched.
    // Let's assume current price won't be re-fetched if only date changes (based on current useEffect deps)
    // mockFetchSuccess({ bitcoin: { usd: 50000 } }, 'simple/price?ids=bitcoin');

    // New historical price for Bitcoin on 2023-01-15
    mockFetchSuccess({ market_data: { current_price: { usd: 20000 } } }, '/coins/bitcoin/history?date=15-01-2023');

    fireEvent.change(screen.getByLabelText('Select Date:'), { target: { value: '2023-01-15' } });
    expect(screen.getByRole('textbox', { type: 'date' })).toHaveValue('2023-01-15');

    // Current price should still be the initial one (or we'd need to mock its refetch)
    await waitFor(() => expect(screen.getByText('$50,000')).toBeInTheDocument());
    // New historical price
    await waitFor(() => expect(screen.getByText('$20,000')).toBeInTheDocument());
    // New percentage change
    await waitFor(() => expect(screen.getByText('150.00%')).toBeInTheDocument());

    expect(fetch).toHaveBeenCalledTimes(1); // Only historical data fetch
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/coins/bitcoin/history?date=15-01-2023'),
      expect.any(Object)
    );
  });

  test('displays error message if current price fetch fails', async () => {
    fetch.mockReset(); // Clear default mocks
    mockFetchFailure(500, 'Failed to fetch current price'); // Current price fails
    // Historical price succeeds (or also fails, depending on what we want to test)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const formattedDateForApi = `${day}-${month}-${year}`;
    mockFetchSuccess({ market_data: { current_price: { usd: 40000 } } }, `api.coingecko.com/api/v3/coins/bitcoin/history?date=${formattedDateForApi}`);


    render(<CryptoDisplay />);

    await waitFor(() => {
      // Check for loading message turning into an error or absence of price
      // The component currently logs errors to console and sets price to null.
      // It shows "Loading current price..." if price is null.
      // We might want to enhance the component to show a specific error message in the UI.
      expect(screen.getByText('Loading current price...')).toBeInTheDocument();
    });
    // Ensure console.error was called (optional, requires spyOn(console, 'error'))
  });

  test('displays error message if historical price fetch fails', async () => {
    fetch.mockReset();
    mockFetchSuccess({ bitcoin: { usd: 50000 } }, 'simple/price?ids=bitcoin'); // Current price succeeds
    mockFetchFailure(500, 'Failed to fetch historical price'); // Historical price fails

    render(<CryptoDisplay />);

    await waitFor(() => {
      expect(screen.getByText('$50,000')).toBeInTheDocument(); // Current price loads
    });
    await waitFor(() => {
      // Similar to current price, it shows a loading/unavailable message.
      expect(screen.getByText(/Loading historical price for .* or data not available.../i)).toBeInTheDocument();
    });
  });

   test('handles API response with missing data gracefully for current price', async () => {
    fetch.mockReset();
    mockFetchSuccess({ bitcoin: {} }, 'simple/price?ids=bitcoin'); // Empty USD data
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const formattedDateForApi = `${day}-${month}-${year}`;
    mockFetchSuccess({ market_data: { current_price: { usd: 40000 } } }, `api.coingecko.com/api/v3/coins/bitcoin/history?date=${formattedDateForApi}`);

    render(<CryptoDisplay />);
    await waitFor(() => {
        expect(screen.getByText('Loading current price...')).toBeInTheDocument();
    });
  });

  test('handles API response with missing data gracefully for historical price', async () => {
    fetch.mockReset();
    mockFetchSuccess({ bitcoin: { usd: 50000 } }, 'simple/price?ids=bitcoin');
    mockFetchSuccess({ market_data: {} }, '/coins/bitcoin/history'); // Empty market_data

    render(<CryptoDisplay />);
    await waitFor(() => {
        expect(screen.getByText(/Loading historical price for .* or data not available.../i)).toBeInTheDocument();
    });
  });

});
