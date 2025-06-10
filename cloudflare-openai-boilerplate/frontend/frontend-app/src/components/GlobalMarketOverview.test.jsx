import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GlobalMarketOverview from './GlobalMarketOverview';
import * as cryptoService from '../services/cryptoService';

// Mock the cryptoService
jest.mock('../services/cryptoService');

describe('GlobalMarketOverview Component', () => {
  const mockGlobalMarketData = {
    data: {
      total_market_cap: { usd: 1234567890123 },
      total_volume: { usd: 123456789012 },
      market_cap_percentage: { btc: 40.5, eth: 18.2 },
      active_cryptocurrencies: 10000,
      ongoing_icos: 5,
      ended_icos: 100,
      markets: 500,
      market_cap_change_percentage_24h_usd: 1.23,
    },
  };

  beforeEach(() => {
    // Reset mocks before each test
    cryptoService.getGlobalMarketData.mockReset();
  });

  test('renders loading state initially', () => {
    cryptoService.getGlobalMarketData.mockImplementationOnce(() => new Promise(() => {})); // Keep promise pending
    render(<GlobalMarketOverview />);
    expect(screen.getByText(/loading global market overview.../i)).toBeInTheDocument();
  });

  test('renders global market data correctly after successful fetch', async () => {
    cryptoService.getGlobalMarketData.mockResolvedValueOnce(mockGlobalMarketData);
    render(<GlobalMarketOverview />);

    await waitFor(() => {
      // Check for formatted values
      expect(screen.getByText('Total Market Cap')).toBeInTheDocument();
      expect(screen.getByText('$1,234,567,890,123')).toBeInTheDocument();

      expect(screen.getByText('Total Volume (24h)')).toBeInTheDocument();
      expect(screen.getByText('$123,456,789,012')).toBeInTheDocument();

      expect(screen.getByText('Active Cryptocurrencies')).toBeInTheDocument();
      expect(screen.getByText('10,000')).toBeInTheDocument();

      expect(screen.getByText('Ongoing ICOs')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();

      expect(screen.getByText('Ended ICOs')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();

      expect(screen.getByText('Markets')).toBeInTheDocument();
      expect(screen.getByText('500')).toBeInTheDocument();

      expect(screen.getByText('BTC Dominance')).toBeInTheDocument();
      expect(screen.getByText('40.50%')).toBeInTheDocument();

      expect(screen.getByText('ETH Dominance')).toBeInTheDocument();
      expect(screen.getByText('18.20%')).toBeInTheDocument();

      expect(screen.getByText('Market Cap Change (24h USD)')).toBeInTheDocument();
      expect(screen.getByText('1.23%')).toBeInTheDocument();
    });
  });

  test('renders an error message if getGlobalMarketData throws an error', async () => {
    const errorMessage = 'Failed to fetch global market data';
    cryptoService.getGlobalMarketData.mockRejectedValueOnce(new Error(errorMessage));
    render(<GlobalMarketOverview />);

    await waitFor(() => {
      expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
    });
  });

  test('renders "No global market data found" when data is null', async () => {
    cryptoService.getGlobalMarketData.mockResolvedValueOnce(null);
    render(<GlobalMarketOverview />);

    await waitFor(() => {
      expect(screen.getByText('No global market data found.')).toBeInTheDocument();
    });
  });

  test('renders "No global market data found" when data.data is null', async () => {
    cryptoService.getGlobalMarketData.mockResolvedValueOnce({ data: null });
    render(<GlobalMarketOverview />);

    await waitFor(() => {
      expect(screen.getByText('No global market data found.')).toBeInTheDocument();
    });
  });
});
