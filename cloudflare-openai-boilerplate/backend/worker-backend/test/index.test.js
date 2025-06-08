import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import worker from '../src/index'; // Assuming default export from src/index.js
// Import the functions to be mocked specifically from cryptoApi
import { getAssetsForAddress } from '../src/cryptoApi.js';

// Mock the cryptoApi module
vi.mock('../src/cryptoApi.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual, // Import and retain other functions from cryptoApi.js that are not being mocked directly in tests
    getAssetsForAddress: vi.fn(), // Mock specific function for wallet assets
    // Note: If other cryptoApi functions are called by routes NOT under test here,
    // they will use their actual implementations unless also vi.fn-ed here or mocked via global.fetch.
    // For /api/crypto/* routes that call CoinGecko directly, global.fetch mock is still relevant.
  };
});

// Helper to create a mock Request object
const mockRequest = (method, body, headers = { 'Content-Type': 'application/json' }) => ({
  method,
  headers: new Headers(headers),
  json: async () => body, // For POST requests
  url: 'http://localhost/', // Mock URL
});

// Mock environment variables
const mockEnv = {
  ETHERSCAN_API_KEY: 'test-etherscan-key',
  OPENAI_API_KEY: 'test-openai-key',
};

describe('index.js (Worker Integration Tests)', () => {
  beforeEach(() => {
    // Mock global fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks(); // Clean up mocks
  });

  describe('Successful Workflow with Transactions', () => {
    it('should fetch, normalize, call OpenAI, and return AI summary', async () => {
      const mockWalletAddress = '0x123';
      const mockEtherscanTransactions = [
        { hash: '0xtx1', to: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', value: '1000000000000000000', timeStamp: '1672531200', from: '0xfrom1' },
        { hash: '0xtx2', to: '0xanotherAddress', value: '500000000000000000', timeStamp: '1672534800', from: '0xfrom2' },
      ];
      const mockOpenAIResponse = {
        choices: [{ text: 'This is a mock AI summary of the transactions.' }],
      };

      // Mock Etherscan API response
      fetch.mockResolvedValueOnce(new Response(JSON.stringify({
        status: '1',
        message: 'OK',
        result: mockEtherscanTransactions,
      }), { headers: { 'Content-Type': 'application/json' } }));

      // Mock OpenAI API response
      fetch.mockResolvedValueOnce(new Response(JSON.stringify(mockOpenAIResponse), {
        headers: { 'Content-Type': 'application/json' },
      }));

      const request = mockRequest('POST', { walletAddress: mockWalletAddress });
      const response = await worker.fetch(request, mockEnv, {}); // Assuming worker.fetch(request, env, ctx)
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.message).toBe('AI summary generated successfully');
      expect(responseBody.summary).toBe(mockOpenAIResponse.choices[0].text);
      expect(responseBody.transactionData).toBeInstanceOf(Array);
      expect(responseBody.transactionData.length).toBe(2);
      expect(responseBody.transactionData[0].tokenInvolved).toBe('USDC'); // from normalizer
      expect(responseBody.transactionData[0].dateTime).toBe('2023-01-01T00:00:00.000Z'); // from normalizer

      // Check fetch calls
      expect(fetch).toHaveBeenCalledTimes(2);
      // Etherscan call
      expect(fetch.mock.calls[0][0]).toContain(`https://api.etherscan.io/api`);
      expect(fetch.mock.calls[0][0]).toContain(mockWalletAddress);
      expect(fetch.mock.calls[0][0]).toContain(mockEnv.ETHERSCAN_API_KEY);
      // OpenAI call
      expect(fetch.mock.calls[1][0]).toBe('https://api.openai.com/v1/completions');
      expect(fetch.mock.calls[1][1].method).toBe('POST');
      expect(fetch.mock.calls[1][1].headers['Authorization']).toBe(`Bearer ${mockEnv.OPENAI_API_KEY}`);
      const openAICallBody = JSON.parse(fetch.mock.calls[1][1].body);
      expect(openAICallBody.prompt).toContain(mockWalletAddress);
      expect(openAICallBody.prompt).toContain('Total Transactions: 2');
    });
  });

  describe('Workflow with No Transactions', () => {
    it('should call OpenAI for a "no transactions" summary', async () => {
      const mockWalletAddress = '0xempty';
      const mockOpenAIResponse = {
        choices: [{ text: 'This wallet has no transactions.' }],
      };

      // Mock Etherscan API response (no transactions)
      fetch.mockResolvedValueOnce(new Response(JSON.stringify({
        status: '0',
        message: 'No transactions found',
        result: [],
      }), { headers: { 'Content-Type': 'application/json' } }));

      // Mock OpenAI API response
      fetch.mockResolvedValueOnce(new Response(JSON.stringify(mockOpenAIResponse), {
        headers: { 'Content-Type': 'application/json' },
      }));

      const request = mockRequest('POST', { walletAddress: mockWalletAddress });
      const response = await worker.fetch(request, mockEnv, {});
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.message).toBe('No transactions found');
      expect(responseBody.summary).toBe(mockOpenAIResponse.choices[0].text);
      expect(responseBody.transactionData).toEqual([]);

      expect(fetch).toHaveBeenCalledTimes(2);
      const openAICallBody = JSON.parse(fetch.mock.calls[1][1].body);
      expect(openAICallBody.prompt).toContain('No transactions were found for this wallet');
    });
  });

  describe('Error Handling', () => {
    it('should return 400 if walletAddress is missing', async () => {
      const request = mockRequest('POST', {}); // No walletAddress
      const response = await worker.fetch(request, mockEnv, {});
      expect(response.status).toBe(400);
      const responseBody = await response.json(); // Cloudflare Response.json() if status is error
      expect(responseBody).toBe('Missing "walletAddress" in request body'); // Or check actual text if using new Response directly
    });

    it('should return 400 if JSON body is invalid', async () => {
        const request = {
            method: 'POST',
            headers: new Headers({ 'Content-Type': 'application/json' }),
            json: async () => { throw new Error("Invalid JSON"); }, // Simulate invalid JSON
            url: 'http://localhost/',
        };
        const response = await worker.fetch(request, mockEnv, {});
        expect(response.status).toBe(400);
        const responseBody = await response.json();
        expect(responseBody).toBe('Invalid JSON body');
    });


    it('should return 500 if OPENAI_API_KEY is missing', async () => {
      const request = mockRequest('POST', { walletAddress: '0x123' });
      const envWithoutOpenAI = { ...mockEnv, OPENAI_API_KEY: undefined };
      const response = await worker.fetch(request, envWithoutOpenAI, {});
      expect(response.status).toBe(500);
      const responseBody = await response.json();
      expect(responseBody).toContain('OPENAI_API_KEY not configured');
    });

    it('should return 500 if ETHERSCAN_API_KEY is missing', async () => {
        const request = mockRequest('POST', { walletAddress: '0x123' });
        const envWithoutEtherscan = { ...mockEnv, ETHERSCAN_API_KEY: undefined };
        const response = await worker.fetch(request, envWithoutEtherscan, {});
        expect(response.status).toBe(500);
        const responseBody = await response.json();
        expect(responseBody).toContain('ETHERSCAN_API_KEY not configured');
    });

    it('should handle Etherscan API error', async () => {
      fetch.mockResolvedValueOnce(new Response('Etherscan API is down', { status: 503 }));
      const request = mockRequest('POST', { walletAddress: '0x123' });
      const response = await worker.fetch(request, mockEnv, {});
      expect(response.status).toBe(503);
      const responseBody = await response.json();
      expect(responseBody).toContain('Etherscan API request failed: 503');
    });

    it('should handle OpenAI API error', async () => {
      // Mock Etherscan successful response
      fetch.mockResolvedValueOnce(new Response(JSON.stringify({
        status: '1', result: [{ hash: '0xtx1', to: '0xaddr', value: '1', timeStamp: '1672531200', from: '0xfrom1' }]
      }), { headers: { 'Content-Type': 'application/json' } }));
      // Mock OpenAI API error
      fetch.mockResolvedValueOnce(new Response('OpenAI API is down', { status: 500 }));

      const request = mockRequest('POST', { walletAddress: '0x123' });
      const response = await worker.fetch(request, mockEnv, {});
      expect(response.status).toBe(500);
      const responseBody = await response.json();
      expect(responseBody).toContain('OpenAI API request failed: 500');
    });

    it('should handle unexpected Etherscan API response structure', async () => {
      fetch.mockResolvedValueOnce(new Response(JSON.stringify({
        // Missing status or result
        unexpected_data: "error from etherscan"
      }), { headers: { 'Content-Type': 'application/json' } }));

      const request = mockRequest('POST', { walletAddress: '0x123' });
      const response = await worker.fetch(request, mockEnv, {});
      expect(response.status).toBe(500);
      const responseBody = await response.json();
      expect(responseBody).toBe('Unexpected response from Etherscan API');
    });
  });

  describe('Crypto API Routes', () => {
    const mockCoinGeckoApiKey = 'mock-cg-key';
    const mockCovalentApiKey = 'mock-covalent-key';
    const mockEnvWithCrypto = {
      ...mockEnv,
      COINGECKO_API_KEY: mockCoinGeckoApiKey,
      COVALENT_API_KEY: mockCovalentApiKey,
    };

    describe('/api/crypto/current', () => {
      it('should call CoinGecko with correct params and return current price data including market cap, vol, and change', async () => {
        const mockApiResponse = {
          bitcoin: {
            usd: 60000,
            usd_market_cap: 1200000000000,
            usd_24h_vol: 50000000000,
            usd_24h_change: 2.5,
          },
        };
        global.fetch.mockResolvedValueOnce(new Response(JSON.stringify(mockApiResponse), {
          headers: { 'Content-Type': 'application/json' },
        }));

        const request = { // Simplified mock for GET request
          method: 'GET',
          url: new URL('http://localhost/api/crypto/current?coins=bitcoin&currencies=usd'),
          headers: new Headers(),
        };
        const response = await worker.fetch(request, mockEnvWithCrypto, {});
        const responseBody = await response.json();

        expect(response.status).toBe(200);
        expect(responseBody).toEqual(mockApiResponse);

        expect(global.fetch).toHaveBeenCalledTimes(1);
        const fetchCall = global.fetch.mock.calls[0][0];
        const fetchUrl = new URL(fetchCall);
        expect(fetchUrl.origin).toBe('https://api.coingecko.com');
        expect(fetchUrl.pathname).toBe('/api/v3/simple/price');
        expect(fetchUrl.searchParams.get('ids')).toBe('bitcoin');
        expect(fetchUrl.searchParams.get('vs_currencies')).toBe('usd');
        expect(fetchUrl.searchParams.get('include_market_cap')).toBe('true');
        expect(fetchUrl.searchParams.get('include_24hr_vol')).toBe('true');
        expect(fetchUrl.searchParams.get('include_24hr_change')).toBe('true');
        // expect(fetchUrl.searchParams.get('x_cg_demo_api_key')).toBe(mockCoinGeckoApiKey); // If API key was passed
      });

      it('should return 400 if "coins" or "currencies" params are missing', async () => {
        const request1 = { method: 'GET', url: new URL('http://localhost/api/crypto/current?currencies=usd'), headers: new Headers() };
        const response1 = await worker.fetch(request1, mockEnvWithCrypto, {});
        expect(response1.status).toBe(400);
        expect(await response1.text()).toBe('Missing "coins" or "currencies" query parameters');

        const request2 = { method: 'GET', url: new URL('http://localhost/api/crypto/current?coins=bitcoin'), headers: new Headers() };
        const response2 = await worker.fetch(request2, mockEnvWithCrypto, {});
        expect(response2.status).toBe(400);
        expect(await response2.text()).toBe('Missing "coins" or "currencies" query parameters');
      });
    });

    describe('/api/crypto/coins-by-blockchain', () => {
      const mockCoins = [
        { id: 'token1', symbol: 'tkn1', name: 'Token 1', current_price: 100, market_cap: 1000000, total_volume: 50000, price_change_percentage_24h: 1.5 },
        { id: 'token2', symbol: 'tkn2', name: 'Token 2', current_price: 20, market_cap: 200000, total_volume: 10000, price_change_percentage_24h: -0.5 },
      ];

      it('should call CoinGecko with correct asset_platform_id for Ethereum and return tokens', async () => {
        global.fetch.mockResolvedValueOnce(new Response(JSON.stringify(mockCoins), {
          headers: { 'Content-Type': 'application/json' },
        }));

        const request = {
          method: 'GET',
          url: new URL('http://localhost/api/crypto/coins-by-blockchain?platform=ethereum&currency=usd'),
          headers: new Headers(),
        };
        const response = await worker.fetch(request, mockEnvWithCrypto, {});
        const responseBody = await response.json();

        expect(response.status).toBe(200);
        expect(responseBody).toEqual(mockCoins); // Backend directly returns CG response for now

        expect(global.fetch).toHaveBeenCalledTimes(1);
        const fetchCall = global.fetch.mock.calls[0][0];
        const fetchUrl = new URL(fetchCall);
        expect(fetchUrl.origin).toBe('https://api.coingecko.com');
        expect(fetchUrl.pathname).toBe('/api/v3/coins/markets');
        expect(fetchUrl.searchParams.get('vs_currency')).toBe('usd');
        expect(fetchUrl.searchParams.get('asset_platform_id')).toBe('ethereum');
      });

      it('should call CoinGecko with correct asset_platform_id for BSC', async () => {
        global.fetch.mockResolvedValueOnce(new Response(JSON.stringify(mockCoins)));
        const request = { method: 'GET', url: new URL('http://localhost/api/crypto/coins-by-blockchain?platform=bsc&currency=usd'), headers: new Headers() };
        await worker.fetch(request, mockEnvWithCrypto, {});

        expect(global.fetch).toHaveBeenCalledTimes(1);
        const fetchCall = global.fetch.mock.calls[0][0];
        const fetchUrl = new URL(fetchCall);
        expect(fetchUrl.searchParams.get('asset_platform_id')).toBe('binance-smart-chain');
      });

      it('should call CoinGecko with correct asset_platform_id for Solana', async () => {
        global.fetch.mockResolvedValueOnce(new Response(JSON.stringify(mockCoins)));
        const request = { method: 'GET', url: new URL('http://localhost/api/crypto/coins-by-blockchain?platform=solana&currency=usd'), headers: new Headers() };
        await worker.fetch(request, mockEnvWithCrypto, {});

        expect(global.fetch).toHaveBeenCalledTimes(1);
        const fetchCall = global.fetch.mock.calls[0][0];
        const fetchUrl = new URL(fetchCall);
        expect(fetchUrl.searchParams.get('asset_platform_id')).toBe('solana');
      });

      it('should return 400 if platform or currency is missing', async () => {
        const requestPlatformMissing = { method: 'GET', url: new URL('http://localhost/api/crypto/coins-by-blockchain?currency=usd'), headers: new Headers() };
        const resPlatform = await worker.fetch(requestPlatformMissing, mockEnvWithCrypto, {});
        expect(resPlatform.status).toBe(400);
        expect(await resPlatform.json()).toEqual({ error: 'Missing "platform" or "currency" query parameters.' });

        const requestCurrencyMissing = { method: 'GET', url: new URL('http://localhost/api/crypto/coins-by-blockchain?platform=ethereum'), headers: new Headers() };
        const resCurrency = await worker.fetch(requestCurrencyMissing, mockEnvWithCrypto, {});
        expect(resCurrency.status).toBe(400);
        expect(await resCurrency.json()).toEqual({ error: 'Missing "platform" or "currency" query parameters.' });
      });

      it('should return 400 for invalid platform', async () => {
        const request = { method: 'GET', url: new URL('http://localhost/api/crypto/coins-by-blockchain?platform=invalidplatform&currency=usd'), headers: new Headers() };
        const response = await worker.fetch(request, mockEnvWithCrypto, {});
        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: 'Invalid "platform". Supported platforms: ethereum, bsc, solana.' });
      });

      it('should handle CoinGecko API failure gracefully', async () => {
        global.fetch.mockRejectedValueOnce(new Error("CoinGecko API is down"));
        // OR: global.fetch.mockResolvedValueOnce(new Response("Server Error", { status: 500 }));

        const request = {
          method: 'GET',
          url: new URL('http://localhost/api/crypto/coins-by-blockchain?platform=ethereum&currency=usd'),
          headers: new Headers(),
        };
        const response = await worker.fetch(request, mockEnvWithCrypto, {});
        expect(response.status).toBe(502); // Or 500 if the error is not specifically a "CoinGecko API request failed"
        const body = await response.json();
        expect(body.error).toContain("CoinGecko API request failed");
        // If mockRejectedValueOnce is used, the actual message might be different, like "Error processing your request: CoinGecko API is down"
        // For this test to pass with "CoinGecko API request failed", the fetchFromCoinGecko function must catch the error and rethrow a new error with that specific message.
      });
    });

    describe('/api/wallet/assets', () => {
      const sampleAssets = [
        { name: 'Ethereum', symbol: 'ETH', balance: 1.5, price: 3000, value: 4500 },
        { name: 'Test Token', symbol: 'TST', balance: 100, price: 1.25, value: 125 },
      ];

      beforeEach(() => {
        // Reset mock before each test in this suite
        getAssetsForAddress.mockReset();
      });

      it('should fetch Ethereum assets successfully', async () => {
        getAssetsForAddress.mockResolvedValue(sampleAssets);
        const request = { method: 'GET', url: new URL('http://localhost/api/wallet/assets?address=0xTestEth&chain=ethereum'), headers: new Headers() };
        const response = await worker.fetch(request, mockEnvWithCrypto, {});
        const responseBody = await response.json();

        expect(response.status).toBe(200);
        expect(responseBody).toEqual(sampleAssets);
        expect(getAssetsForAddress).toHaveBeenCalledWith('eth-mainnet', '0xTestEth', mockCovalentApiKey);
      });

      it('should fetch BSC assets successfully', async () => {
        getAssetsForAddress.mockResolvedValue(sampleAssets);
        const request = { method: 'GET', url: new URL('http://localhost/api/wallet/assets?address=0xTestBsc&chain=bsc'), headers: new Headers() };
        await worker.fetch(request, mockEnvWithCrypto, {});
        expect(getAssetsForAddress).toHaveBeenCalledWith('bsc-mainnet', '0xTestBsc', mockCovalentApiKey);
      });

      it('should fetch Solana assets successfully', async () => {
        getAssetsForAddress.mockResolvedValue(sampleAssets);
        const request = { method: 'GET', url: new URL('http://localhost/api/wallet/assets?address=SoTestSol&chain=solana'), headers: new Headers() };
        await worker.fetch(request, mockEnvWithCrypto, {});
        expect(getAssetsForAddress).toHaveBeenCalledWith('solana-mainnet', 'SoTestSol', mockCovalentApiKey);
      });

      it('should return 400 if address parameter is missing', async () => {
        const request = { method: 'GET', url: new URL('http://localhost/api/wallet/assets?chain=ethereum'), headers: new Headers() };
        const response = await worker.fetch(request, mockEnvWithCrypto, {});
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.error).toBe('Missing "address" or "chain" query parameters.');
      });

      it('should return 400 if chain parameter is missing', async () => {
        const request = { method: 'GET', url: new URL('http://localhost/api/wallet/assets?address=0xTest'), headers: new Headers() };
        const response = await worker.fetch(request, mockEnvWithCrypto, {});
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.error).toBe('Missing "address" or "chain" query parameters.');
      });

      it('should return 400 for an invalid chain parameter', async () => {
        const request = { method: 'GET', url: new URL('http://localhost/api/wallet/assets?address=0xTest&chain=invalidchain'), headers: new Headers() };
        const response = await worker.fetch(request, mockEnvWithCrypto, {});
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.error).toBe('Invalid "chain" parameter. Supported: ethereum, bsc, solana.');
      });

      it('should return 500 if COVALENT_API_KEY is missing', async () => {
        const envWithoutCovalentKey = { ...mockEnvWithCrypto, COVALENT_API_KEY: undefined };
        const request = { method: 'GET', url: new URL('http://localhost/api/wallet/assets?address=0xTest&chain=ethereum'), headers: new Headers() };
        const response = await worker.fetch(request, envWithoutCovalentKey, {});
        expect(response.status).toBe(500);
        const body = await response.json();
        expect(body.error).toBe('Service configuration error: Covalent API key missing.');
      });

      it('should return 502 if getAssetsForAddress throws a Covalent API error', async () => {
        getAssetsForAddress.mockRejectedValue(new Error('Covalent API request failed: 500 Internal Server Error'));
        const request = { method: 'GET', url: new URL('http://localhost/api/wallet/assets?address=0xTest&chain=ethereum'), headers: new Headers() };
        const response = await worker.fetch(request, mockEnvWithCrypto, {});
        expect(response.status).toBe(502);
        const body = await response.json();
        expect(body.error).toContain('Covalent API request failed');
      });

      it('should return 400 if getAssetsForAddress throws a Covalent API error for invalid address', async () => {
        getAssetsForAddress.mockRejectedValue(new Error('Covalent API request failed: 400 Invalid address format'));
        const request = { method: 'GET', url: new URL('http://localhost/api/wallet/assets?address=invalidAddress&chain=ethereum'), headers: new Headers() };
        const response = await worker.fetch(request, mockEnvWithCrypto, {});
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.error).toContain('Covalent API request failed: 400 Invalid address format');
      });

      it('should return 500 if getAssetsForAddress throws an unexpected error', async () => {
        getAssetsForAddress.mockRejectedValue(new Error('Some unexpected error'));
        const request = { method: 'GET', url: new URL('http://localhost/api/wallet/assets?address=0xTest&chain=ethereum'), headers: new Headers() };
        const response = await worker.fetch(request, mockEnvWithCrypto, {});
        expect(response.status).toBe(500);
        const body = await response.json();
        expect(body.error).toBe('An unexpected error occurred: Some unexpected error');
      });
    });
  });
});
