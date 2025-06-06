import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import worker from '../src/index'; // Assuming default export from src/index.js

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
});
