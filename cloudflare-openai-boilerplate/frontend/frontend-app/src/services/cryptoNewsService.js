const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Fetches cryptocurrency news articles from the backend.
 * @param {string} [currencies] - Optional. A comma-separated string of currency symbols (e.g., "BTC,ETH").
 * @returns {Promise<Array<object>>} A promise that resolves to an array of crypto news articles.
 * @throws {Error} If the fetch request fails or the response is not ok.
 */
export const getCryptoNewsArticles = async (currencies) => {
  let url = `${API_BASE_URL}/api/crypto-news`;

  if (currencies && typeof currencies === 'string' && currencies.trim() !== '') {
    // For simple comma-separated values like "BTC,ETH", direct concatenation is generally safe.
    // If currencies could contain special characters, encodeURIComponent(currencies) would be needed.
    url += `?currencies=${currencies}`;
  }

  const response = await fetch(url);

  if (!response.ok) {
    let errorMessage = `Failed to fetch crypto news articles: ${response.status} ${response.statusText}`;
    try {
      // Try to parse a more specific error message from the backend response
      const errorData = await response.json();
      if (errorData && errorData.error) {
        errorMessage = errorData.error;
      }
    } catch (e) {
      // Ignore if the response body is not JSON or cannot be parsed
      console.error('Failed to parse error response JSON:', e);
    }
    throw new Error(errorMessage);
  }

  return response.json();
};
