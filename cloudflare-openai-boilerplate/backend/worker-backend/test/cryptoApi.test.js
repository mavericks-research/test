// cloudflare-openai-boilerplate/backend/worker-backend/test/cryptoApi.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCoinList, getCurrentPrices, getHistoricalData, getTransactionHistory, getWalletTokenHoldings } from '../src/cryptoApi.js';

// Mock the openAIService module
vi.mock('../src/openAIService.js', () => ({
  generateReport: vi.fn(),
}));
// Import after mocking
import { generateReport as mockGenerateReport } from '../src/openAIService.js';


// Mock the global fetch function
global.fetch = vi.fn();

describe('Crypto API Tests (cryptoApi.js)', () => {
  beforeEach(() => {
    // Reset mocks before each test
    global.fetch.mockReset(); // Use mockReset to clear implementation and calls
  });

  // It's good practice to restore original implementations if they were globally mocked
  // though for global.fetch in a test environment, just resetting might be enough.
  // For more complex scenarios, consider vi.spyOn(global, 'fetch') and mockImplementation.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('CoinGecko Functions', () => {
    // --- Existing CoinGecko Tests ---
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
  // --- End of Existing CoinGecko Tests ---
  });


  describe('BlockCypher Functions (getTransactionHistory)', () => {
    const BLOCKCYPHER_API_BASE_URL = 'https://api.blockcypher.com/v1';

    it('should construct the correct API URL and fetch transaction history for BTC', async () => {
      const mockBtcTransactions = { txs: [{ hash: 'btc_tx_1' }] };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBtcTransactions,
      });

      const coinSymbol = 'btc';
      const address = 'someBtcAddress';
      const result = await getTransactionHistory(coinSymbol, address);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        `${BLOCKCYPHER_API_BASE_URL}/btc/main/addrs/${address}/full`,
        expect.objectContaining({ method: 'GET' })
      );
      expect(result).toEqual(mockBtcTransactions.txs);
    });

    it('should construct the correct API URL and fetch transaction history for ETH with token', async () => {
      const mockEthTransactions = { txs: [{ hash: 'eth_tx_1' }] };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEthTransactions,
      });

      const coinSymbol = 'eth';
      const address = 'someEthAddress';
      const token = 'testToken123';
      const result = await getTransactionHistory(coinSymbol, address, token);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        `${BLOCKCYPHER_API_BASE_URL}/eth/main/addrs/${address}/full?token=${token}`,
        expect.objectContaining({ method: 'GET' })
      );
      expect(result).toEqual(mockEthTransactions.txs);
    });

    it('should construct the correct API URL for LTC (lowercase)', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ txs: [] }),
      });
      await getTransactionHistory('LTC', 'someLtcAddress');
      expect(global.fetch).toHaveBeenCalledWith(
        `${BLOCKCYPHER_API_BASE_URL}/ltc/main/addrs/someLtcAddress/full`,
        expect.anything()
      );
    });

    it('should return an empty array if API response has no txs field', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}), // No 'txs' field
      });
      const result = await getTransactionHistory('btc', 'anotherAddress');
      expect(result).toEqual([]);
    });

    it('should return an empty array if API response txs field is null', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ txs: null }),
      });
      const result = await getTransactionHistory('btc', 'anotherAddress');
      expect(result).toEqual([]);
    });

    it('should throw an error if coinSymbol is missing', async () => {
      await expect(getTransactionHistory(null, 'someAddress')).rejects.toThrow('coinSymbol and address must be provided.');
    });

    it('should throw an error if address is missing', async () => {
      await expect(getTransactionHistory('btc', null)).rejects.toThrow('coinSymbol and address must be provided.');
    });

    it('should throw an error if BlockCypher API call fails (e.g., 404)', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Address not found or similar error.',
      });
      await expect(getTransactionHistory('btc', 'nonExistentAddress')).rejects.toThrow('BlockCypher API request failed: 404 Not Found - Address not found or similar error.');
    });

    it('should throw an error if BlockCypher API call fails (e.g., 500)', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        text: async () => 'Internal Server Error',
      });
      await expect(getTransactionHistory('eth', 'someEthAddress')).rejects.toThrow('BlockCypher API request failed: 500 Server Error - Internal Server Error');
    });

    it('should handle network errors during fetch', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network failure'));
      await expect(getTransactionHistory('ltc', 'someLtcAddress')).rejects.toThrow('Network failure');
    });
  });
});

