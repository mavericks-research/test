// Cloudflare worker environment variables
// Ensure COINGECKO_API_KEY is set in your Cloudflare worker settings if using an API key.
// const COINGECKO_API_KEY = typeof YOUR_WORKER_ENV_VAR !== 'undefined' ? YOUR_WORKER_ENV_VAR : null;
// For public access without an explicit key (relying on IP-based rate limits, not recommended for stability):
const API_BASE_URL = 'https://api.coingecko.com/api/v3';

import { generateReport } from './openAIService.js';
import { analyzeTransactions } from './behaviorAnalysisService.js'; // Import behavioral analysis service

// Placeholder for functions to interact with CoinGecko API

/**
 * Fetches data from the CoinGecko API.
 * @param {string} endpoint The API endpoint to call (e.g., '/simple/price').
 * @param {object} params Query parameters for the API call.
 * @param {string|null} apiKey Optional CoinGecko API key.
 * @returns {Promise<object>} The JSON response from the API.
 */
async function fetchFromCoinGecko(endpoint, params = {}, apiKey = null) {
    const url = new URL(`${API_BASE_URL}${endpoint}`);

    // Add query parameters
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    // Add API key if available
    if (apiKey) {
        url.searchParams.append('x_cg_demo_api_key', apiKey);
    }

    // console.log(`Fetching from URL: ${url.toString()}`); // For debugging

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            // If using API key via header (recommended):
            // 'x-cg-demo-api-key': COINGECKO_API_KEY
        }
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`CoinGecko API Error: ${response.status} ${response.statusText}`, errorBody);
        throw new Error(`CoinGecko API request failed: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    return response.json();
}

/**
 * Fetches the list of all supported coins and their IDs.
 * Useful for finding the correct 'id' for other API calls.
 * @param {string|null} apiKey Optional CoinGecko API key.
 * @returns {Promise<Array<{id: string, symbol: string, name: string}>>} A list of coins.
 */
async function getCoinList(apiKey = null) {
    try {
        const data = await fetchFromCoinGecko('/coins/list', {}, apiKey);
        return data;
    } catch (error) {
        console.error('Error fetching coin list:', error);
        // Depending on how you want to handle errors, you might re-throw or return a default
        throw error;
    }
}

/**
 * Fetches the current price of specified cryptocurrencies in specified fiat currencies.
 * @param {string[]} coinIds - Array of coin IDs (e.g., ['bitcoin', 'ethereum']).
 * @param {string[]} vsCurrencies - Array of fiat currency codes (e.g., ['usd', 'eur']).
 * @param {string|null} apiKey Optional CoinGecko API key.
 * @returns {Promise<object>} An object with coin IDs as keys, which in turn have currency codes as keys,
 *                            and prices as values. E.g., { "bitcoin": { "usd": 50000 } }
 */
async function getCurrentPrices(coinIds, vsCurrencies, apiKey = null) {
    if (!coinIds || coinIds.length === 0) {
        throw new Error('coinIds array cannot be empty.');
    }
    if (!vsCurrencies || vsCurrencies.length === 0) {
        throw new Error('vsCurrencies array cannot be empty.');
    }

    const params = {
        ids: coinIds.join(','),
        vs_currencies: vsCurrencies.join(','),
        include_market_cap: 'true', // Optional: add 'true' if needed
        include_24hr_vol: 'true',   // Optional: add 'true' if needed
        include_24hr_change: 'true',// Optional: add 'true' if needed
        include_last_updated_at: 'false' // Optional: add 'true' if needed
    };

    try {
        const data = await fetchFromCoinGecko('/simple/price', params, apiKey);
        return data;
    } catch (error) {
        console.error('Error fetching current prices:', error);
        throw error;
    }
}

/**
 * Fetches historical market data for a specific coin on a specific date.
 * Note: CoinGecko's free API limits historical data to the last 365 days.
 * @param {string} coinId - The ID of the coin (e.g., 'bitcoin').
 * @param {string} date - The date in dd-mm-yyyy format (e.g., '30-12-2022').
 * @param {string|null} apiKey Optional CoinGecko API key.
 * @returns {Promise<object>} An object containing historical data like id, symbol, name, localization, image, market_data.
 *                            market_data includes current_price, market_cap, and total_volume in various currencies.
 */
async function getHistoricalData(coinId, date, apiKey = null) {
    if (!coinId) {
        throw new Error('coinId cannot be empty.');
    }
    if (!date || !/^\d{2}-\d{2}-\d{4}$/.test(date)) {
        throw new Error('Date must be in dd-mm-yyyy format.');
    }

    const params = {
        date: date,
        localization: 'false' // Set to true if localized data is needed, e.g., 'en'
    };

    try {
        // The endpoint is /coins/{id}/history
        const data = await fetchFromCoinGecko(`/coins/${coinId}/history`, params, apiKey);
        // The API returns price in market_data.current_price, market_cap in market_data.market_cap etc.
        // These are objects with currency codes as keys.
        return data;
    } catch (error) {
        console.error(`Error fetching historical data for ${coinId} on ${date}:`, error);
        throw error;
    }
}

// --- BlockCypher API ---
const BLOCKCYPHER_API_BASE_URL = 'https://api.blockcypher.com/v1';

/**
 * Fetches data from the BlockCypher API.
 * @param {string} endpoint The API endpoint to call (e.g., '/btc/main/addrs/someaddress').
 * @param {string|null} apiKeyToken Optional BlockCypher API key token.
 * @returns {Promise<object>} The JSON response from the API.
 */
async function fetchFromBlockCypher(endpoint, apiKeyToken = null) {
    const url = new URL(`${BLOCKCYPHER_API_BASE_URL}${endpoint}`);

    // Add API key token if available
    if (apiKeyToken) {
        url.searchParams.append('token', apiKeyToken);
    }

    // console.log(`Fetching from BlockCypher URL: ${url.toString()}`); // For debugging

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        }
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`BlockCypher API Error: ${response.status} ${response.statusText}`, errorBody);
        throw new Error(`BlockCypher API request failed: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    return response.json();
}

