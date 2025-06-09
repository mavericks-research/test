// cloudflare-openai-boilerplate/backend/worker-backend/src/behaviorAnalysisService.js

/**
 * Analyzes a list of wallet transactions to identify behavioral patterns and calculate metrics.
 *
 * @param {Array<object>} transactions - An array of processed transaction objects.
 * Each transaction object is expected to have fields like:
 * `hash`, `fromAddress`, `toAddress`, `value`, `gasUsed`, `gasPrice`, `timestamp`, `functionCalled`, `tokenTransfers`.
 * @returns {object} An object containing `tags` (array of strings) and `metrics` (object).
 */
function analyzeTransactions(transactions) {
  const tags = new Set(); // Use a Set for tags to avoid duplicates automatically
  const metrics = {
    totalTransactions: 0,
    dexInteractionCount: 0,
    nftInteractionCount: 0,
    lastActivityDate: null,
    firstActivityDate: null,
    uniqueContractsInteracted: new Set(), // Use a Set to store unique contract addresses
    transactionPeriodDays: 0,
    avgTransactionsPerDay: 0,
    // Additional metrics can be added here
    stablecoinTransferCount: 0,
    gasSpentGwei: BigInt(0), // Total gas spent in Gwei
  };

  if (!Array.isArray(transactions) || transactions.length === 0) {
    // Calculate derived metrics even for empty/default state
    metrics.uniqueContractsInteracted = 0; // Convert Set to number for output
    return { tags: [], metrics };
  }

  metrics.totalTransactions = transactions.length;

  transactions.forEach(tx => {
    const timestamp = new Date(tx.timestamp);
    if (!metrics.firstActivityDate || timestamp < metrics.firstActivityDate) {
      metrics.firstActivityDate = timestamp;
    }
    if (!metrics.lastActivityDate || timestamp > metrics.lastActivityDate) {
      metrics.lastActivityDate = timestamp;
    }

    // DEX Interaction Heuristic (case-insensitive)
    const funcLower = tx.functionCalled ? tx.functionCalled.toLowerCase() : "";
    if (/(swap|addliquidity|removeliquidity|uniswap|sushiswap|pancakeswap|1inch|kyber)/.test(funcLower)) {
      metrics.dexInteractionCount++;
    }

    // NFT Interaction Heuristic (Simplified, case-insensitive)
    if (/(mint|nft|safeTransferFrom|opensea|blur|magiceden|looksrare|transferfrom)/.test(funcLower) ||
        (tx.tokenTransfers && tx.tokenTransfers.some(t => t.tokenName && t.tokenName.toLowerCase().includes('collectible')))
       ) {
      // More specific checks for safeTransferFrom could be added if token type (ERC721/1155) is known
      // For now, if "safeTransferFrom" is in functionCalled, it's a strong indicator.
      metrics.nftInteractionCount++;
    }

    // Count unique contract interactions (to_address, assuming it's a contract if not a simple native transfer)
    // This is a simplification. A better way would be to check if to_address is a known EOA or if Moralis provides an is_contract flag.
    if (tx.toAddress && tx.toAddress.toLowerCase() !== tx.fromAddress.toLowerCase()) {
        // Further check if it's a contract (e.g., tx.input !== '0x' for simple native transfers)
        // or rely on functionCalled being not N/A if it implies contract interaction
        if (funcLower !== "n/a" || (tx.input && tx.input !== '0x')) {
             metrics.uniqueContractsInteracted.add(tx.toAddress.toLowerCase());
        }
    }

    // Gas spent calculation
    if (tx.gasUsed && tx.gasPrice && !isNaN(parseFloat(tx.gasUsed)) && !isNaN(parseFloat(tx.gasPrice))) {
        try {
            // Assuming gasPrice is in Gwei and gasUsed is a unit.
            // Gas spent per tx = gasUsed * gasPrice (in Gwei)
            const gasUsedBigInt = BigInt(Math.round(parseFloat(tx.gasUsed))); // gasUsed can be float from Moralis sometimes
            const gasPriceBigInt = BigInt(tx.gasPrice); // gasPrice in Gwei
            metrics.gasSpentGwei += gasUsedBigInt * gasPriceBigInt;
        } catch (e) {
            console.warn("Could not parse gas values for tx: ", tx.hash, e);
        }
    }

    // Stablecoin transfer heuristic
    if (tx.tokenTransfers && tx.tokenTransfers.some(t => /(USDC|USDT|DAI|BUSD|TUSD|MIM)/i.test(t.tokenSymbol || ""))) {
        metrics.stablecoinTransferCount++;
    }
  });

  // Calculate derived metrics
  if (metrics.firstActivityDate && metrics.lastActivityDate) {
    const diffTime = Math.abs(metrics.lastActivityDate.getTime() - metrics.firstActivityDate.getTime());
    metrics.transactionPeriodDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (metrics.transactionPeriodDays === 0 && metrics.totalTransactions > 0) {
        metrics.transactionPeriodDays = 1; // Min 1 day if there are transactions
    }
  }

  if (metrics.transactionPeriodDays > 0) {
    metrics.avgTransactionsPerDay = parseFloat((metrics.totalTransactions / metrics.transactionPeriodDays).toFixed(2));
  } else {
    metrics.avgTransactionsPerDay = metrics.totalTransactions; // If all on same day, avg is total
  }

  // Convert Set of unique contracts to a number
  metrics.uniqueContractsInteracted = metrics.uniqueContractsInteracted.size;
  metrics.gasSpentGwei = metrics.gasSpentGwei.toString(); // Convert BigInt to string for JSON response

  // Apply Tags based on Metrics & Activity
  if (metrics.dexInteractionCount > 0) tags.add("DEX User");
  if (metrics.nftInteractionCount > 0) tags.add("NFT User");
  if (metrics.stablecoinTransferCount > 0) tags.add("Stablecoin User");

  if (metrics.avgTransactionsPerDay > 5 && metrics.transactionPeriodDays > 1) tags.add("Active User");
  else if (metrics.avgTransactionsPerDay > 1 && metrics.transactionPeriodDays > 7) tags.add("Regular User");

  if (metrics.totalTransactions < 10 && metrics.transactionPeriodDays > 30) tags.add("Infrequent User / HODLer");
  else if (metrics.totalTransactions >= 1 && metrics.totalTransactions < 5 && metrics.transactionPeriodDays < 7) tags.add("New/Light User");


  if (metrics.transactionPeriodDays < 7 && metrics.totalTransactions > 1 && metrics.avgTransactionsPerDay >=1) {
    tags.add("Recent Activity Burst");
  }
  if (metrics.transactionPeriodDays > 90 && metrics.avgTransactionsPerDay > 0.5) {
      tags.add("Long-Term Active User");
  }
  if (metrics.uniqueContractsInteracted > 10) {
      tags.add("Exploratory User");
  }
   if (metrics.totalTransactions === 0) {
    tags.add("No Transaction History");
  }


  return { tags: Array.from(tags), metrics }; // Convert Set to Array for tags
}

export { analyzeTransactions };
