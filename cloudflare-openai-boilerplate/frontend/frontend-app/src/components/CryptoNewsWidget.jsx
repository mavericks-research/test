import React, { useState, useEffect } from 'react';
import { getCryptoNewsArticles } from '../services/cryptoNewsService';

const CryptoNewsWidget = () => {
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterCurrencies, setFilterCurrencies] = useState('');
  const [inputValue, setInputValue] = useState(''); // For controlled input

  useEffect(() => {
    const fetchCryptoNews = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Use filterCurrencies for the API call
        const data = await getCryptoNewsArticles(filterCurrencies.trim());
        setArticles(data);
      } catch (err) {
        setError(err.message || 'Failed to load crypto news.');
        console.error('Error fetching crypto news:', err);
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch news when filterCurrencies changes.
    // This will also run on initial mount with empty filterCurrencies.
    fetchCryptoNews();
  }, [filterCurrencies]); // Dependency array includes filterCurrencies

  const handleFilterChange = (event) => {
    setInputValue(event.target.value);
  };

  const handleFilterSubmit = () => {
    setFilterCurrencies(inputValue); // Update filterCurrencies to trigger useEffect
  };

  const handleClearFilter = () => {
    setInputValue('');
    setFilterCurrencies(''); // Clear filter and fetch all public news
  };

  // Basic styling (can be moved to a CSS file for larger applications)
  const widgetStyle = {
    marginTop: '20px',
    padding: '20px',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
  };

  const filterSectionStyle = {
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  };

  const inputStyle = {
    padding: '8px 10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '0.9em',
    minWidth: '200px',
  };

  const buttonStyle = {
    padding: '8px 15px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#007bff',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.9em',
  };

  const articleCardStyle = {
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '15px',
    backgroundColor: '#f9f9f9',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  };

  const titleStyle = {
    fontSize: '1.1em',
    fontWeight: 'bold',
    marginBottom: '5px',
  };

  const linkStyle = {
    textDecoration: 'none',
    color: '#0056b3', // Darker blue for links
  };

  const sourceStyle = {
    fontSize: '0.9em',
    color: '#555',
    marginBottom: '10px',
  };

  const descriptionStyle = {
    fontSize: '1em',
    color: '#444',
    marginBottom: '10px',
    lineHeight: '1.4',
  };

  return (
    <div style={widgetStyle}>
      <h3>Crypto News</h3>
      <div style={filterSectionStyle}>
        <input
          type="text"
          value={inputValue}
          onChange={handleFilterChange}
          placeholder="Filter by currency (e.g., BTC,ETH)"
          style={inputStyle}
        />
        <button onClick={handleFilterSubmit} style={buttonStyle}>Filter</button>
        <button onClick={handleClearFilter} style={{...buttonStyle, backgroundColor: '#6c757d'}}>Clear</button>
      </div>

      {isLoading && <p>Loading crypto news...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {!isLoading && !error && articles.length === 0 && (
        <p>No crypto news articles available for the current filter or in general.</p>
      )}

      {!isLoading && !error && articles.length > 0 && (
        <div>
          {articles.map((article, index) => (
            <div key={article.url || index} style={articleCardStyle}> {/* Use article.url as key if available and unique */}
              <h4 style={titleStyle}>
                <a href={article.url} target="_blank" rel="noopener noreferrer" style={linkStyle}>
                  {article.title}
                </a>
              </h4>
              <p style={sourceStyle}>
                Source: {article.source} | Published: {new Date(article.publishedAt).toLocaleDateString()}
              </p>
              {article.description && <p style={descriptionStyle}>{article.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CryptoNewsWidget;
