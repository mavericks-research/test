import { describe, it, expect } from 'vitest';
import { normalizeTokenNames, convertToUSD, normalizeTimestamps } from '../src/normalizer';

describe('normalizer.js tests', () => {
  describe('normalizeTokenNames', () => {
    const transactions = [
      { to: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', from: 'someAddress1', value: '1000' }, // USDC
      { to: '0xdac17f958d2ee523a2206206994597c13d831ec7', from: 'someAddress2', value: '2000' }, // USDT
      { to: 'unknownContractAddress', from: 'someAddress3', value: '3000' },
      { to: null, from: 'someAddress4', value: '4000' }, // Case with no 'to' address
      { to: '0x6b175474e89094c44da98b954eedeac495271d0f', from: 'someAddress5', value: '5000' }, // DAI
    ];

    it('should add tokenSymbol for known contract addresses', () => {
      const normalized = normalizeTokenNames(transactions);
      expect(normalized[0].tokenInvolved).toBe('USDC');
      expect(normalized[1].tokenInvolved).toBe('USDT');
      expect(normalized[4].tokenInvolved).toBe('DAI');
    });

    it('should not add tokenSymbol for unknown or null contract addresses', () => {
      const normalized = normalizeTokenNames(transactions);
      expect(normalized[2].tokenInvolved).toBeUndefined();
      expect(normalized[3].tokenInvolved).toBeUndefined();
    });

    it('should handle empty input array', () => {
      expect(normalizeTokenNames([])).toEqual([]);
    });

    it('should handle non-array input gracefully', () => {
      const invalidInput = { message: "I am not an array" };
      // Assuming it logs a warning and returns the input as is
      expect(normalizeTokenNames(invalidInput)).toEqual(invalidInput);
    });
  });

  describe('convertToUSD', () => {
    const transactions = [
      { value: '1000000000000000000' }, // 1 ETH in Wei
      { value: '500000000000000000' },  // 0.5 ETH in Wei
      { value: '0' },
    ];

    it('should add valueUSD property, copying value (placeholder behavior)', () => {
      const normalized = convertToUSD(transactions);
      expect(normalized[0].valueUSD).toBe('1000000000000000000');
      expect(normalized[1].valueUSD).toBe('500000000000000000');
      expect(normalized[2].valueUSD).toBe('0');
    });

    it('should handle empty input array', () => {
      expect(convertToUSD([])).toEqual([]);
    });

    it('should handle non-array input gracefully', () => {
      const invalidInput = { message: "I am not an array" };
      expect(convertToUSD(invalidInput)).toEqual(invalidInput);
    });
  });

  describe('normalizeTimestamps', () => {
    const transactions = [
      { timeStamp: '1672531200' }, // 2023-01-01T00:00:00.000Z
      { timeStamp: '1704067200' }, // 2024-01-01T00:00:00.000Z
      { timeStamp: 'invalidTimestamp' },
      { hash: 'tx123' }, // Missing timeStamp
    ];

    it('should convert Unix timestamp to ISO 8601 format', () => {
      const normalized = normalizeTimestamps(transactions);
      expect(normalized[0].dateTime).toBe('2023-01-01T00:00:00.000Z');
      expect(normalized[1].dateTime).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should handle invalid or missing timestamps', () => {
      const normalized = normalizeTimestamps(transactions);
      expect(normalized[2].dateTime).toBeNull(); // Or as per error handling
      expect(normalized[3].dateTime).toBeUndefined();
    });

    it('should handle empty input array', () => {
      expect(normalizeTimestamps([])).toEqual([]);
    });

    it('should handle non-array input gracefully', () => {
      const invalidInput = { message: "I am not an array" };
      expect(normalizeTimestamps(invalidInput)).toEqual(invalidInput);
    });
  });
});