/**
 * Fetches the transaction history for a given cryptocurrency address.
 * Uses BlockCypher's "Address Full Endpoint".
 * @param {string} coinSymbol - The symbol of the cryptocurrency (e.g., 'btc', 'eth', 'ltc').
 * @param {string} address - The wallet address to fetch history for.
 * @param {string|null} apiKeyToken - Optional BlockCypher API key token.
 * @returns {Promise<Array<object>>} An array of transaction objects.
 */
async function getTransactionHistory(coinSymbol, address, apiKeyToken = null) {
    if (!coinSymbol || !address) {
        throw new Error('coinSymbol and address must be provided.');
    }

    // Assuming 'main' network for now. This could be parameterized later.
    const network = 'main';
    const endpoint = `/${coinSymbol.toLowerCase()}/${network}/addrs/${address}/full`;

    try {
        const data = await fetchFromBlockCypher(endpoint, apiKeyToken);
        // The Address Full endpoint returns an object that includes a 'txs' array.
        return data.txs || []; // Return an empty array if no transactions are found
    } catch (error) {
        console.error(`Error fetching transaction history for ${coinSymbol} address ${address}:`, error);
        // Depending on how you want to handle errors, you might re-throw or return a default
        throw error;
    }
}


// Export functions as they are implemented
export {
    getCoinList,
    getCurrentPrices,
    getHistoricalData,
    getTransactionHistory,
    getCoinsByBlockchain,
    getMarketChartData, // <-- Add this
    getWalletTokenHoldings,
    getWalletTransactions, // Export new function
};

// --- Wallet Token Holdings ---

/**
 * Fetches token holdings for a given wallet address and chain.
 * NOTE: This is a MOCK IMPLEMENTATION. It does not fetch real on-chain data and mocks AI report generation.
 * @param {string} walletAddress - The wallet address.
 * @param {string} chainId - The chain ID (e.g., 'ethereum', 'bsc').
 * @param {object} env - The Cloudflare worker environment variables.
 * @returns {Promise<object>} A promise that resolves to an object containing token holdings, financial summary, behavioral analysis, and a report narrative.
 */
