// cloudflare-openai-boilerplate/backend/worker-backend/test/integration/reportEndpoint.test.js
import { Miniflare } from 'miniflare';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';

// Path to the worker script (adjust if your bundled output is elsewhere or named differently)
// This assumes you have a build process that outputs a single worker.js or similar.
// If testing directly from src/index.js, ensure all modules are correctly handled by Miniflare.
const workerScriptPath = 'src/index.js'; // Adjust as necessary

describe('Integration Test for /api/wallet/token-holdings Endpoint', () => {
  let mf;

  // Store original fetch
  const originalFetch = global.fetch;

  beforeAll(() => {
    // Initialize Miniflare
    // Note: Bindings (KV, DO, R2, etc.) and other Miniflare options would be configured here if used by the worker.
    // For this test, we primarily need to mock ENV vars and global fetch.
    mf = new Miniflare({
      scriptPath: workerScriptPath,
      modules: true, // Assuming ES modules
      envPath: '.env.test', // Example: use a specific .env file for test secrets if any
      // You can directly set environment variables here as well:
      // bindings: { MORALIS_API_KEY: "test_moralis_key", OPENAI_API_KEY: "test_openai_key", COINGECKO_API_KEY: "test_coingecko_key" },
      // For this test, we will mock fetch globally, so actual API keys in env are less critical
      // but good for testing if the worker correctly reads them.
      bindings: {
        MORALIS_API_KEY: 'mock-moralis-key',
        OPENAI_API_KEY: 'mock-openai-key',
        COINGECKO_API_KEY: 'mock-coingecko-key', // If your getCurrentPrices uses it
        // Add other necessary environment variables your worker expects
      },
    });
  });

  beforeEach(async () => {
    // Reset global fetch mock before each test
    global.fetch = vi.fn();
  });

  afterEach(() => {
    // Ensure mocks are cleared after each test
    vi.clearAllMocks();
  });

  afterAll(async () => {
    // Restore original fetch
    global.fetch = originalFetch;
    // Dispose of Miniflare instance after all tests are done
    if (mf) {
      await mf.dispose();
    }
  });

  // --- Helper for dispatching requests ---
  const dispatchRequest = async (path, method = 'GET', headers = {}) => {
    const defaultHeaders = { 'Content-Type': 'application/json', ...headers };
    const request = new Request(`http://localhost${path}`, { method, headers });
    return mf.dispatchFetch(request);
  };

  // --- Test Cases ---

  describe('Scenario 1: Successful Full Report Generation', () => {
    it('should return a 200 OK with comprehensive report data', async () => {
      // Mock Setup for fetch calls
      global.fetch
        // Moralis - Token Balances
        .mockResolvedValueOnce({ // Assumes this is the first fetch call in the worker for this endpoint
          ok: true,
          json: async () => ([
            { token_address: '0xToken1', name: 'Test Token 1', symbol: 'TST1', balance: '1000000', decimals: '6', possible_spam: false },
            { token_address: '0xToken2', name: 'Test Token 2', symbol: 'TST2', balance: '2000000000000000000', decimals: '18', possible_spam: false },
          ]),
        })
        // Moralis - Native Balance
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ balance: '500000000000000000' }), // 0.5 ETH
        })
        // CoinGecko - Prices (getCurrentPrices)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            'ethereum': { usd: 2000 },
            'test-token-1-coingecko-id': { usd: 1.00 }, // Assuming a mapping exists
            'test-token-2-coingecko-id': { usd: 10.00 },// Assuming a mapping exists
          }),
        })
        // Moralis - Transaction History
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: [
              { hash: '0xtx1', from_address: '0xSender', to_address: '0xReceiverContract', value: '100000000000000000', gas_price: '20000000000', gas_used: '21000', block_timestamp: new Date().toISOString(), input: '0xsomeSwapData', decoded_call: { label: 'Swap(...)'} },
            ],
          }),
        })
        // OpenAI - Narrative
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ choices: [{ message: { content: 'Mocked AI Narrative: Successful full report.' } }] }),
        });

      // Helper to map token addresses to coingecko IDs if your code needs it.
      // This part depends on how mapMoralisTokenToCoinGeckoId is implemented.
      // For this test, we assume the mock prices above use IDs that would be resolved.

      const response = await dispatchRequest('/api/wallet/token-holdings?walletAddress=0xTestAddress&chainId=ethereum');
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('application/json');

      const body = await response.json();

      expect(body).toHaveProperty('tokenHoldings');
      expect(body.tokenHoldings.length).toBeGreaterThanOrEqual(3); // 2 ERC20 + 1 Native
      expect(body).toHaveProperty('financialSummary');
      expect(body.financialSummary.totalPortfolioValueUSD).toBeDefined();
      expect(body).toHaveProperty('behavioralAnalysis');
      expect(body.behavioralAnalysis.tags).toContain('DEX User'); // Based on "Swap(...)"
      expect(body.behavioralAnalysis.metrics.totalTransactions).toBe(1);
      expect(body).toHaveProperty('reportNarrative', 'Mocked AI Narrative: Successful full report.');
      expect(body).not.toHaveProperty('errorNote');
      expect(body).not.toHaveProperty('warningNote');
    });
  });

  describe('Scenario 2: Error from Moralis (Token Balances Failed)', () => {
    it('should return an appropriate error status and message', async () => {
      global.fetch
        // Moralis - Token Balances (simulating failure)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Moralis Internal Error',
          text: async () => 'Moralis server is down for token balances', // Use text for non-JSON error from Moralis
        });
      // Other fetches might not be called if this one fails and worker returns early.

      const response = await dispatchRequest('/api/wallet/token-holdings?walletAddress=0xTestAddress&chainId=ethereum');

      // The worker's index.js logic for handling errors from cryptoApi.js will determine this.
      // Assuming it's 502 if the dependency fails.
      expect(response.status).toBe(502);
      const body = await response.json();
      expect(body.error).toContain('Failed to fetch token balances from Moralis');
      expect(body.error).toContain('Moralis server is down for token balances');
    });
  });

  describe('Scenario 3: Transaction Fetching Fails, Behavioral Analysis is Empty/Default', () => {
    it('should return 200 OK with financial data and a warning about behavioral analysis', async () => {
       global.fetch
        // Moralis - Token Balances (Success)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ([{ token_address: '0xTST', name: 'Test Token', symbol: 'TST', balance: '1000', decimals: '6' }]),
        })
        // Moralis - Native Balance (Success)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ balance: '500000000000000000' }),
        })
        // CoinGecko - Prices (Success)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 'ethereum': { usd: 2000 }, /* ... other prices ... */ }),
        })
        // Moralis - Transaction History (Failure)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Moralis Tx History Error',
          text: async () => 'Cannot fetch transactions',
        })
        // OpenAI - Narrative (Success, based on financial data only)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ choices: [{ message: { content: 'Mocked AI Narrative: Financial data only.' } }] }),
        });

      const response = await dispatchRequest('/api/wallet/token-holdings?walletAddress=0xTestAddress&chainId=ethereum');
      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body.tokenHoldings.length).toBeGreaterThan(0);
      expect(body.financialSummary.totalPortfolioValueUSD).toBeDefined();
      expect(body.behavioralAnalysis.tags).toEqual([]); // or specific default tags like "No Transaction History"
      expect(body.behavioralAnalysis.metrics.totalTransactions).toBe(0);
      expect(body.reportNarrative).toBe('Mocked AI Narrative: Financial data only.');
      expect(body.warningNote).toContain('Behavioral analysis may be incomplete');
      expect(body.warningNote).toContain('Failed to fetch transactions from Moralis');
    });
  });

  describe('Scenario 4: OpenAI API Call Fails', () => {
    it('should return 200 OK with data, but an error message in reportNarrative', async () => {
      global.fetch
        // Moralis - Token Balances (Success)
        .mockResolvedValueOnce({ ok: true, json: async () => ([/* ... */]) })
        // Moralis - Native Balance (Success)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ balance: '1000' }) })
        // CoinGecko - Prices (Success)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ /* ... */ }) })
        // Moralis - Transaction History (Success)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ result: [/* ... */] }) })
        // OpenAI - Narrative (Failure)
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          json: async () => ({ error: { message: 'OpenAI is overloaded' } }),
        });

      const response = await dispatchRequest('/api/wallet/token-holdings?walletAddress=0xTestAddress&chainId=ethereum');
      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body.tokenHoldings.length).toBeGreaterThanOrEqual(0); // Assuming native balance gives one holding
      expect(body.financialSummary).toBeDefined();
      expect(body.behavioralAnalysis).toBeDefined(); // Should still be there based on successful tx fetch
      expect(body.reportNarrative).toContain('Error generating AI report: OpenAI API request failed.');
      expect(body.reportNarrative).toContain('OpenAI is overloaded');
    });
  });

  describe('Scenario 5: Missing Wallet Address or ChainId Query Parameter', () => {
    it('should return 400 if walletAddress is missing', async () => {
      const response = await dispatchRequest('/api/wallet/token-holdings?chainId=ethereum');
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Missing "walletAddress"');
    });

    it('should return 400 if chainId is missing', async () => {
      const response = await dispatchRequest('/api/wallet/token-holdings?walletAddress=0xTestAddress');
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Missing "chainId"');
    });
  });

  // Add more scenarios as needed:
  // - Unsupported chainId
  // - Moralis API key missing (should be caught by worker, might result in 500 or specific error)
  // - CoinGecko API key missing (if you make it mandatory)
  // - Empty transaction history (successful fetch, but no transactions)
});
