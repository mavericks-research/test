import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import worker from '../src/index'; // Assuming default export has a fetch method

const TEST_OPENAI_API_KEY = 'test-openai-key';
const TEST_FMP_API_KEY = 'test-fmp-key';
const TEST_OPENAI_MODEL_SEARCH = 'gpt-3.5-turbo'; // Updated model

// Helper to create a Request object like Cloudflare Workers do
function createRequest(urlPath, method = 'GET', body = null) {
  const url = new URL(`http://worker.test${urlPath}`);
  return new Request(url.toString(), { method, body: body ? JSON.stringify(body) : null });
}

// Mock environment
let env;

describe('/api/stocks/natural-search endpoint', () => {
  const originalGlobalFetch = global.fetch;

  beforeEach(() => {
    env = {
      OPENAI_API_KEY: TEST_OPENAI_API_KEY,
      FMP_API_KEY: TEST_FMP_API_KEY,
      OPENAI_MODEL_SEARCH: TEST_OPENAI_MODEL_SEARCH,
    };
    global.fetch = vi.fn(); // Mock global fetch
  });

  afterEach(() => {
    global.fetch = originalGlobalFetch; // Restore original fetch
    vi.restoreAllMocks(); // Clears spies and stubs
  });

  it('should return successful search results for a basic query', async () => {
    const mockOpenAICriteria = { sector: "Technology", keywords: ["tech"] };
    const mockFMPResults = [{ symbol: "AAPL", companyName: "Apple Inc." }];

    global.fetch.mockImplementation(async (url) => {
      if (url.startsWith('https://api.openai.com/v1/chat/completions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { function_call: { arguments: JSON.stringify(mockOpenAICriteria) } } }],
          }),
        });
      }
      if (url.startsWith('https://financialmodelingprep.com/api/v3/stock-screener')) {
        expect(url.toString()).toContain('sector=Technology');
        // expect(url.toString()).toContain('keywords=tech'); // Keywords are not directly used in FMP for now
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockFMPResults),
        });
      }
      return Promise.reject(new Error(`Unexpected fetch call: ${url}`));
    });

    const req = createRequest('/api/stocks/natural-search?q=tech%20stocks');
    const res = await worker.fetch(req, env, {});
    const jsonResponse = await res.json();

    expect(res.status).toBe(200);
    expect(jsonResponse.openAICriteria).toEqual(mockOpenAICriteria);
    expect(jsonResponse.fmpResults).toEqual(mockFMPResults);
    expect(jsonResponse.fmpQuery).toContain('sector=Technology');
    expect(global.fetch).toHaveBeenCalledTimes(2); // OpenAI + FMP
  });

  it('should handle search with multiple criteria (P/E, Market Cap)', async () => {
    const query = 'profitable tech companies with P/E under 20 and market cap over 100 billion';
    const mockOpenAICriteria = {
      sector: "Technology",
      pe_ratio_max: 20,
      market_cap_min: 100000000000,
      keywords: ["profitable"]
    };
    const mockFMPResults = [{ symbol: "MSFT", companyName: "Microsoft Corp." }];

    global.fetch.mockImplementation(async (url) => {
      if (url.startsWith('https://api.openai.com/v1/chat/completions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { function_call: { arguments: JSON.stringify(mockOpenAICriteria) } } }],
          }),
        });
      }
      if (url.startsWith('https://financialmodelingprep.com/api/v3/stock-screener')) {
        const fmpUrl = url.toString();
        expect(fmpUrl).toContain('sector=Technology');
        expect(fmpUrl).toContain('priceEarningsRatioTTMLessThan=20');
        expect(fmpUrl).toContain('marketCapMoreThan=100000000000');
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockFMPResults),
        });
      }
      return Promise.reject(new Error(`Unexpected fetch call: ${url}`));
    });

    const req = createRequest(`/api/stocks/natural-search?q=${encodeURIComponent(query)}`);
    const res = await worker.fetch(req, env, {});
    const jsonResponse = await res.json();

    expect(res.status).toBe(200);
    expect(jsonResponse.openAICriteria).toEqual(mockOpenAICriteria);
    expect(jsonResponse.fmpResults).toEqual(mockFMPResults);
    expect(jsonResponse.fmpQuery).toContain('sector=Technology');
    expect(jsonResponse.fmpQuery).toContain('priceEarningsRatioTTMLessThan=20');
    expect(jsonResponse.fmpQuery).toContain('marketCapMoreThan=100000000000');
  });

  it('should return 500 if OpenAI fails to return function call arguments', async () => {
    global.fetch.mockImplementation(async (url) => {
      if (url.startsWith('https://api.openai.com/v1/chat/completions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: "No function call today." } }], // Missing function_call
          }),
        });
      }
      // FMP should not be called
      return Promise.reject(new Error(`Unexpected fetch call: ${url}`));
    });

    const req = createRequest('/api/stocks/natural-search?q=some%20query');
    const res = await worker.fetch(req, env, {});
    const jsonResponse = await res.json();

    expect(res.status).toBe(500);
    expect(jsonResponse.error).toContain('Could not parse financial criteria using OpenAI');
    expect(global.fetch).toHaveBeenCalledTimes(1); // Only OpenAI call
  });

  it('should return 500 if OpenAI function call arguments are malformed JSON', async () => {
    global.fetch.mockImplementation(async (url) => {
      if (url.startsWith('https://api.openai.com/v1/chat/completions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { function_call: { arguments: "this is not json" } } }],
          }),
        });
      }
      return Promise.reject(new Error(`Unexpected fetch call: ${url}`));
    });

    const req = createRequest('/api/stocks/natural-search?q=another%20query');
    const res = await worker.fetch(req, env, {});
    const jsonResponse = await res.json();

    expect(res.status).toBe(500);
    expect(jsonResponse.error).toContain('Failed to parse financial criteria from OpenAI response.');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });


  it('should return error if FMP API fails', async () => {
    const mockOpenAICriteria = { sector: "Healthcare" };
    global.fetch.mockImplementation(async (url) => {
      if (url.startsWith('https://api.openai.com/v1/chat/completions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { function_call: { arguments: JSON.stringify(mockOpenAICriteria) } } }],
          }),
        });
      }
      if (url.startsWith('https://financialmodelingprep.com/api/v3/stock-screener')) {
        return Promise.resolve({
          ok: false,
          status: 503,
          text: () => Promise.resolve("FMP Service Unavailable"), // FMP might return HTML or plain text on error
        });
      }
      return Promise.reject(new Error(`Unexpected fetch call: ${url}`));
    });

    const req = createRequest('/api/stocks/natural-search?q=healthcare%20stocks');
    const res = await worker.fetch(req, env, {});
    const jsonResponse = await res.json();

    expect(res.status).toBe(503); // Should reflect FMP's error status
    expect(jsonResponse.error).toContain('FMP API request failed: 503 FMP Service Unavailable');
    expect(jsonResponse.fmpQuery).toBeDefined(); // fmpQuery should still be in the response
  });

  it('should return 500 if OPENAI_API_KEY is missing', async () => {
    const req = createRequest('/api/stocks/natural-search?q=any');
    const localEnv = { ...env, OPENAI_API_KEY: undefined };
    const res = await worker.fetch(req, localEnv, {});
    const jsonResponse = await res.json();

    expect(res.status).toBe(500);
    expect(jsonResponse.error).toBe('OpenAI API key is not configured.');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should return 500 if FMP_API_KEY is missing', async () => {
    const req = createRequest('/api/stocks/natural-search?q=any');
    const localEnv = { ...env, FMP_API_KEY: undefined };
    const res = await worker.fetch(req, localEnv, {});
    const jsonResponse = await res.json();

    expect(res.status).toBe(500);
    expect(jsonResponse.error).toBe('FMP API key is not configured.');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should return 400 if query parameter "q" is missing', async () => {
    const req = createRequest('/api/stocks/natural-search'); // No query param
    const res = await worker.fetch(req, env, {});
    const jsonResponse = await res.json();

    expect(res.status).toBe(400);
    expect(jsonResponse.error).toBe('Missing "q" query parameter for natural language search.');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should handle dividend yield criteria correctly', async () => {
    const query = 'stocks with dividend yield over 3%';
    const mockOpenAICriteria = {
      dividend_yield_min: 3  // OpenAI returns percentage
    };
    const mockFMPResults = [{ symbol: "T", companyName: "AT&T Inc." }];

    global.fetch.mockImplementation(async (url) => {
      if (url.startsWith('https://api.openai.com/v1/chat/completions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { function_call: { arguments: JSON.stringify(mockOpenAICriteria) } } }],
          }),
        });
      }
      if (url.startsWith('https://financialmodelingprep.com/api/v3/stock-screener')) {
        const fmpUrl = url.toString();
        // FMP expects decimal for dividendYieldMoreThan, e.g., 0.03 for 3%
        expect(fmpUrl).toContain('dividendYieldMoreThan=0.03');
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockFMPResults),
        });
      }
      return Promise.reject(new Error(`Unexpected fetch call: ${url}`));
    });

    const req = createRequest(`/api/stocks/natural-search?q=${encodeURIComponent(query)}`);
    const res = await worker.fetch(req, env, {});
    const jsonResponse = await res.json();

    expect(res.status).toBe(200);
    expect(jsonResponse.openAICriteria).toEqual(mockOpenAICriteria);
    expect(jsonResponse.fmpResults).toEqual(mockFMPResults);
    expect(jsonResponse.fmpQuery).toContain('dividendYieldMoreThan=0.03');
  });

});
