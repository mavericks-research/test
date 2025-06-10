import React, { useState, useEffect } from 'react';
import { getNewsArticles } from '../services/newsService';

const NewsWidget = () => {
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNews = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getNewsArticles();
        setArticles(data);
      } catch (err) {
        setError(err.message || 'Failed to load news.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNews();
  }, []);

  const articleCardStyle = {
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '15px',
    backgroundColor: '#f9f9f9', // Light background for the card
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  };

  const titleStyle = {
    fontSize: '1.1em',
    fontWeight: 'bold',
    marginBottom: '5px',
    color: '#333'
  };

  const sourceStyle = {
    fontSize: '0.9em',
    color: '#555',
    marginBottom: '10px'
  };

  const descriptionStyle = {
    fontSize: '1em',
    color: '#444',
    marginBottom: '10px',
    lineHeight: '1.4'
  };

  const imageStyle = {
    maxWidth: '100%',
    height: 'auto',
    borderRadius: '4px',
    marginBottom: '10px'
  };

  if (isLoading) {
    return <p>Loading news...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>Error loading news: {error}</p>;
  }

  if (!articles || articles.length === 0) {
    return <p>No news articles available at the moment.</p>;
  }

  return (
    <div style={{ marginTop: '20px' }}>
      <h3>Latest Business News</h3>
      {articles.map((article, index) => (
        <div key={index} style={articleCardStyle}>
          {article.imageUrl && <img src={article.imageUrl} alt={article.title} style={imageStyle} />}
          <h4 style={titleStyle}>
            <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
              {article.title}
            </a>
          </h4>
          <p style={sourceStyle}>
            Source: {article.source} | Published: {new Date(article.publishedAt).toLocaleDateString()}
          </p>
          <p style={descriptionStyle}>{article.description}</p>
        </div>
      ))}
    </div>
  );
};

export default NewsWidget;
