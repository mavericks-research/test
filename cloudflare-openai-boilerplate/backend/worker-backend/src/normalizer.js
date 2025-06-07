// Placeholder for known contract addresses and their token symbols
// TODO: Expand this list and consider making it more dynamic or configurable
const TOKEN_CONTRACTS = {
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC', // USD Coin (USDC)
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT', // Tether USD (USDT)
  '0x6b175474e89094c44da98b954eedeac495271d0f': 'DAI',  // Dai Stablecoin (DAI)
};

/**
 * Maps known contract addresses in transactions to their token symbols.
 * Adds a 'tokenSymbol' property to transactions involving known tokens.
 * This is a simplified approach; real token identification might require checking transaction logs for ERC20 Transfer events.
 *
 * @param {Array<Object>} transactions - An array of transaction objects from Etherscan.
 * @returns {Array<Object>} The transactions array with added 'tokenSymbol' where applicable.
 */
export function normalizeTokenNames(transactions) {
  if (!Array.isArray(transactions)) {
    console.warn('normalizeTokenNames: Expected an array of transactions, received:', transactions);
    return transactions;
  }
  return transactions.map(tx => {
    const newTx = { ...tx };
    // Check if the 'to' address is a known token contract.
    // This is a basic check. For actual token transfers, one would typically look at 'input' data
    // or use the 'tokentx' Etherscan endpoint for ERC20/ERC721 token transfers.
    if (TOKEN_CONTRACTS[newTx.to?.toLowerCase()]) {
      newTx.tokenInvolved = TOKEN_CONTRACTS[newTx.to.toLowerCase()];
    }
    // Additionally, if 'input' data suggests an ERC20 transfer (e.g., starts with 0xa9059cbb for transfer)
    // and 'to' is a token contract, it's more likely a token transfer.
    // However, without ABI decoding, this is still a heuristic.
    // For this boilerplate, we'll keep it simple.
    return newTx;
  });
}

// Removed convertToUSD as it's not used by BlockCypher normalization directly here.
// Timestamps will be handled within BlockCypher normalization.

// --- BlockCypher Normalization ---

const BTC_UNITS = 100_000_000; // Satoshis per BTC
const LTC_UNITS = 100_000_000; // Litoshis per LTC
const ETH_UNITS = 1_000_000_000_000_000_000; // Wei per ETH

/**
 * Converts a value from its smallest unit (satoshi, wei) to its standard unit (BTC, ETH, LTC).
 * @param {number|string} valueInSmallestUnit - The value in the smallest unit (e.g., satoshis, wei).
 * @param {string} coinSymbol - The symbol of the cryptocurrency ('btc', 'eth', 'ltc').
 * @returns {number} The value in the standard unit.
 */
export function convertToStandardUnit(valueInSmallestUnit, coinSymbol) {
  const value = Number(valueInSmallestUnit);
  if (isNaN(value)) {
    console.warn(`convertToStandardUnit: Invalid value provided: ${valueInSmallestUnit}`);
    return 0;
  }

  switch (coinSymbol.toLowerCase()) {
    case 'btc':
      return value / BTC_UNITS;
    case 'ltc':
      return value / LTC_UNITS;
    case 'eth':
      return value / ETH_UNITS;
    default:
      console.warn(`convertToStandardUnit: Unsupported coin symbol: ${coinSymbol}`);
      return value; // Return as is if symbol is unknown
  }
}

/**
 * Normalizes a single BlockCypher transaction object.
 * @param {object} tx - The BlockCypher transaction object.
 * @param {string} coinSymbol - The symbol of the cryptocurrency ('btc', 'eth', 'ltc').
 * @param {string} targetAddress - The address for which the transaction history is being fetched.
 * @returns {object} A normalized transaction object.
 */
