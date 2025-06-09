// frontend/frontend-app/src/services/cryptoService.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getWalletTokenHoldings, getCoinMarketChart } from './cryptoService'; // Assuming API_BASE_URL is handled by Vite/Vitest setup

// Mock the global fetch function
global.fetch = vi.fn();

// Define a base URL as it would be in a Vite environment for testing purposes
// In actual Vite setup, import.meta.env.VITE_API_BASE_URL would be used.
// For tests, we often set it to empty if requests are fully mocked or to a test server if not.
// Since we are mocking fetch, the actual value here is less critical but good for consistency.
const API_BASE_URL = ''; // Or your test server base URL if doing integration tests

describe('cryptoService', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('getWalletTokenHoldings', () => {
    const mockWalletAddress = '0x123Test';
    const mockChainId = 'ethereum';

    it('should fetch and return comprehensive wallet data on successful API call', async () => {
      const mockApiResponse = {
        tokenHoldings: [{ name: 'Test Token', symbol: 'TST', balance: '100', value_usd: '1000', percentageAllocation: '100%' }],
        financialSummary: { totalPortfolioValueUSD: '1000.00', numberOfUniqueAssets: 1, topAssetsMessage: 'Top asset is Test Token.' },
        behavioralAnalysis: { tags: ['Test Tag'], metrics: { totalTransactions: 10 } },
        reportNarrative: 'This is a test AI narrative.',
        warningNote: '',
        errorNote: null,
      };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const result = await getWalletTokenHoldings(mockWalletAddress, mockChainId);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/wallet/token-holdings?walletAddress=${encodeURIComponent(mockWalletAddress)}&chainId=${encodeURIComponent(mockChainId)}`
      );
      expect(result).toEqual(mockApiResponse);
    });

    it('should throw an error if walletAddress is not provided', async () => {
      await expect(getWalletTokenHoldings('', mockChainId)).rejects.toThrow('Wallet address is required to fetch token holdings.');
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should throw an error if chainId is not provided', async () => {
      await expect(getWalletTokenHoldings(mockWalletAddress, '')).rejects.toThrow('Chain ID is required to fetch token holdings.');
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should throw an error if the API call fails (non-200 status)', async () => {
      const errorResponse = { error: "Failed due to server issue" };
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => errorResponse,
      });

      await expect(getWalletTokenHoldings(mockWalletAddress, mockChainId)).rejects.toThrow(`Failed to fetch token holdings for ${mockWalletAddress} on ${mockChainId}: Internal Server Error - ${errorResponse.error}`);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should throw an error with statusText if error JSON parsing fails', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => { throw new Error('Malformed JSON'); }, // Simulate JSON parsing error
      });

      await expect(getWalletTokenHoldings(mockWalletAddress, mockChainId)).rejects.toThrow(`Failed to fetch token holdings for ${mockWalletAddress} on ${mockChainId}: Internal Server Error`);
      expect(fetch).toHaveBeenCalledTimes(1);
    });


    it('should throw an error if fetch itself fails (network error)', async () => {
      fetch.mockRejectedValueOnce(new Error('Network connection error'));

      await expect(getWalletTokenHoldings(mockWalletAddress, mockChainId)).rejects.toThrow('Network connection error');
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  // Optional: Add tests for getCoinMarketChart if not already covered elsewhere
  describe('getCoinMarketChart', () => {
    const mockCoinId = 'bitcoin';
    const mockDays = '30';

    it('should fetch and return coin market chart data', async () => {
      const mockChartData = [{ date: '2023-01-01', price: 40000 }];
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockChartData,
      });

      const result = await getCoinMarketChart(mockCoinId, mockDays);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/crypto/market-chart/${mockCoinId}?days=${mockDays}`
      );
      expect(result).toEqual(mockChartData);
    });

    it('should throw an error if coinId is missing for market chart', async () => {
        await expect(getCoinMarketChart('', mockDays)).rejects.toThrow('Coin ID is required to fetch market chart data.');
    });

    it('should throw an error if days is missing for market chart', async () => {
        await expect(getCoinMarketChart(mockCoinId, '')).rejects.toThrow('Number of days is required to fetch market chart data.');
    });
  });
});
