import { describe, it, expect, vi } from 'vitest';
import {
  normalizeTokenNames,
  normalizeTimestamps,
  convertToStandardUnit,
  normalizeBlockCypherTransactions
} from '../src/normalizer';

// Mock console.warn to avoid polluting test output for expected warnings
vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('normalizer.js tests', () => {
  describe('Etherscan Normalizers', () => {
    // --- Existing Etherscan tests ---
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
    // --- End of Existing Etherscan tests ---
  });

  describe('BlockCypher Normalizers', () => {
    describe('convertToStandardUnit', () => {
      it('should convert satoshis to BTC correctly', () => {
        expect(convertToStandardUnit(100000000, 'btc')).toBe(1);
        expect(convertToStandardUnit(50000000, 'BTC')).toBe(0.5);
        expect(convertToStandardUnit(1, 'btc')).toBe(0.00000001);
      });

      it('should convert litoshis to LTC correctly', () => {
        expect(convertToStandardUnit(100000000, 'ltc')).toBe(1);
        expect(convertToStandardUnit(250000000, 'LTC')).toBe(2.5);
      });

      it('should convert wei to ETH correctly', () => {
        expect(convertToStandardUnit(1000000000000000000, 'eth')).toBe(1);
        expect(convertToStandardUnit('500000000000000000', 'ETH')).toBe(0.5);
      });

      it('should return 0 for NaN input', () => {
        expect(convertToStandardUnit('not-a-number', 'btc')).toBe(0);
        expect(console.warn).toHaveBeenCalledWith('convertToStandardUnit: Invalid value provided: not-a-number');
      });

      it('should return 0 for negative input but log it (or handle as per design for crypto values)', () => {
        // Current implementation converts negative numbers as is.
        expect(convertToStandardUnit(-100000000, 'btc')).toBe(-1);
      });

      it('should return value as is for unsupported coin symbols and warn', () => {
        expect(convertToStandardUnit(100, 'doge')).toBe(100);
        expect(console.warn).toHaveBeenCalledWith('convertToStandardUnit: Unsupported coin symbol: doge');
      });

      it('should handle zero value correctly', () => {
        expect(convertToStandardUnit(0, 'btc')).toBe(0);
        expect(convertToStandardUnit('0', 'eth')).toBe(0);
      });
    });

    describe('normalizeBlockCypherTransactions', () => {
      const targetBtcAddress = '1TargetBTCAddress';
      const mockBtcTxReceive = {
        hash: 'btcTxHashReceive',
        confirmed: '2023-01-01T12:00:00Z',
        received: '2023-01-01T11:55:00Z',
        confirmations: 10,
        block_height: 800000,
        fees: 10000, // satoshis
        inputs: [{ addresses: ['1SenderAddress'], output_value: 200000000 }],
        outputs: [
          { addresses: [targetBtcAddress], value: 100000000 }, // 1 BTC
          { addresses: ['1SenderAddressChange'], value: 99990000 } // Change
        ]
      };
      const mockBtcTxSend = {
        hash: 'btcTxHashSend',
        confirmed: '2023-01-02T14:00:00Z',
        received: '2023-01-02T13:55:00Z',
        confirmations: 5,
        block_height: 800001,
        fees: 5000, // satoshis
        inputs: [
          { addresses: [targetBtcAddress], output_value: 100000000 }, // 1 BTC from target
          { addresses: ['anotherInputAddress'], output_value: 50000000 } // 0.5 BTC from another
        ],
        outputs: [
          { addresses: ['1ReceiverAddress'], value: 120000000 }, // 1.2 BTC to receiver
          { addresses: [targetBtcAddress], value: 29995000 }    // 0.29995 BTC change
        ]
      };
      const mockBtcTxSelf = { // Sending to self, only change
        hash: 'btcTxHashSelf',
        confirmed: '2023-01-03T10:00:00Z',
        received: '2023-01-03T09:55:00Z',
        confirmations: 20,
        block_height: 800002,
        fees: 2000,
        inputs: [{ addresses: [targetBtcAddress], output_value: 50000000 }],
        outputs: [{ addresses: [targetBtcAddress], value: 49998000 }]
      };
       const mockBtcTxCoinbase = {
        hash: 'btcTxCoinbase',
        confirmed: '2023-01-04T10:00:00Z',
        received: '2023-01-04T09:55:00Z',
        confirmations: 100,
        block_height: 800003,
        fees: 0,
        inputs: [{ prev_hash: '0000000000000000000000000000000000000000000000000000000000000000', output_index: -1 }], // Coinbase input
        outputs: [{ addresses: [targetBtcAddress], value: 625000000 }] // 6.25 BTC reward
      };


      const targetEthAddress = '0xTargetEthAddress';
      const mockEthTxReceive = {
        hash: 'ethTxHashReceive',
        confirmed: '2023-02-01T12:00:00Z',
        received: '2023-02-01T11:55:00Z',
        confirmations: 50,
        block_height: 15000000,
        gas_used: 21000,
        gas_price: 10000000000, // 10 Gwei
        inputs: [{ addresses: ['0xSenderAddress'] }],
        outputs: [{ addresses: [targetEthAddress], value: 1000000000000000000 }] // 1 ETH
      };
       const mockEthTxSend = {
        hash: 'ethTxHashSend',
        confirmed: '2023-02-02T14:00:00Z',
        received: '2023-02-02T13:55:00Z',
        confirmations: 60,
        block_height: 15000001,
        gas_used: 50000, // More gas for contract potentially
        gas_price: 12000000000, // 12 Gwei
        inputs: [{ addresses: [targetEthAddress] }],
        outputs: [{ addresses: ['0xReceiverAddress'], value: 500000000000000000 }] // 0.5 ETH
      };
      const mockEthTxContractInteraction = {
        hash: 'ethTxHashContract',
        confirmed: '2023-02-03T16:00:00Z',
        received: '2023-02-03T15:55:00Z',
        confirmations: 70,
        block_height: 15000002,
        gas_used: 100000,
        gas_price: 15000000000,
        inputs: [{ addresses: [targetEthAddress] }], // Target address interacting with a contract
        outputs: [{ addresses: ['0xContractAddress'], value: 0 }], // Value 0 to contract
        execution_error: null
      };
      const mockEthTxFailed = {
        hash: 'ethTxHashFailed',
        confirmed: '2023-02-04T18:00:00Z',
        received: '2023-02-04T17:55:00Z',
        confirmations: 80,
        block_height: 15000003,
        gas_used: 30000,
        gas_price: 10000000000,
        inputs: [{ addresses: [targetEthAddress] }],
        outputs: [{ addresses: ['0xReceiverAddress'], value: 100000000000000000 }], // 0.1 ETH
        execution_error: "Out of gas"
      };


      it('should normalize a BTC receive transaction correctly', () => {
        const normalized = normalizeBlockCypherTransactions([mockBtcTxReceive], 'btc', targetBtcAddress)[0];
        expect(normalized.id).toBe('btcTxHashReceive');
        expect(normalized.date).toBe('2023-01-01T12:00:00Z');
        expect(normalized.currency).toBe('BTC');
        expect(normalized.status).toBe('confirmed');
        expect(normalized.type).toBe('receive');
        expect(normalized.amount).toBe(1); // 1 BTC
        expect(normalized.sender).toBe('1SenderAddress');
        expect(normalized.receiver).toBe(targetBtcAddress);
        expect(normalized.fees).toBe(0.0001); // 10000 satoshis
      });

      it('should normalize a BTC send transaction correctly', () => {
        const normalized = normalizeBlockCypherTransactions([mockBtcTxSend], 'btc', targetBtcAddress)[0];
        expect(normalized.id).toBe('btcTxHashSend');
        expect(normalized.type).toBe('send');
        expect(normalized.amount).toBe(1.2); // Sent 1.2 BTC to 1ReceiverAddress
        expect(normalized.sender).toBe(targetBtcAddress);
        expect(normalized.receiver).toBe('1ReceiverAddress');
        expect(normalized.fees).toBe(0.00005); // 5000 satoshis
      });

      it('should normalize a BTC self/change transaction correctly', () => {
        const normalized = normalizeBlockCypherTransactions([mockBtcTxSelf], 'btc', targetBtcAddress)[0];
        expect(normalized.id).toBe('btcTxHashSelf');
        expect(normalized.type).toBe('self');
        expect(normalized.amount).toBe(0.49998); // Amount sent to self (the output value)
        expect(normalized.sender).toBe(targetBtcAddress);
        expect(normalized.receiver).toBe(targetBtcAddress);
        expect(normalized.fees).toBe(0.00002);
      });

      it('should normalize a BTC coinbase transaction correctly', () => {
        const normalized = normalizeBlockCypherTransactions([mockBtcTxCoinbase], 'btc', targetBtcAddress)[0];
        expect(normalized.id).toBe('btcTxCoinbase');
        expect(normalized.type).toBe('receive');
        expect(normalized.amount).toBe(6.25);
        expect(normalized.sender).toBe('Coinbase');
        expect(normalized.receiver).toBe(targetBtcAddress);
        expect(normalized.fees).toBe(0);
      });

      it('should normalize an ETH receive transaction correctly', () => {
        const normalized = normalizeBlockCypherTransactions([mockEthTxReceive], 'eth', targetEthAddress)[0];
        expect(normalized.id).toBe('ethTxHashReceive');
        expect(normalized.date).toBe('2023-02-01T12:00:00Z');
        expect(normalized.currency).toBe('ETH');
        expect(normalized.status).toBe('confirmed');
        expect(normalized.type).toBe('receive');
        expect(normalized.amount).toBe(1); // 1 ETH
        expect(normalized.sender).toBe('0xSenderAddress');
        expect(normalized.receiver).toBe(targetEthAddress);
        expect(normalized.fees).toBe(0.00021); // 21000 * 10 Gwei
      });

      it('should normalize an ETH send transaction correctly', () => {
        const normalized = normalizeBlockCypherTransactions([mockEthTxSend], 'eth', targetEthAddress)[0];
        expect(normalized.id).toBe('ethTxHashSend');
        expect(normalized.type).toBe('send');
        expect(normalized.amount).toBe(0.5);
        expect(normalized.sender).toBe(targetEthAddress);
        expect(normalized.receiver).toBe('0xReceiverAddress');
        expect(normalized.fees).toBe(0.0006); // 50000 * 12 Gwei
      });

      it('should normalize an ETH contract interaction transaction correctly', () => {
        const normalized = normalizeBlockCypherTransactions([mockEthTxContractInteraction], 'eth', targetEthAddress)[0];
        expect(normalized.id).toBe('ethTxHashContract');
        expect(normalized.type).toBe('contract_interaction'); // Value is 0
        expect(normalized.amount).toBe(0);
        expect(normalized.sender).toBe(targetEthAddress);
        expect(normalized.receiver).toBe('0xContractAddress');
        expect(normalized.fees).toBe(0.0015); // 100000 * 15 Gwei
        expect(normalized.status).toBe('confirmed');
      });

      it('should normalize a failed ETH transaction correctly', () => {
        const normalized = normalizeBlockCypherTransactions([mockEthTxFailed], 'eth', targetEthAddress)[0];
        expect(normalized.id).toBe('ethTxHashFailed');
        expect(normalized.status).toBe('failed');
        expect(normalized.type).toBe('send'); // Still a send attempt
        expect(normalized.amount).toBe(0.1); // Amount it attempted to send
        expect(normalized.sender).toBe(targetEthAddress);
        expect(normalized.receiver).toBe('0xReceiverAddress');
        expect(normalized.fees).toBe(0.0003); // Gas was still consumed
      });

      it('should use received date if confirmed date is not available', () => {
        const txWithoutConfirmedDate = { ...mockBtcTxReceive, confirmed: null };
        const normalized = normalizeBlockCypherTransactions([txWithoutConfirmedDate], 'btc', targetBtcAddress)[0];
        expect(normalized.date).toBe('2023-01-01T11:55:00Z');
      });

      it('should handle transactions with no confirmations (pending)', () => {
        const pendingTx = { ...mockBtcTxReceive, confirmations: 0, block_height: -1, confirmed: null };
        const normalized = normalizeBlockCypherTransactions([pendingTx], 'btc', targetBtcAddress)[0];
        expect(normalized.status).toBe('pending');
        expect(normalized.confirmations).toBe(0);
        expect(normalized.blockHeight).toBeNull();
      });

      it('should return an empty array for empty input', () => {
        expect(normalizeBlockCypherTransactions([], 'btc', targetBtcAddress)).toEqual([]);
      });

      it('should warn and process without context if forAddress is not provided', () => {
        const normalized = normalizeBlockCypherTransactions([mockBtcTxReceive], 'btc', '');
        expect(console.warn).toHaveBeenCalledWith('normalizeBlockCypherTransactions: forAddress parameter is required to determine transaction direction.');
        // Basic fields should still be populated
        expect(normalized[0].id).toBe('btcTxHashReceive');
        // Type might be 'other' or less specific as context is missing
      });

      it('should handle a transaction where the target address is not involved', () => {
        const unrelatedTx = {
          hash: 'unrelatedTxHash',
          confirmed: '2023-03-01T12:00:00Z',
          fees: 1000,
          inputs: [{ addresses: ['someOtherSender'], output_value: 100000 }],
          outputs: [{ addresses: ['someOtherReceiver'], value: 99000 }]
        };
        const normalized = normalizeBlockCypherTransactions([unrelatedTx], 'btc', targetBtcAddress)[0];
        expect(normalized.type).toBe('other');
        expect(normalized.amount).toBe(0); // No direct value change for targetAddress
        expect(normalized.sender).toBe('someOtherSender');
        expect(normalized.receiver).toBe('someOtherReceiver');
      });
    });
  });
});