describe('getWalletTokenHoldings', () => {
  const mockEnv = { OPENAI_API_KEY: 'test-key-for-getwallettokenholdings' };
  const walletAddress = '0xMockAddress';
  const chainId = 'ethereum';

  beforeEach(() => {
    mockGenerateReport.mockReset(); // Reset this specific mock
    // global.fetch.mockReset(); // Already done in the global beforeEach
  });

  it('should process mock holdings, calculate allocations, generate summary, and call generateReport', async () => {
    const mockAINarrative = 'This is a mock AI summary for the processed holdings.';
    mockGenerateReport.mockResolvedValue(mockAINarrative);

    // Since getCurrentPrices is internal and cryptoApi.js has fallback mock prices,
    // we rely on that internal mechanism for this test.
    // If getCurrentPrices were external and critical, it would be mocked too.
    // fetch.mockResolvedValue... (if getCurrentPrices was not self-contained with mocks)

    const result = await getWalletTokenHoldings(walletAddress, chainId, mockEnv);

    expect(result.tokenHoldings.length).toBeGreaterThan(0); // Based on internal mock data

    let calculatedTotalValue = 0;
    result.tokenHoldings.forEach(h => {
      calculatedTotalValue += parseFloat(h.value_usd); // Assuming value_usd is a string 'number.toFixed(2)'
      expect(h.percentageAllocation).toBeDefined();
      const percentage = parseFloat(h.percentageAllocation.replace('%', ''));
      expect(percentage).toBeGreaterThanOrEqual(0);
      expect(percentage).toBeLessThanOrEqual(100.01); // Allow for minor floating point artifcats sum to 100
      expect(h.value_usd_numeric).toBeUndefined(); // Ensure helper field is removed
    });

    // Verify that the sum of percentages is close to 100%
    const sumOfPercentages = result.tokenHoldings.reduce((sum, h) => sum + parseFloat(h.percentageAllocation.replace('%', '')), 0);
    expect(sumOfPercentages).toBeCloseTo(100, 1); // Close to 100 within 1 decimal place of precision

    expect(mockGenerateReport).toHaveBeenCalledTimes(1);
    const [passedHoldings, passedSummary, passedEnv] = mockGenerateReport.mock.calls[0];

    expect(passedHoldings.length).toEqual(result.tokenHoldings.length);
    passedHoldings.forEach(h => {
      expect(h.percentageAllocation).toBeDefined();
    });

    expect(passedSummary.totalPortfolioValueUSD).toBe(calculatedTotalValue.toFixed(2));
    expect(passedSummary.numberOfUniqueAssets).toBe(result.tokenHoldings.length);
    expect(passedSummary.topAssetsMessage).toBeDefined();

    // Validate topAssetsMessage content based on internal mock data structure
    // This is inherently coupled to the mock data in cryptoApi.js
    if (passedSummary.numberOfUniqueAssets > 0) {
        const sortedByValue = [...passedHoldings].sort((a,b) => parseFloat(b.value_usd) - parseFloat(a.value_usd));
        expect(passedSummary.topAssetsMessage).toContain(sortedByValue[0].name);
        if (passedSummary.numberOfUniqueAssets > 1) {
            expect(passedSummary.topAssetsMessage).toContain(sortedByValue[1].name);
        }
    } else {
        expect(passedSummary.topAssetsMessage).toEqual("The portfolio is currently empty.");
    }

    expect(passedEnv).toEqual(mockEnv);

    expect(result.reportNarrative).toBe(mockAINarrative);
    expect(result.tokenHoldings).toEqual(passedHoldings);
  });

  it('should return the narrative from generateReport even if holdings are empty (conceptually)', async () => {
    // This test is more about the flow if internal data somehow became empty.
    // The current cryptoApi.js mock data always provides 4 assets.
    // If we could inject empty mockHoldings at the start of getWalletTokenHoldings, this test would be more direct.
    const mockAINarrativeForEmpty = 'AI report for an empty or minimal portfolio.';
    mockGenerateReport.mockResolvedValue(mockAINarrativeForEmpty);

    // Assuming the internal mock data generation runs as is.
    const result = await getWalletTokenHoldings(walletAddress, chainId, mockEnv);

    const [passedHoldings, passedSummary, passedEnv] = mockGenerateReport.mock.calls[0];

    // If internal mock data is NOT empty (which is the case for cryptoApi.js)
    expect(passedHoldings.length).toBeGreaterThan(0);
    expect(passedSummary.numberOfUniqueAssets).toBeGreaterThan(0);
    // But the report narrative should still be what we mocked
    expect(result.reportNarrative).toBe(mockAINarrativeForEmpty);
  });

  // Test for when generateReport itself throws an error
  it('should propagate errors from generateReport', async () => {
    const errorMessage = "OpenAI service is down";
    mockGenerateReport.mockRejectedValueOnce(new Error(errorMessage));

    // We expect getWalletTokenHoldings to throw this error
    await expect(getWalletTokenHoldings(walletAddress, chainId, mockEnv))
      .rejects
      .toThrow(errorMessage);
  });

  // Test for when price fetching (getCurrentPrices) fails and fallback mock prices are used
  it('should use fallback mock prices and proceed if getCurrentPrices fails', async () => {
    // Simulate getCurrentPrices throwing an error.
    // Since getCurrentPrices is not directly mockable here without changing cryptoApi.js,
    // we rely on the fact that if it fails, the catch block in getWalletTokenHoldings
    // assigns default mock prices. This is an integration aspect being tested.
    // To explicitly test this, one might need to mock 'fetch' to fail for the prices call.

    fetch.mockImplementation((url) => {
      if (url.includes('api.coingecko.com/api/v3/simple/price')) {
        return Promise.resolve({
          ok: false,
          status: 500,
          text: async () => "CoinGecko price fetch error"
        });
      }
      // Handle other fetch calls if any (none expected in this specific function flow after prices)
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const mockAINarrative = 'AI report with fallback prices.';
    mockGenerateReport.mockResolvedValue(mockAINarrative);

    const result = await getWalletTokenHoldings(walletAddress, chainId, mockEnv);

    expect(result.tokenHoldings.length).toBeGreaterThan(0); // Should use internal mock holdings
    // Verify prices are the fallback ones (e.g. USDC price is 1.00)
    const usdcToken = result.tokenHoldings.find(t => t.symbol === 'USDC');
    if (usdcToken) {
        // The fallback is { 'usd-coin': { usd: 1.00 } }
        // and token.price_usd is priceData.usd.toFixed(2)
        expect(usdcToken.price_usd).toBe('1.00');
    }

    expect(mockGenerateReport).toHaveBeenCalledTimes(1);
    expect(result.reportNarrative).toBe(mockAINarrative);
  });
});
