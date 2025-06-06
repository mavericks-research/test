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

/**
 * Converts transaction values to USD.
 * For this version, it assumes the 'value' field (typically in Wei for ETH transactions)
 * is to be represented as USD directly for simplicity, as per requirements.
 * A 'valueUSD' property is added.
 *
 * @param {Array<Object>} transactions - An array of transaction objects.
 * @returns {Array<Object>} The transactions array with an added 'valueUSD' property.
 */
export function convertToUSD(transactions) {
  if (!Array.isArray(transactions)) {
    console.warn('convertToUSD: Expected an array of transactions, received:', transactions);
    return transactions;
  }
  return transactions.map(tx => ({
    ...tx,
    // Placeholder: As per requirement "Assume all values are already in USD for now".
    // In reality, tx.value is in Wei (1e-18 ETH).
    // A proper conversion would require fetching the current ETH price in USD.
    // If this were a token transaction (from 'tokentx' endpoint), 'value' would be in token's smallest unit,
    // and we'd use 'tokenDecimal' and the token's price in USD.
    valueUSD: tx.value, // Directly using 'value' as placeholder for 'valueUSD'
  }));
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