function normalizeBlockCypherTransaction(tx, coinSymbol, targetAddress) {
  const normalized = {
    id: tx.hash,
    date: tx.confirmed || tx.received || null, // Prioritize confirmed date
    currency: coinSymbol.toUpperCase(),
    confirmations: tx.confirmations || 0,
    blockHeight: tx.block_height > 0 ? tx.block_height : null,
    fees: 0,
    amount: 0,
    type: 'unknown', // 'send', 'receive', or 'self' or 'contract_interaction'
    sender: 'Unknown',
    receiver: 'Unknown',
    status: 'pending',
  };

  if (normalized.blockHeight) {
    normalized.status = 'confirmed';
  }
  if (coinSymbol.toLowerCase() === 'eth' && tx.execution_error) {
    normalized.status = 'failed';
  }


  // Calculate fees
  if (coinSymbol.toLowerCase() === 'eth') {
    normalized.fees = convertToStandardUnit(BigInt(tx.gas_used || 0) * BigInt(tx.gas_price || 0), coinSymbol);
  } else { // BTC, LTC
    normalized.fees = convertToStandardUnit(tx.fees || 0, coinSymbol);
  }

  const lowerTargetAddress = targetAddress.toLowerCase();

  if (coinSymbol.toLowerCase() === 'btc' || coinSymbol.toLowerCase() === 'ltc') {
    let totalOutputToAddress = 0;
    let totalInputFromAddress = 0;
    let firstInputAddress = null;
    let firstOutputAddressNotToTarget = null;

    if (tx.inputs && tx.inputs.length > 0 && tx.inputs[0].addresses && tx.inputs[0].addresses.length > 0) {
      firstInputAddress = tx.inputs[0].addresses[0];
    } else if (tx.inputs && tx.inputs.length > 0 && tx.inputs[0].prev_hash && tx.inputs[0].output_index === -1) {
      // Coinbase transaction (newly mined coins)
      firstInputAddress = 'Coinbase';
    }


    tx.inputs.forEach(input => {
      if (input.addresses) {
        input.addresses.forEach(addr => {
          if (addr.toLowerCase() === lowerTargetAddress) {
            totalInputFromAddress += input.output_value || 0;
          }
        });
      }
    });

    tx.outputs.forEach(output => {
      let isToTarget = false;
      if (output.addresses) {
        output.addresses.forEach(addr => {
          if (addr.toLowerCase() === lowerTargetAddress) {
            isToTarget = true;
            totalOutputToAddress += output.value || 0;
          }
        });
      }
      if (!isToTarget && !firstOutputAddressNotToTarget && output.addresses && output.addresses.length > 0) {
        firstOutputAddressNotToTarget = output.addresses[0];
      }
    });

    if (totalInputFromAddress > 0) { // Sent from targetAddress
      normalized.type = 'send';
      normalized.sender = targetAddress;
      let amountSentToOthers = 0;
      tx.outputs.forEach(output => {
        const isChange = output.addresses && output.addresses.some(addr => addr.toLowerCase() === lowerTargetAddress);
        if (!isChange) {
          amountSentToOthers += output.value || 0;
        }
      });
      if (amountSentToOthers > 0) {
        normalized.amount = convertToStandardUnit(amountSentToOthers, coinSymbol);
        normalized.receiver = firstOutputAddressNotToTarget || 'Multiple Recipients';
      } else { // Sent to self (likely consolidation or change)
        normalized.type = 'self';
        normalized.amount = convertToStandardUnit(totalOutputToAddress, coinSymbol);
        normalized.receiver = targetAddress;
      }
    } else if (totalOutputToAddress > 0) { // Received by targetAddress
      normalized.type = 'receive';
      normalized.receiver = targetAddress;
      normalized.amount = convertToStandardUnit(totalOutputToAddress, coinSymbol);
      normalized.sender = firstInputAddress || 'Unknown';
    } else {
      // Neither sending from nor receiving to the target address directly, could be unrelated
      // or a more complex contract interaction for other coin types (though less common for BTC/LTC)
      normalized.type = 'other';
      normalized.amount = 0; // No direct value change for the targetAddress
      normalized.sender = firstInputAddress || 'Unknown';
      normalized.receiver = firstOutputAddressNotToTarget || 'Unknown';
    }

  } else if (coinSymbol.toLowerCase() === 'eth') {
    const txSender = (tx.inputs && tx.inputs.length > 0 && tx.inputs[0].addresses && tx.inputs[0].addresses.length > 0) ? tx.inputs[0].addresses[0] : 'Unknown';
    // For ETH, output value is often in the first output. Contract calls might have 0 value.
    const primaryOutput = (tx.outputs && tx.outputs.length > 0) ? tx.outputs[0] : { value: 0, addresses: [] };
    const txReceiver = (primaryOutput.addresses && primaryOutput.addresses.length > 0) ? primaryOutput.addresses[0] : 'Contract Interaction or Unknown';
    const txValue = primaryOutput.value || 0;

    normalized.amount = convertToStandardUnit(txValue, coinSymbol);

    if (txSender.toLowerCase() === lowerTargetAddress) {
      normalized.type = 'send';
      normalized.sender = targetAddress;
      normalized.receiver = txReceiver;
    } else if (txReceiver.toLowerCase() === lowerTargetAddress) {
      normalized.type = 'receive';
      normalized.sender = txSender;
      normalized.receiver = targetAddress;
    } else {
      // Address is involved but not as direct sender or receiver of main tx value
      // Could be a token transfer (to contract) or other interaction.
      normalized.type = txValue > 0 ? 'other' : 'contract_interaction';
      normalized.sender = txSender;
      normalized.receiver = txReceiver;
      // For "other", the amount might still be relevant if it's a multi-output tx not directly involving target.
      // For "contract_interaction" where value is 0, amount is fine as 0.
    }
  }
  return normalized;
}