async function getWalletTokenHoldings(walletAddress, chainId, env) { // Renamed conceptually, but modifying in place
    console.log(`Fetching full portfolio report for address: ${walletAddress} on chain: ${chainId}`);

    // Initial checks for API keys
    if (!env.MORALIS_API_KEY) {
        console.error('Moralis API key is missing.');
        return { error: "Moralis API key is missing. Please configure it in the backend." };
    }
    // Note: COINGECKO_API_KEY check is implicitly handled by getCurrentPrices if it's made mandatory there.
    // OPENAI_API_KEY check is handled by openAIService.generateReport.

    if (!chainIdSupported(chainId)) {
         return { error: `Chain ID '${chainId}' is not supported by this worker.` };
    }

    // Part 1: Fetch Token Holdings and Financial Summary
    let tokenHoldingsData = { finalHoldings: [], portfolioSummary: {} };
    let financialDataError = null;

    // This block largely remains the same, but we'll structure its output
    // and handle errors specifically for the financial part.
    try {
        let rawTokenData = [];
    let nativeBalanceData = null;

    try {
        // Fetch ERC20 token balances
        const moralisTokenUrl = `https://deep-index.moralis.io/api/v2.2/wallets/${walletAddress}/tokens?chain=${mapChainIdToMoralis(chainId)}`;
        const tokenResponse = await fetch(moralisTokenUrl, {
            headers: { 'X-API-Key': env.MORALIS_API_KEY, 'Accept': 'application/json' },
        });

        if (!tokenResponse.ok) {
            const errorBody = await tokenResponse.text();
            console.error(`Moralis API Error (Tokens): ${tokenResponse.status} ${tokenResponse.statusText}`, errorBody);
            return { error: `Failed to fetch token balances from Moralis: ${tokenResponse.statusText} - ${errorBody}` };
        }
        rawTokenData = await tokenResponse.json();

        // Fetch native balance (e.g., ETH for Ethereum)
        // Moralis endpoint for native balance: /wallets/{address}/native
        const moralisNativeBalanceUrl = `https://deep-index.moralis.io/api/v2.2/wallets/${walletAddress}/native?chain=${mapChainIdToMoralis(chainId)}`;
        const nativeBalanceResponse = await fetch(moralisNativeBalanceUrl, {
            headers: { 'X-API-Key': env.MORALIS_API_KEY, 'Accept': 'application/json' },
        });

        if (!nativeBalanceResponse.ok) {
            const errorBody = await nativeBalanceResponse.text();
            console.error(`Moralis API Error (Native Balance): ${nativeBalanceResponse.status} ${nativeBalanceResponse.statusText}`, errorBody);
            // Proceeding without native balance if this fails, but log it.
            // Alternatively, return { error: `Failed to fetch native balance...` }
        } else {
            nativeBalanceData = await nativeBalanceResponse.json();
        }

    } catch (error) {
        console.error('Network or other error during Moralis API calls:', error);
        return { error: `Network error while fetching data from Moralis: ${error.message}` };
    }

    const transformedHoldings = [];
    const coingeckoIdsForPricing = new Set(); // Use Set to avoid duplicate IDs

    // Add native balance to transformedHoldings and prepare for pricing
    if (nativeBalanceData && nativeBalanceData.balance) {
        const nativeTokenInfo = getNativeTokenInfo(chainId); // Helper to get symbol, name, decimals, coingeckoId
        if (nativeTokenInfo) {
            const balance = parseFloat(nativeBalanceData.balance) / (10 ** nativeTokenInfo.decimals);
            transformedHoldings.push({
                name: nativeTokenInfo.name,
                symbol: nativeTokenInfo.symbol,
                balance: balance.toFixed(6), // Adjust precision as needed
                contractAddress: 'native',
                coingeckoId: nativeTokenInfo.coingeckoId, // For price fetching
                decimals: nativeTokenInfo.decimals,
            });
            if (nativeTokenInfo.coingeckoId) {
                coingeckoIdsForPricing.add(nativeTokenInfo.coingeckoId);
            }
        }
    }

    // Process ERC20 tokens from Moralis
    rawTokenData.forEach(token => {
        if (!token.possible_spam) { // Filter out potential spam tokens
            const balance = parseFloat(token.balance) / (10 ** parseInt(token.decimals, 10));
            // Attempt to map Moralis token symbol/address to CoinGecko ID
            // This is a complex part. For now, we'll try a direct symbol match or use a predefined map.
            // A more robust solution involves a lookup service or a well-maintained map.
            const coingeckoId = mapMoralisTokenToCoinGeckoId(token, chainId);

            transformedHoldings.push({
                name: token.name || 'Unknown Token',
                symbol: token.symbol || 'N/A',
                balance: balance.toFixed(6), // Adjust precision
                contractAddress: token.token_address,
                coingeckoId: coingeckoId,
                decimals: parseInt(token.decimals, 10),
            });
            if (coingeckoId) {
                coingeckoIdsForPricing.add(coingeckoId);
            }
        }
    });

    let prices = {};
    if (coingeckoIdsForPricing.size > 0) {
        try {
            prices = await getCurrentPrices(Array.from(coingeckoIdsForPricing), ['usd'], env.COINGECKO_API_KEY);
        } catch (error) {
            console.warn("Failed to fetch some prices from CoinGecko, proceeding without them.", error.message);
            // Allow to proceed, some tokens just won't have prices.
        }
    }

    let holdingsWithValueCalculations = transformedHoldings.map(token => {
        const priceData = token.coingeckoId ? prices[token.coingeckoId] : null;
        const price_usd = priceData && priceData.usd ? priceData.usd : 0; // Default to 0 if no price
        const balanceNum = parseFloat(token.balance);
        const value_usd_num = balanceNum * price_usd;

        return {
            name: token.name,
            symbol: token.symbol,
            balance: token.balance, // Already formatted string
            price_usd: price_usd.toFixed(2), // Ensure price is string
            value_usd: value_usd_num.toFixed(2),
            value_usd_numeric: value_usd_num,
        };
    });

    // Calculate total portfolio value
    const totalPortfolioValue = holdingsWithValueCalculations.reduce((sum, holding) => sum + holding.value_usd_numeric, 0);

    // Calculate percentage allocation
    const finalHoldings = holdingsWithValueCalculations.map(holding => {
        const percentage = totalPortfolioValue > 0 ? (holding.value_usd_numeric / totalPortfolioValue) * 100 : 0;
        return {
            name: holding.name,
            symbol: holding.symbol,
            balance: holding.balance,
            price_usd: holding.price_usd,
            value_usd: holding.value_usd,
            percentageAllocation: percentage.toFixed(2) + '%',
        };
    });

    // Prepare portfolio summary
    const numberOfUniqueAssets = finalHoldings.length;
    const sortedByValueForSummary = [...finalHoldings].sort((a, b) => parseFloat(b.value_usd) - parseFloat(a.value_usd));
    let topAssetsMsg = "N/A";
    if (numberOfUniqueAssets > 0) {
        topAssetsMsg = sortedByValueForSummary.slice(0, 2).map(h => h.name).join(' and ');
    }

        tokenHoldingsData = {
            holdings: finalHoldings,
            summary: portfolioSummary
        };
    } catch (error) {
        console.error("Error fetching or processing financial data (holdings/summary):", error);
        financialDataError = error.message; // Capture the error
        // We might still want to proceed to fetch transactions and do behavioral analysis if token fetching failed.
        // Or, return early: return { error: `Failed to process financial data: ${financialDataError}` };
    }


    // Part 2: Fetch Transactions and Perform Behavioral Analysis
    let behavioralAnalysis = { tags: [], metrics: {} }; // Default empty state
    let transactionDataError = null;

    try {
        const transactionsResult = await getWalletTransactions(walletAddress, chainId, env);
        if (transactionsResult.error) {
            console.warn(`Could not fetch/process transactions: ${transactionsResult.error}`);
            transactionDataError = transactionsResult.error;
            // Proceed without behavioral analysis if transactions fail
        } else if (transactionsResult.transactions && transactionsResult.transactions.length > 0) {
            behavioralAnalysis = analyzeTransactions(transactionsResult.transactions);
        } else {
            // No transactions found, behavioralAnalysis remains default (empty)
            console.log(`No transactions found for ${walletAddress} on ${chainId} for behavioral analysis.`);
            behavioralAnalysis.metrics.totalTransactions = 0; // Ensure totalTransactions is 0
        }
    } catch (error) {
        console.error("Error during transaction fetching or behavioral analysis:", error);
        transactionDataError = error.message;
         // Proceed without behavioral analysis
    }

    // Part 3: Generate Combined Report with OpenAI
    let reportNarrative = "AI report generation was skipped due to missing financial data.";
    if (!financialDataError && tokenHoldingsData.holdings.length > 0) { // Only generate report if we have financial data
        try {
            // Pass financialData and behavioralData (which might be empty/default)
            reportNarrative = await generateReport(tokenHoldingsData, behavioralAnalysis, env);
        } catch (error) {
            console.error("Error generating AI report:", error);
            reportNarrative = `Error generating AI report: ${error.message}`;
        }
    } else if (financialDataError) {
        reportNarrative = `AI report generation skipped due to error in financial data processing: ${financialDataError}.`;
    }


    // Part 4: Construct the final response
    // If there was a critical error fetching holdings, we might have already returned.
    // Otherwise, assemble what we have.
    const finalResponse = {
        tokenHoldings: tokenHoldingsData.holdings || [], // Ensure array
        financialSummary: tokenHoldingsData.summary || { totalPortfolioValueUSD: '0.00', numberOfUniqueAssets: 0, topAssetsMessage: "Data unavailable." },
        behavioralAnalysis: behavioralAnalysis,
        reportNarrative: reportNarrative,
    };

    // Add a note if parts of the data are missing due to errors
    if (financialDataError) {
        finalResponse.errorNote = `Financial data incomplete: ${financialDataError}.`;
    }
    if (transactionDataError && !financialDataError) { // Add transaction error if no major financial error already reported
        finalResponse.warningNote = `Behavioral analysis may be incomplete: ${transactionDataError}.`;
    }


    return finalResponse;
}

