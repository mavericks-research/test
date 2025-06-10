import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TrendingCoins from './TrendingCoins';
import * as cryptoService from '../services/cryptoService';

// Mock the cryptoService
jest.mock('../services/cryptoService');

describe('TrendingCoins Component', () => {
  const mockTrendingCoinsData = {
    coins: [
      { item: { coin_id: 1, name: 'Bitcoin', symbol: 'BTC', small: 'image_btc.png', market_cap_rank: 1 } },
      { item: { coin_id: 2, name: 'Ethereum', symbol: 'ETH', small: 'image_eth.png', market_cap_rank: 2 } },
    ],
  };

  beforeEach(() => {
    // Reset mocks before each test
    cryptoService.getTrendingCoins.mockReset();
  });

  test('renders loading state initially', () => {
    cryptoService.getTrendingCoins.mockResolvedValueOnce(new Promise(() => {})); // Keep promise pending
    render(<TrendingCoins />);
    expect(screen.getByText(/loading trending coins.../i)).toBeInTheDocument();
  });

  test('renders trending coins data correctly after successful fetch', async () => {
    cryptoService.getTrendingCoins.mockResolvedValueOnce(mockTrendingCoinsData);
    render(<TrendingCoins />);

    await waitFor(() => {
      expect(screen.getByText('Bitcoin (BTC)')).toBeInTheDocument();
      expect(screen.getByText('Market Cap Rank: 1')).toBeInTheDocument();
      expect(screen.getByAltText('Bitcoin')).toHaveAttribute('src', 'image_btc.png');

      expect(screen.getByText('Ethereum (ETH)')).toBeInTheDocument();
      expect(screen.getByText('Market Cap Rank: 2')).toBeInTheDocument();
      expect(screen.getByAltText('Ethereum')).toHaveAttribute('src', 'image_eth.png');
    });
  });

  test('renders an error message if getTrendingCoins throws an error', async () => {
    const errorMessage = 'Failed to fetch trending coins';
    cryptoService.getTrendingCoins.mockRejectedValueOnce(new Error(errorMessage));
    render(<TrendingCoins />);

    await waitFor(() => {
      expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
    });
  });

  test('renders "No trending coins found" when data is empty', async () => {
    cryptoService.getTrendingCoins.mockResolvedValueOnce({ coins: [] });
    render(<TrendingCoins />);

    await waitFor(() => {
      expect(screen.getByText('No trending coins found.')).toBeInTheDocument();
    });
  });

  test('renders "No trending coins found" when data is null', async () => {
    cryptoService.getTrendingCoins.mockResolvedValueOnce(null);
    render(<TrendingCoins />);

    await waitFor(() => {
      expect(screen.getByText('No trending coins found.')).toBeInTheDocument();
    });
  });

});