/**
 * Normalizes a list of BlockCypher transaction objects.
 * @param {Array<object>} transactions - An array of BlockCypher transaction objects (txs array from API).
 * @param {string} coinSymbol - The symbol of the cryptocurrency ('btc', 'eth', 'ltc').
 * @param {string} forAddress - The address for which the transaction history is being normalized.
 * @returns {Array<object>} An array of normalized transaction objects.
 */
export function normalizeBlockCypherTransactions(transactions, coinSymbol, forAddress) {
  if (!Array.isArray(transactions)) {
    console.warn('normalizeBlockCypherTransactions: Expected an array of transactions, received:', transactions);
    return [];
  }
  if (!forAddress) {
    console.warn('normalizeBlockCypherTransactions: forAddress parameter is required to determine transaction direction.');
    return transactions.map(tx => normalizeBlockCypherTransaction(tx, coinSymbol, '')); // Process without address context if not provided
  }
  return transactions.map(tx => normalizeBlockCypherTransaction(tx, coinSymbol, forAddress));
}


// --- Etherscan Normalization (existing functions) ---

/**
 * Maps known contract addresses in transactions to their token symbols.
 * Adds a 'tokenSymbol' property to transactions involving known tokens.
 * This is a simplified approach; real token identification might require checking transaction logs for ERC20 Transfer events.
 *
 * @param {Array<Object>} transactions - An array of transaction objects from Etherscan.
 * @returns {Array<Object>} The transactions array with added 'tokenSymbol' where applicable.
 */
// This function normalizeTokenNames was at the top, keeping it there.
// export function normalizeTokenNames(transactions) { ... } // Already exists

// Placeholder for original convertToUSD, adapted for Etherscan data context
export function convertToUSD(transactions) {
  if (!Array.isArray(transactions)) {
    console.warn('convertToUSD: Expected an array of transactions, received:', transactions);
    return transactions; // Or throw an error, depending on desired strictness
  }
  return transactions.map(tx => {
    const newTx = { ...tx };
    // Etherscan 'value' is in Wei for ETH transactions.
    // This function, as originally used, was a placeholder.
    // For the Etherscan path, it created 'valueUSD' directly from 'value'.
    // If 'value' is indeed Wei, a proper conversion would be:
    // newTx.valueUSD = BigInt(newTx.value) / BigInt('1000000000000000000');
    // However, to maintain previous behavior for the Etherscan path,
    // we'll keep it as a direct assignment, assuming 'value' was treated as 'USD' placeholder.
    newTx.valueUSD = newTx.value; // Placeholder behavior
    return newTx;
  });
}

/**
 * Converts Unix timestamps in transactions to ISO 8601 format.
 * Adds a 'dateTime' property.
 *
 * @param {Array<Object>} transactions - An array of transaction objects from Etherscan.
 * @returns {Array<Object>} The transactions array with an added 'dateTime' property.
 */
export function normalizeTimestamps(transactions) {
  if (!Array.isArray(transactions)) {
    console.warn('normalizeTimestamps: Expected an array of transactions, received:', transactions);
    return transactions;
  }
  return transactions.map(tx => {
    const newTx = { ...tx };
    if (newTx.timeStamp) {
      // Etherscan timestamps are in seconds. JavaScript Date expects milliseconds.
      const timestampInMs = parseInt(newTx.timeStamp, 10) * 1000;
      if (!isNaN(timestampInMs)) {
        newTx.dateTime = new Date(timestampInMs).toISOString();
      } else {
        newTx.dateTime = null; // Or some error indicator
        console.warn(`Invalid timestamp for transaction ${newTx.hash}: ${newTx.timeStamp}`);
      }
    }
    return newTx;
  });
}