// Helper function to map chainId to Moralis chain parameter
function mapChainIdToMoralis(chainId) {
    switch (chainId.toLowerCase()) {
        case 'ethereum': return 'eth';
        case 'bsc': return 'bsc';
        case 'polygon': return 'polygon';
        // Add other chains as supported by Moralis and your use case
        default: return chainId; // Pass through if not explicitly mapped, Moralis might support it
    }
}

// Helper to get native token details
function getNativeTokenInfo(chainId) {
    // This map needs to be updated with CoinGecko IDs for each native currency
    const map = {
        'ethereum': { name: 'Ethereum', symbol: 'ETH', decimals: 18, coingeckoId: 'ethereum' },
        'bsc': { name: 'BNB', symbol: 'BNB', decimals: 18, coingeckoId: 'binancecoin' },
        'polygon': { name: 'Matic', symbol: 'MATIC', decimals: 18, coingeckoId: 'matic-network' },
    };
    return map[chainId.toLowerCase()];
}

// Helper to map Moralis token data (symbol, address) to CoinGecko ID
// This is a placeholder and needs a more robust implementation for broad token support.
function mapMoralisTokenToCoinGeckoId(moralisToken, chainId) {
    // Example: A predefined map for common tokens
    const commonTokenMap = {
        'ethereum': { // chainId
            '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 'usd-coin', // USDC on Ethereum
            '0xdAC17F958D2ee523a2206206994597C13D831ec7': 'tether',     // USDT on Ethereum
            '0x514910771AF9Ca656af840dff83E8264EcF986CA': 'chainlink',  // LINK on Ethereum
            // Add more known contract addresses for Ethereum
        },
        // Add other chains and their common tokens
    };

    if (commonTokenMap[chainId.toLowerCase()] && commonTokenMap[chainId.toLowerCase()][moralisToken.token_address.toLowerCase()]) {
        return commonTokenMap[chainId.toLowerCase()][moralisToken.token_address.toLowerCase()];
    }

    // Fallback: try to use symbol (less reliable due to collisions)
    // This part might be removed if it causes too many incorrect matches.
    // For now, we'll be very conservative.
    const symbolLower = moralisToken.symbol ? moralisToken.symbol.toLowerCase() : null;
    if (symbolLower === 'usdc') return 'usd-coin';
    if (symbolLower === 'usdt') return 'tether';
    if (symbolLower === 'weth') return 'weth'; // Wrapped Ether

    // If no mapping found, return null; price will be N/A or 0.
    console.warn(`No CoinGecko ID mapping for token ${moralisToken.name} (${moralisToken.symbol}) on ${chainId}. Address: ${moralisToken.token_address}`);
    return null;
}

