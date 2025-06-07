import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import worker from '../src/index.js'; // Assuming default export from src/index.js is the worker object with fetch

// Mock global fetch
global.fetch = vi.fn();

// Mock environment variables
const mockEnv = {
  COINGECKO_API_KEY: 'test-coingecko-key',
  OPENAI_API_KEY: 'test-openai-key',
  OPENAI_MODEL: 'gpt-3.5-turbo-instruct',
  // BUDGET_PLANS_KV: { get: vi.fn(), put: vi.fn(), delete: vi.fn(), list: vi.fn() } // KV not directly used by this endpoint
};

describe('/api/crypto/enriched-historical-data endpoint', () => {
  beforeEach(() => {
    // Reset mocks for each test
    global.fetch.mockReset();
    // Mock env for each test, in case a test modifies it
    Object.assign(process.env, mockEnv); // Vitest typically uses process.env for env vars
  });

  afterEach(() => {
    // Restore all mocks
    vi.restoreAllMocks();
  });

  const createRequest = (path, method = 'GET') => {
    return new Request(`http://localhost${path}`, { method });
  };

  it('should return enriched data for a valid request', async () => {
    const mockCoinGeckoResponse = {
      id: 'bitcoin',
      symbol: 'btc',
      name: 'Bitcoin',
      market_data: {
        current_price: { usd: 20000 },
        market_cap: { usd: 400000000000 },
        total_volume: { usd: 15000000000 },
      },
    };
    const mockOpenAIResponse = {
      choices: [{ text: 'AI summary for Bitcoin on 30-12-2022...' }],
    };

    global.fetch
      .mockResolvedValueOnce( // CoinGecko
        new Response(JSON.stringify(mockCoinGeckoResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce( // OpenAI
        new Response(JSON.stringify(mockOpenAIResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    const request = createRequest('/api/crypto/enriched-historical-data?coinId=bitcoin&date=30-12-2022');
    const response = await worker.fetch(request, mockEnv, {}); // Pass mockEnv
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(responseBody.coinGeckoData).toEqual(mockCoinGeckoResponse);
    expect(responseBody.openAiInsights).toBe(mockOpenAIResponse.choices[0].text);

    // Check fetch calls
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch.mock.calls[0][0]).toContain('api.coingecko.com/api/v3/coins/bitcoin/history?date=30-12-2022');
    expect(global.fetch.mock.calls[1][0]).toBe('https://api.openai.com/v1/completions');
    const openAIRequestBody = JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(openAIRequestBody.prompt).toContain("For the cryptocurrency bitcoin on 30-12-2022:");
    expect(openAIRequestBody.prompt).toContain("Market Price (USD): 20000");
  });

  it('should return 400 if coinId is missing', async () => {
    const request = createRequest('/api/crypto/enriched-historical-data?date=30-12-2022');
    const response = await worker.fetch(request, mockEnv, {});
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(responseBody.error).toBe('Missing "coinId" or "date" query parameters.');
  });

  it('should return 400 if date is missing', async () => {
    const request = createRequest('/api/crypto/enriched-historical-data?coinId=bitcoin');
    const response = await worker.fetch(request, mockEnv, {});
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(responseBody.error).toBe('Missing "coinId" or "date" query parameters.');
  });

  it('should return 500 if date format is invalid (as per current cryptoApi behavior)', async () => {
    // This test assumes getHistoricalData (from cryptoApi.js) throws an error for invalid date format,
    // and the main handler catches it as a generic error, resulting in 500.
    // The actual getHistoricalData function in cryptoApi.js throws:
    // new Error('Invalid date format. Please use DD-MM-YYYY.')
    // This will be caught by the generic error handler in index.js's route.

    // We don't need to mock fetch here if the date validation in cryptoApi.js is synchronous
    // and happens before the fetch call. The error comes from getHistoricalData directly.

    const request = createRequest('/api/crypto/enriched-historical-data?coinId=bitcoin&date=2022-12-30'); // Invalid format
    const response = await worker.fetch(request, mockEnv, {});
    const responseBody = await response.json();

    expect(response.status).toBe(500); // Based on current error handling in index.js
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(responseBody.error).toContain('An unexpected error occurred: Invalid date format. Please use DD-MM-YYYY.');
  });

  it('should return 502 if CoinGecko API call fails', async () => {
    global.fetch.mockResolvedValueOnce( // CoinGecko fails
      new Response(JSON.stringify({ error: 'CoinGecko is down' }), {
        status: 503, // Or any other error status
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const request = createRequest('/api/crypto/enriched-historical-data?coinId=bitcoin&date=30-12-2022');
    const response = await worker.fetch(request, mockEnv, {});
    const responseBody = await response.json();

    expect(response.status).toBe(502);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    // The error message comes from cryptoApi.js, which constructs it.
    // Example: `CoinGecko API request failed for historical data: 503 {"error":"CoinGecko is down"}`
    // Or if non-json: `CoinGecko API request failed for historical data: 503 Service Unavailable`
    expect(responseBody.error).toContain('CoinGecko API request failed');
  });

  it('should return appropriate status if OpenAI API call fails', async () => {
    const mockCoinGeckoResponse = {
      market_data: { current_price: { usd: 20000 }, market_cap: { usd: 400000000000 }, total_volume: { usd: 15000000000 } },
    };
    global.fetch
      .mockResolvedValueOnce( // CoinGecko success
        new Response(JSON.stringify(mockCoinGeckoResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce( // OpenAI fails
        new Response(JSON.stringify({ error: { message: 'OpenAI is overloaded' } }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    const request = createRequest('/api/crypto/enriched-historical-data?coinId=bitcoin&date=30-12-2022');
    const response = await worker.fetch(request, mockEnv, {});
    const responseBody = await response.json();

    expect(response.status).toBe(503); // The status from OpenAI should be propagated
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(responseBody.error).toContain('OpenAI API request failed: 503');
    expect(responseBody.error).toContain('OpenAI is overloaded');
  });

  it('should return 500 if OPENAI_API_KEY is not configured', async () => {
    const mockCoinGeckoResponse = {
      market_data: { current_price: { usd: 20000 }, market_cap: { usd: 400000000000 }, total_volume: { usd: 15000000000 } },
    };
    global.fetch.mockResolvedValueOnce( // CoinGecko success
      new Response(JSON.stringify(mockCoinGeckoResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const envWithoutOpenAIKey = { ...mockEnv, OPENAI_API_KEY: undefined };
    const request = createRequest('/api/crypto/enriched-historical-data?coinId=bitcoin&date=30-12-2022');
    // For this test, directly pass the modified env
    const response = await worker.fetch(request, envWithoutOpenAIKey, {});
    const responseBody = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(responseBody.error).toBe('OpenAI API key is not configured.');
  });

   it('should return 502 if CoinGecko response is missing market_data', async () => {
    const mockIncompleteCoinGeckoResponse = { id: 'bitcoin' /* missing market_data */ };
    global.fetch.mockResolvedValueOnce( // CoinGecko returns unexpected structure
        new Response(JSON.stringify(mockIncompleteCoinGeckoResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    const request = createRequest('/api/crypto/enriched-historical-data?coinId=bitcoin&date=30-12-2022');
    const response = await worker.fetch(request, mockEnv, {});
    const responseBody = await response.json();

    expect(response.status).toBe(502);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(responseBody.error).toBe('Failed to retrieve or parse valid market data from CoinGecko.');
  });

  it('should return 502 if CoinGecko response is missing usd price data', async () => {
    const mockIncompleteCoinGeckoResponse = {
      market_data: {
        current_price: { eur: 20000 }, // usd is missing
        market_cap: { usd: 400000000000 },
        total_volume: { usd: 15000000000 }
      }
    };
    global.fetch.mockResolvedValueOnce( // CoinGecko returns unexpected structure
        new Response(JSON.stringify(mockIncompleteCoinGeckoResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    const request = createRequest('/api/crypto/enriched-historical-data?coinId=bitcoin&date=30-12-2022');
    const response = await worker.fetch(request, mockEnv, {});
    const responseBody = await response.json();

    expect(response.status).toBe(502);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(responseBody.error).toBe('Required USD market data (price, market_cap, total_volume) not found in CoinGecko response.');
  });

});
