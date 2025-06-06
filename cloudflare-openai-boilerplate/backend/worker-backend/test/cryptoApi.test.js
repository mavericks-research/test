// cloudflare-openai-boilerplate/backend/worker-backend/test/cryptoApi.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCoinList, getCurrentPrices, getHistoricalData } from '../src/cryptoApi';

// Mock the global fetch function used by fetchFromCoinGecko
// Or, if fetchFromCoinGecko is easily mockable itself, that could be an alternative.
// For this example, we'll assume fetchFromCoinGecko internally uses global fetch.
global.fetch = vi.fn();

describe('Crypto API Tests (cryptoApi.js)', () => {
  beforeEach(() => {
    // Reset mocks before each test
    global.fetch.mockClear();
  });

  describe('getCoinList', () => {
    it('should fetch and return the coin list', async () => {
      const mockCoinList = [{ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' }];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCoinList,
      });

      const result = await getCoinList();
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.coingecko.com/api/v3/coins/list', // Or new URL object if params are involved
        expect.objectContaining({ method: 'GET' })
      );
      expect(result).toEqual(mockCoinList);
    });

    it('should throw an error if the API call fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        text: async () => 'Internal Server Error',
      });

      await expect(getCoinList()).rejects.toThrow('CoinGecko API request failed: 500 Server Error - Internal Server Error');
    });
  });

  describe('getCurrentPrices', () => {
    it('should fetch and return current prices for given coins and currencies', async () => {
      const mockPrices = { bitcoin: { usd: 50000 }, ethereum: { usd: 4000 } };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrices,
      });

      const coinIds = ['bitcoin', 'ethereum'];
      const vsCurrencies = ['usd'];
      const result = await getCurrentPrices(coinIds, vsCurrencies);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const expectedUrl = new URL('https://api.coingecko.com/api/v3/simple/price');
      expectedUrl.searchParams.append('ids', coinIds.join(','));
      expectedUrl.searchParams.append('vs_currencies', vsCurrencies.join(','));
      expectedUrl.searchParams.append('include_market_cap', 'false');
      expectedUrl.searchParams.append('include_24hr_vol', 'false');
      expectedUrl.searchParams.append('include_24hr_change', 'false');
      expectedUrl.searchParams.append('include_last_updated_at', 'false');

      expect(global.fetch).toHaveBeenCalledWith(expectedUrl.toString(), expect.objectContaining({ method: 'GET' }));
      expect(result).toEqual(mockPrices);
    });

    it('should throw error if coinIds is empty', async () => {
      await expect(getCurrentPrices([], ['usd'])).rejects.toThrow('coinIds array cannot be empty.');
    });

    it('should throw error if vsCurrencies is empty', async () => {
      await expect(getCurrentPrices(['bitcoin'], [])).rejects.toThrow('vsCurrencies array cannot be empty.');
    });
  });

  describe('getHistoricalData', () => {
    it('should fetch and return historical data for a given coin and date', async () => {
      const mockHistorical = { market_data: { current_price: { usd: 45000 } } };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistorical,
      });

      const coinId = 'bitcoin';
      const date = '30-12-2023'; // dd-mm-yyyy
      const result = await getHistoricalData(coinId, date);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const expectedUrl = new URL(`https://api.coingecko.com/api/v3/coins/${coinId}/history`);
      expectedUrl.searchParams.append('date', date);
      expectedUrl.searchParams.append('localization', 'false');

      expect(global.fetch).toHaveBeenCalledWith(expectedUrl.toString(), expect.objectContaining({ method: 'GET' }));
      expect(result).toEqual(mockHistorical);
    });

    it('should throw error if coinId is empty', async () => {
      await expect(getHistoricalData('', '30-12-2023')).rejects.toThrow('coinId cannot be empty.');
    });

    it('should throw error if date format is invalid', async () => {
      await expect(getHistoricalData('bitcoin', '2023-12-30')).rejects.toThrow('Date must be in dd-mm-yyyy format.');
    });
  });
});