// Helper to check if chain is supported by this function's Moralis integration
function chainIdSupported(chainId) {
    const supported = ['ethereum', 'bsc', 'polygon']; // Extend as needed
    return supported.includes(chainId.toLowerCase());
}


// --- Wallet Transactions ---

/**
 * Fetches and processes wallet transaction history from Moralis.
 * @param {string} walletAddress - The wallet address.
 * @param {string} chainId - The chain ID (e.g., 'ethereum').
 * @param {object} env - The Cloudflare worker environment variables (must contain MORALIS_API_KEY).
 * @returns {Promise<object>} A promise that resolves to an object containing processed transactions or an error.
 */
async function getWalletTransactions(walletAddress, chainId, env) {
    console.log(`Fetching transactions for address: ${walletAddress} on chain: ${chainId}`);

    if (!env.MORALIS_API_KEY) {
        console.error('Moralis API key is missing for transaction fetching.');
        return { error: "Moralis API key is missing. Please configure it in the backend." };
    }
    if (!chainIdSupported(chainId)) { // Re-use helper from getWalletTokenHoldings
        return { error: `Chain ID '${chainId}' is not supported for transaction fetching.` };
    }

    const moralisChainId = mapChainIdToMoralis(chainId); // Re-use helper
    // Moralis endpoint for wallet transaction history. Using v2.2 for consistency.
    // Example: https://deep-index.moralis.io/api/v2.2/0x.../history?chain=eth
    // Note: The Moralis documentation sometimes shows /wallets/{address}/history and sometimes /{address}/history.
    // The one starting with /{address}/history seems more common for overall transaction history.
    const moralisTransactionsUrl = `https://deep-index.moralis.io/api/v2.2/${walletAddress}/history?chain=${moralisChainId}&limit=50`; // Limit to 50 for now

    try {
        const response = await fetch(moralisTransactionsUrl, {
            headers: { 'X-API-Key': env.MORALIS_API_KEY, 'Accept': 'application/json' },
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Moralis API Error (Transactions): ${response.status} ${response.statusText}`, errorBody);
            return { error: `Failed to fetch transactions from Moralis: ${response.statusText} - ${errorBody}` };
        }

        const rawTransactionsData = await response.json();
        const nativeTokenInfo = getNativeTokenInfo(chainId); // For native currency decimal conversion

        if (!rawTransactionsData || !rawTransactionsData.result) {
            console.warn('Moralis transactions API did not return a result array:', rawTransactionsData);
            return { transactions: [] }; // Return empty if no results or unexpected structure
        }

        const processedTransactions = rawTransactionsData.result.map(tx => {
            // Value conversion (native currency)
            const valueInStandardUnit = tx.value ? (BigInt(tx.value) / BigInt(10 ** nativeTokenInfo.decimals)).toString() : '0';
            // Gas price conversion (assuming gas price is in wei)
            const gasPriceInGwei = tx.gas_price ? (BigInt(tx.gas_price) / BigInt(10 ** 9)).toString() : 'N/A'; // Wei to Gwei

            // Extracting function called - this can be complex and dependent on Moralis's response structure
            // For Moralis v2.2 /history, `input` field might contain data, or one might look for `method` or `decoded_call`.
            // This is a simplified placeholder.
            let functionCalled = "N/A";
            if (tx.input && tx.input !== '0x') {
                // Basic check: if input starts with a common function signature prefix
                // A true decoding requires ABI. Moralis might provide `decoded_call` on some transactions.
                if (tx.decoded_call && tx.decoded_call.label) {
                    functionCalled = tx.decoded_call.label;
                } else if (tx.input.startsWith('0xa9059cbb')) functionCalled = 'Transfer(address,uint256)';
                else if (tx.input.startsWith('0x095ea7b3')) functionCalled = 'Approve(address,uint256)';
                // ... more common functions or use tx.decoded_call if available
            }


            // Placeholder for ERC20/NFT transfers - Moralis /history might not nest these directly.
            // The /wallets/{address}/transfers (ERC20) endpoint is separate.
            // For this basic history, we'll assume no deep ERC20 transfer parsing within this single call.
            // If Moralis does include them in some transactions (e.g. via logs or internal_transactions), structure would be different.
            const tokenTransfers = tx.erc20_transfers ? tx.erc20_transfers.map(t => ({
                tokenSymbol: t.token_symbol,
                tokenName: t.token_name,
                amount: t.value ? (BigInt(t.value) / BigInt(10 ** t.token_decimals)).toString() : 'N/A',
                from: t.from_address,
                to: t.to_address,
                contractAddress: t.address
            })) : [];


            return {
                hash: tx.hash,
                fromAddress: tx.from_address,
                toAddress: tx.to_address,
                value: valueInStandardUnit, // e.g., ETH amount
                gasUsed: tx.gas_used || 'N/A',
                gasPrice: gasPriceInGwei, // e.g., GWEI
                timestamp: tx.block_timestamp, // ISO string
                functionCalled: functionCalled,
                tokenTransfers: tokenTransfers, // Will be empty if not provided by this endpoint
            };
        });

        return { transactions: processedTransactions };

    } catch (error) {
        console.error('Network or other error during Moralis Transactions API call:', error);
        return { error: `Network error while fetching transactions from Moralis: ${error.message}` };
    }
}


/**
 * Fetches coins/tokens for a specific blockchain platform.
 * Fetches coins/tokens for a specific blockchain platform.
 * @param {string} blockchainPlatform - The asset platform ID (e.g., 'ethereum', 'binance-smart-chain', 'solana').
 * @param {string} vsCurrency - The target currency (e.g., 'usd').
 * @param {string|null} apiKey Optional CoinGecko API key.
 * @returns {Promise<Array<object>>} A list of coins with their market data.
 */
async function getCoinsByBlockchain(blockchainPlatform, vsCurrency, apiKey = null) {
    if (!blockchainPlatform) {
        throw new Error('blockchainPlatform cannot be empty.');
    }
    if (!vsCurrency) {
        throw new Error('vsCurrency cannot be empty.');
    }

    const params = {
        vs_currency: vsCurrency,
        asset_platform_id: blockchainPlatform,
        per_page: 100, // Fetching top 100, can be parameterized if needed
        page: 1,       // Fetching the first page
        order: 'market_cap_desc', // Order by market cap
        sparkline: 'false', // Not fetching sparkline data
        // include_market_cap, include_24hr_vol, include_24hr_change are implicitly true for /coins/markets
    };

    try {
        // Using /coins/markets endpoint which supports filtering by asset_platform_id
        const data = await fetchFromCoinGecko('/coins/markets', params, apiKey);
        // The data returned is an array of coin objects, each containing market data.
        // We can map it to a simpler format if needed, but for now, let's return the full objects.
        return data.map(coin => ({
            id: coin.id,
            symbol: coin.symbol,
            name: coin.name,
            image: coin.image,
            current_price: coin.current_price,
            market_cap: coin.market_cap,
            total_volume: coin.total_volume,
            price_change_percentage_24h: coin.price_change_percentage_24h,
            // Add any other relevant fields from the 'coin' object
        }));
    } catch (error) {
        console.error(`Error fetching coins for blockchain ${blockchainPlatform}:`, error);
        throw error;
    }
}

/**
 * Fetches historical market chart data for a specific coin over a number of days.
 * @param {string} coinId - The ID of the coin (e.g., 'bitcoin').
 * @param {string|number} days - Number of days of data (e.g., "1", "7", "30").
 * @param {string|null} apiKey Optional CoinGecko API key.
 * @returns {Promise<object>} Object containing arrays for prices, market_caps, and total_volumes.
 *                            E.g., { prices: [[timestamp, price], ...], ... }
 */
async function getMarketChartData(coinId, days, apiKey = null) {
  if (!coinId) {
    throw new Error('coinId cannot be empty for market chart data.');
  }
  if (!days) {
    throw new Error('Number of days must be provided for market chart data.');
  }

  const params = {
    vs_currency: 'usd', // Hardcoded to USD for now
    days: days.toString(), // Ensure days is a string for the API
    // interval: 'daily', // Optional: CoinGecko infers based on days. 'daily' for days > 1.
                           // For 1 day, it might return finer granularity (hourly) by default.
  };

  try {
    const data = await fetchFromCoinGecko(`/coins/${coinId}/market_chart`, params, apiKey);
    // Expected data structure: { prices: [[timestamp, price], ...], market_caps: [[timestamp, value], ...], total_volumes: [[timestamp, value], ...] }
    return data;
  } catch (error) {
    console.error(`Error fetching market chart data for ${coinId} over ${days} days:`, error);
    throw error; // Re-throw to be caught by the route handler in index.js
  }
}
