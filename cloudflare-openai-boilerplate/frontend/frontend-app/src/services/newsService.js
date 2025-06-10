const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Fetches news articles from the backend.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of news articles.
 * @throws {Error} If the fetch request fails or the response is not ok.
 */
export const getNewsArticles = async () => {
  const response = await fetch(`${API_BASE_URL}/api/news`);
  if (!response.ok) {
    let errorMessage = `Failed to fetch news articles: ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch (e) {
      // Ignore if response is not JSON
    }
    throw new Error(errorMessage);
  }
  return response.json();
};
