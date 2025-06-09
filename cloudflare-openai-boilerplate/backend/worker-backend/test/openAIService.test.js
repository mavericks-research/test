// cloudflare-openai-boilerplate/backend/worker-backend/test/openAIService.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateReport } from '../src/openAIService.js';

// Mock the global fetch function
global.fetch = vi.fn();

describe('openAIService.generateReport', () => {
  const mockEnv = { OPENAI_API_KEY: 'test-api-key' };
  const mockHoldingsData = [
    { name: 'Bitcoin', symbol: 'BTC', balance: '1', value_usd: '50000.00', percentageAllocation: '50.00%' },
    { name: 'Ethereum', symbol: 'ETH', balance: '10', value_usd: '50000.00', percentageAllocation: '50.00%' },
  ];
  const mockPortfolioSummary = {
    totalPortfolioValueUSD: '100000.00',
    numberOfUniqueAssets: 2,
    topAssetsMessage: 'The portfolio includes 2 asset(s), with top holdings in Bitcoin and Ethereum.',
  };

  beforeEach(() => {
    // Reset fetch mock before each test
    fetch.mockClear();
  });

  it('should return an AI-generated report on successful API call', async () => {
    const mockOpenAIResponse = {
      choices: [{ message: { content: 'This is a successful AI report.' } }],
    };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockOpenAIResponse,
    });

    const report = await generateReport(mockHoldingsData, mockPortfolioSummary, mockEnv);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockEnv.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: expect.any(String), // Further assertions on body can be added
      })
    );
    // Check if the body contains key elements from holdings and summary
    const fetchBody = JSON.parse(fetch.mock.calls[0][1].body);
    expect(fetchBody.messages[1].content).toContain('Portfolio Summary:');
    expect(fetchBody.messages[1].content).toContain('Total Portfolio Value: $100000.00 USD');
    expect(fetchBody.messages[1].content).toContain('Bitcoin (BTC)');
    expect(fetchBody.messages[1].content).toContain('50.00% of portfolio');
    expect(fetchBody.model).toBe('gpt-3.5-turbo');

    expect(report).toBe('This is a successful AI report.');
  });

  it('should return an error message if OPENAI_API_KEY is missing', async () => {
    const report = await generateReport(mockHoldingsData, mockPortfolioSummary, {}); // Empty env
    expect(report).toBe('Error: OpenAI API key is missing. Please configure it in the backend.');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should return an error message if OpenAI API returns a non-200 status', async () => {
    const errorPayload = { error: { message: 'OpenAI server error', type: 'server_error' } };
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => errorPayload,
    });

    const report = await generateReport(mockHoldingsData, mockPortfolioSummary, mockEnv);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(report).toContain('Error generating AI report: OpenAI API request failed.');
    expect(report).toContain(JSON.stringify(errorPayload.error));
  });

  it('should return an error message if OpenAI API response is ok:false and json parsing fails', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => { throw new Error("JSON parse error"); }, // Simulate JSON parsing error
    });

    const report = await generateReport(mockHoldingsData, mockPortfolioSummary, mockEnv);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(report).toBe('Error generating AI report: OpenAI API request failed. Details: HTTP status 500.');
  });


  it('should return an error message if OpenAI API response is structured unexpectedly', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}), // Empty or unexpected structure
    });

    const report = await generateReport(mockHoldingsData, mockPortfolioSummary, mockEnv);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(report).toBe('Error generating AI report: Received an unexpected response structure from OpenAI.');
  });

  it('should return an error message on network error', async () => {
    fetch.mockRejectedValueOnce(new Error('Network connection failed'));

    const report = await generateReport(mockHoldingsData, mockPortfolioSummary, mockEnv);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(report).toBe('Error generating AI report: Could not connect to OpenAI service. Details: Network connection failed.');
  });
});
