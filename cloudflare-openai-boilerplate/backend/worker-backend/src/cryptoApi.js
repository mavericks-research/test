// Cloudflare worker environment variables
// Ensure COINGECKO_API_KEY is set in your Cloudflare worker settings if using an API key.
// const COINGECKO_API_KEY = typeof YOUR_WORKER_ENV_VAR !== 'undefined' ? YOUR_WORKER_ENV_VAR : null;
// For public access without an explicit key (relying on IP-based rate limits, not recommended for stability):
const API_BASE_URL = 'https://api.coingecko.com/api/v3';

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
        include_market_cap: 'false', // Optional: add 'true' if needed
        include_24hr_vol: 'false',   // Optional: add 'true' if needed
        include_24hr_change: 'false',// Optional: add 'true' if needed
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
};
