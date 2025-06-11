import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import worker from '../src/index';

const TEST_OPENAI_API_KEY = 'test-openai-key';
const TEST_ALPHA_VANTAGE_API_KEY = 'test-alpha-vantage-key';
const TEST_OPENAI_MODEL_SEARCH = 'gpt-3.5-turbo';

function createRequest(urlPath, method = 'GET', body = null) {
  const url = new URL(`http://worker.test${urlPath}`);
  const requestInit = { method };
  if (body) {
    requestInit.body = JSON.stringify(body);
    requestInit.headers = { 'Content-Type': 'application/json' };
  }
  return new Request(url.toString(), requestInit);
}

let env;

describe('/api/stocks/natural-search endpoint (Alpha Vantage SYMBOL_SEARCH)', () => {
  const originalGlobalFetch = global.fetch;

  beforeEach(() => {
    env = {
      OPENAI_API_KEY: TEST_OPENAI_API_KEY,
      ALPHA_VANTAGE_API_KEY: TEST_ALPHA_VANTAGE_API_KEY,
      OPENAI_MODEL_SEARCH: TEST_OPENAI_MODEL_SEARCH,
      // FMP_API_KEY is no longer used by this endpoint, but other tests might need it
      // If other tests in this file were using it, it should be mocked or removed from those tests too
    };
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalGlobalFetch;
    vi.restoreAllMocks();
  });

  it('should return successful search results for a basic keyword query', async () => {
    const query = 'search for Apple';
    const mockOpenAICriteria = { keywords: ["Apple"] };
    const mockAlphaVantageResults = {
      bestMatches: [
        { "1. symbol": "AAPL", "2. name": "Apple Inc.", "3. type": "Equity", "4. region": "United States", "5. marketOpen": "09:30", "6. marketClose": "16:00", "7. timezone": "UTC-04", "8. currency": "USD", "9. matchScore": "1.0000" },
        { "1. symbol": "APPL", "2. name": "Apple Hospitality REIT Inc.", "3. type": "Equity", "4. region": "United States", "5. marketOpen": "09:30", "6. marketClose": "16:00", "7. timezone": "UTC-04", "8. currency": "USD", "9. matchScore": "0.6000" }
      ]
    };

    global.fetch.mockImplementation(async (url) => {
      const urlString = url.toString();
      if (urlString.startsWith('https://api.openai.com/v1/chat/completions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { function_call: { arguments: JSON.stringify(mockOpenAICriteria) } } }],
          }),
        });
      }
      if (urlString.startsWith('https://www.alphavantage.co/query?function=SYMBOL_SEARCH')) {
        expect(urlString).toContain(`keywords=${encodeURIComponent("Apple")}`);
        expect(urlString).toContain(`apikey=${TEST_ALPHA_VANTAGE_API_KEY}`);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAlphaVantageResults),
        });
      }
      return Promise.reject(new Error(`Unexpected fetch call: ${urlString}`));
    });

    const req = createRequest(`/api/stocks/natural-search?q=${encodeURIComponent(query)}`);
    const res = await worker.fetch(req, env, {});
    const jsonResponse = await res.json();

    expect(res.status).toBe(200);
    expect(jsonResponse.openAICriteria).toEqual(mockOpenAICriteria);
    expect(jsonResponse.alphaVantageSearchQuery).toBe("Apple");
    expect(jsonResponse.alphaVantageSearchResults).toEqual(mockAlphaVantageResults.bestMatches);
    expect(global.fetch).toHaveBeenCalledTimes(2); // OpenAI + Alpha Vantage
  });

  it('should combine sector and keywords for Alpha Vantage search', async () => {
    const query = 'tech companies like Microsoft';
    const mockOpenAICriteria = { sector: "Technology", keywords: ["Microsoft"] };
    const mockAlphaVantageResults = {
      bestMatches: [{ "1. symbol": "MSFT", "2. name": "Microsoft Corp." }]
    };

    global.fetch.mockImplementation(async (url) => {
      const urlString = url.toString();
      if (urlString.startsWith('https://api.openai.com/v1/chat/completions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { function_call: { arguments: JSON.stringify(mockOpenAICriteria) } } }],
          }),
        });
      }
      if (urlString.startsWith('https://www.alphavantage.co/query?function=SYMBOL_SEARCH')) {
        // Expect "Microsoft Technology" or "Technology Microsoft" - order might vary but both should be present
        expect(decodeURIComponent(urlString)).toContain("keywords=Microsoft Technology"); // Current implementation: keywords then sector
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAlphaVantageResults),
        });
      }
      return Promise.reject(new Error(`Unexpected fetch call: ${urlString}`));
    });

    const req = createRequest(`/api/stocks/natural-search?q=${encodeURIComponent(query)}`);
    const res = await worker.fetch(req, env, {});
    const jsonResponse = await res.json();

    expect(res.status).toBe(200);
    expect(jsonResponse.openAICriteria).toEqual(mockOpenAICriteria);
    expect(jsonResponse.alphaVantageSearchQuery).toBe("Microsoft Technology");
    expect(jsonResponse.alphaVantageSearchResults).toEqual(mockAlphaVantageResults.bestMatches);
  });

  it('should return 502 if OpenAI fails to return function call arguments', async () => {
    global.fetch.mockImplementation(async (url) => {
      if (url.startsWith('https://api.openai.com/v1/chat/completions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: "No function call today." } }],
          }),
        });
      }
      return Promise.reject(new Error(`Unexpected fetch call: ${url}`));
    });

    const req = createRequest('/api/stocks/natural-search?q=some%20query');
    const res = await worker.fetch(req, env, {});
    const jsonResponse = await res.json();

    expect(res.status).toBe(502); // Changed from 500 to 502 as per new error handling
    expect(jsonResponse.error).toContain('Could not parse search criteria using OpenAI');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should return 500 if OpenAI function call arguments are malformed JSON', async () => {
    // This scenario is less likely if OpenAI API is functioning correctly, but good to test
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

    // The worker code has a try-catch for JSON.parse, which would lead to a 500
    expect(res.status).toBe(500);
    expect(jsonResponse.error).toContain('Failed to parse financial criteria from OpenAI response.');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should return error from Alpha Vantage if SYMBOL_SEARCH API fails', async () => {
    const mockOpenAICriteria = { keywords: ["XYZ"] };
    global.fetch.mockImplementation(async (url) => {
      const urlString = url.toString();
      if (urlString.startsWith('https://api.openai.com/v1/chat/completions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { function_call: { arguments: JSON.stringify(mockOpenAICriteria) } } }],
          }),
        });
      }
      if (urlString.startsWith('https://www.alphavantage.co/query?function=SYMBOL_SEARCH')) {
        return Promise.resolve({
          ok: false,
          status: 403, // Example: Forbidden (API key issue)
          text: () => Promise.resolve("Invalid API Key"),
        });
      }
      return Promise.reject(new Error(`Unexpected fetch call: ${urlString}`));
    });

    const req = createRequest('/api/stocks/natural-search?q=XYZ');
    const res = await worker.fetch(req, env, {});
    const jsonResponse = await res.json();

    expect(res.status).toBe(403);
    expect(jsonResponse.error).toContain('Alpha Vantage SYMBOL_SEARCH API request failed: 403 Invalid API Key');
    expect(jsonResponse.alphaVantageSearchQuery).toBe("XYZ");
  });

  it('should handle Alpha Vantage API returning an error message in JSON', async () => {
    const query = 'search for nonexist';
    const mockOpenAICriteria = { keywords: ["nonexist"] };
    const mockAlphaVantageError = { "Error Message": "Invalid API call. Please check your API key and parameters." };

    global.fetch.mockImplementation(async (url) => {
      const urlString = url.toString();
      if (urlString.startsWith('https://api.openai.com/v1/chat/completions')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ choices: [{ message: { function_call: { arguments: JSON.stringify(mockOpenAICriteria) } } }] }) });
      }
      if (urlString.startsWith('https://www.alphavantage.co/query?function=SYMBOL_SEARCH')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockAlphaVantageError) }); // API returns 200 but with error in body
      }
      return Promise.reject(new Error(`Unexpected fetch call: ${urlString}`));
    });

    const req = createRequest(`/api/stocks/natural-search?q=${encodeURIComponent(query)}`);
    const res = await worker.fetch(req, env, {});
    const jsonResponse = await res.json();

    expect(res.status).toBe(502); // Worker should identify this as an upstream error
    expect(jsonResponse.error).toBe(`Alpha Vantage API error: ${mockAlphaVantageError["Error Message"]}`);
    expect(jsonResponse.openAICriteria).toEqual(mockOpenAICriteria);
    expect(jsonResponse.alphaVantageSearchQuery).toBe("nonexist");
  });

  it('should handle Alpha Vantage API returning a "Note" and no bestMatches', async () => {
    const query = 'search for something obscure';
    const mockOpenAICriteria = { keywords: ["obscuresearch"] };
    const mockAlphaVantageNote = { "Note": "Thank you for using Alpha Vantage! Our standard API call frequency is 25 calls per day." };

    global.fetch.mockImplementation(async (url) => {
       const urlString = url.toString();
      if (urlString.startsWith('https://api.openai.com/v1/chat/completions')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ choices: [{ message: { function_call: { arguments: JSON.stringify(mockOpenAICriteria) } } }] }) });
      }
      if (urlString.startsWith('https://www.alphavantage.co/query?function=SYMBOL_SEARCH')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockAlphaVantageNote) });
      }
      return Promise.reject(new Error(`Unexpected fetch call: ${urlString}`));
    });

    const req = createRequest(`/api/stocks/natural-search?q=${encodeURIComponent(query)}`);
    const res = await worker.fetch(req, env, {});
    const jsonResponse = await res.json();

    expect(res.status).toBe(200); // As per current code, it returns 200 with a message and empty results
    expect(jsonResponse.alphaVantageSearchResults).toEqual([]);
    expect(jsonResponse.message).toContain(mockAlphaVantageNote.Note);
    expect(jsonResponse.openAICriteria).toEqual(mockOpenAICriteria);
    expect(jsonResponse.alphaVantageSearchQuery).toBe("obscuresearch");
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

  it('should return 500 if ALPHA_VANTAGE_API_KEY is missing', async () => {
    const req = createRequest('/api/stocks/natural-search?q=any');
    // OpenAI will be called, so we need to mock that part, even if AV key is missing
     global.fetch.mockImplementation(async (url) => {
      if (url.startsWith('https://api.openai.com/v1/chat/completions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { function_call: { arguments: JSON.stringify({ keywords: ["any"]}) } } }],
          }),
        });
      }
       return Promise.reject(new Error(`Unexpected fetch call: ${url}`));
    });
    const localEnv = { ...env, ALPHA_VANTAGE_API_KEY: undefined }; // Remove only Alpha Vantage key
    const res = await worker.fetch(req, localEnv, {});
    const jsonResponse = await res.json();

    expect(res.status).toBe(500);
    expect(jsonResponse.error).toBe('Alpha Vantage API key is not configured.');
    // global.fetch would have been called once for OpenAI
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][0]).toContain('api.openai.com');
  });

  it('should return 400 if query parameter "q" is missing', async () => {
    const req = createRequest('/api/stocks/natural-search');
    const res = await worker.fetch(req, env, {});
    const jsonResponse = await res.json();

    expect(res.status).toBe(400);
    expect(jsonResponse.error).toBe('Missing "q" query parameter for natural language search.');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should return 400 if OpenAI extracts no keywords', async () => {
    const query = 'search for nothing useful';
    const mockOpenAICriteria = { keywords: [] }; // Empty keywords

    global.fetch.mockImplementation(async (url) => {
      if (url.startsWith('https://api.openai.com/v1/chat/completions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { function_call: { arguments: JSON.stringify(mockOpenAICriteria) } } }],
          }),
        });
      }
      return Promise.reject(new Error(`Unexpected fetch call: ${url}`));
    });

    const req = createRequest(`/api/stocks/natural-search?q=${encodeURIComponent(query)}`);
    const res = await worker.fetch(req, env, {});
    const jsonResponse = await res.json();

    expect(res.status).toBe(400);
    expect(jsonResponse.message).toBe("No valid keywords extracted for search.");
    expect(jsonResponse.openAICriteria).toEqual(mockOpenAICriteria);
    expect(jsonResponse.alphaVantageSearchQuery).toBe("");
    expect(jsonResponse.alphaVantageSearchResults).toEqual([]);
    expect(global.fetch).toHaveBeenCalledTimes(1); // Only OpenAI call
  });
});
