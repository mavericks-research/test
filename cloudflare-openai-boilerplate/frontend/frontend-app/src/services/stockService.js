// Defines the base URL for the API.
// Uses Vite's import.meta.env for environment variables,
// with a fallback to an empty string for local development (uses Vite proxy).
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Fetches the company profile for a given stock symbol.
 * @param {string} symbol - The stock symbol (e.g., "AAPL").
 * @returns {Promise<object>} A promise that resolves to the stock profile data.
 * @throws {Error} If the fetch request fails or the response is not ok.
 */
export const getStockProfile = async (symbol) => {
  const response = await fetch(`${API_BASE_URL}/api/stocks/profile/${symbol}`);
  if (!response.ok) {
    let errorMessage = `Failed to fetch stock profile for ${symbol}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage; // Use server's error message if available
    } catch (e) {
      // Ignore if response is not JSON or another error occurs during error parsing
    }
    throw new Error(errorMessage);
  }
  return response.json();
};

/**
 * Fetches the latest stock quote for a given stock symbol.
 * @param {string} symbol - The stock symbol (e.g., "AAPL").
 * @returns {Promise<object>} A promise that resolves to the stock quote data.
 * @throws {Error} If the fetch request fails or the response is not ok.
 */
export const getStockQuote = async (symbol) => {
  const response = await fetch(`${API_BASE_URL}/api/stocks/quote/${symbol}`);
  if (!response.ok) {
    let errorMessage = `Failed to fetch stock quote for ${symbol}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch (e) {
      // Ignore
    }
    throw new Error(errorMessage);
  }
  return response.json();
};

/**
 * Fetches historical stock data for a given stock symbol.
 * @param {string} symbol - The stock symbol (e.g., "AAPL").
 * @returns {Promise<Array<object>>} A promise that resolves to an array of historical stock data points.
 * @throws {Error} If the fetch request fails or the response is not ok.
 */
export const getStockHistoricalData = async (symbol) => {
  const response = await fetch(`${API_BASE_URL}/api/stocks/historical/${symbol}`);
  if (!response.ok) {
    let errorMessage = `Failed to fetch historical stock data for ${symbol}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch (e) {
      // Ignore
    }
    throw new Error(errorMessage);
  }
  return response.json();
};
