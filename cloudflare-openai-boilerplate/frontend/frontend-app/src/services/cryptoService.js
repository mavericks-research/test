// Defines the base URL for the API.
// Uses Vite's import.meta.env for environment variables,
// with a fallback to an empty string for local development (uses Vite proxy).
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Fetches historical market chart data for a specific cryptocurrency.
 * The backend transforms CoinGecko's [timestamp, price] pairs into [{ date: "YYYY-MM-DD", price: value }].
 * @param {string} coinId - The ID of the cryptocurrency (e.g., "bitcoin").
 * @param {string|number} days - The number of days of data to fetch (e.g., "1", "7", "30").
 * @returns {Promise<Array<object>>} A promise that resolves to an array of market chart data points.
 * @throws {Error} If the coinId or days are not provided, or if the fetch request fails or the response is not ok.
 */
export const getCoinMarketChart = async (coinId, days) => {
  if (!coinId) {
    throw new Error('Coin ID is required to fetch market chart data.');
  }
  if (days === undefined || days === null || days === '') { // Check for undefined, null, or empty string
    throw new Error('Number of days is required to fetch market chart data.');
  }

  const response = await fetch(`${API_BASE_URL}/api/crypto/market-chart/${coinId}?days=${days}`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch coin market chart for ${coinId} (${days} days): ${response.statusText}`;
    try {
      // Try to parse a JSON error message from the backend
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage; // Use server's error message if available
    } catch (e) {
      // If parsing JSON fails or there's no JSON body, stick with the original statusText message
    }
    throw new Error(errorMessage);
  }

  return response.json(); // Expected to be an array like [{ date: "YYYY-MM-DD", price: value }, ...]
};

// Future crypto-related frontend service functions can be added here.
// For example:
// export const getCurrentCoinPrice = async (coinId) => { ... };
// export const getHistoricalCoinPrice = async (coinId, date) => { ... };

/**
 * Fetches token holdings for a given wallet address and chain ID.
 * @param {string} walletAddress - The wallet address.
 * @param {string} chainId - The chain ID (e.g., "ethereum").
 * @returns {Promise<Array<object>>} A promise that resolves to an array of token holding objects.
 * @throws {Error} If walletAddress or chainId are not provided, or if the fetch request fails.
 */
export const getWalletTokenHoldings = async (walletAddress, chainId) => {
  if (!walletAddress) {
    throw new Error('Wallet address is required to fetch token holdings.');
  }
  if (!chainId) {
    throw new Error('Chain ID is required to fetch token holdings.');
  }

  const response = await fetch(`${API_BASE_URL}/api/wallet/token-holdings?walletAddress=${encodeURIComponent(walletAddress)}&chainId=${encodeURIComponent(chainId)}`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch token holdings for ${walletAddress} on ${chainId}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch (e) {
      // Stick with the original statusText message
    }
    throw new Error(errorMessage);
  }

  return response.json(); // Expected to be an array of token holding objects
};
