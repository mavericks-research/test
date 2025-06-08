import React from 'react';

const StockQuoteDisplay = ({ quoteData, profileData }) => {
  if (!quoteData) {
    return <p>No quote data to display. Enter a symbol and click "Get Stock Data".</p>;
  }

  // Helper to format numbers with commas or show 'N/A'
  const formatNumber = (num) => num ? num.toLocaleString() : 'N/A';

  // Helper to determine color for changes
  const getChangeColor = (change) => {
    if (change > 0) return 'green';
    if (change < 0) return 'red';
    return 'black'; // Or some default color like grey
  };

  return (
    <div style={{ border: '1px solid #eee', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
      {profileData && profileData.image && (
        <img
          src={profileData.image}
          alt={`${profileData.companyName || quoteData.name} logo`}
          style={{ float: 'right', width: '60px', height: '60px', borderRadius: '50%', marginLeft: '15px' }}
        />
      )}
      <h2>
        {quoteData.name || (profileData && profileData.companyName)} ({quoteData.symbol})
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
        <p><strong>Price:</strong> ${formatNumber(quoteData.price)}</p>
        <p style={{ color: getChangeColor(quoteData.change) }}>
          <strong>Change:</strong> {formatNumber(quoteData.change)} ({quoteData.changesPercentage ? quoteData.changesPercentage.toFixed(2) : 'N/A'}%)
        </p>
        <p><strong>Day Low:</strong> ${formatNumber(quoteData.dayLow)}</p>
        <p><strong>Day High:</strong> ${formatNumber(quoteData.dayHigh)}</p>
        <p><strong>Open:</strong> ${formatNumber(quoteData.open)}</p>
        <p><strong>Previous Close:</strong> ${formatNumber(quoteData.previousClose)}</p>
        <p><strong>Market Cap:</strong> ${formatNumber(quoteData.marketCap)}</p>
        <p><strong>Volume:</strong> {formatNumber(quoteData.volume)}</p>
        <p><strong>Avg. Volume:</strong> {formatNumber(quoteData.avgVolume)}</p>
        <p><strong>Year Low:</strong> ${formatNumber(quoteData.yearLow)}</p>
        <p><strong>Year High:</strong> ${formatNumber(quoteData.yearHigh)}</p>
        {quoteData.exchange && <p><strong>Exchange:</strong> {quoteData.exchange}</p>}
      </div>

      {profileData && profileData.description && (
        <div style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #eee' }}>
          <h4>About {profileData.companyName || quoteData.name}</h4>
          <p>{profileData.description}</p>
          {profileData.industry && <p><strong>Industry:</strong> {profileData.industry}</p>}
          {profileData.sector && <p><strong>Sector:</strong> {profileData.sector}</p>}
          {profileData.website && <p><strong>Website:</strong> <a href={profileData.website} target="_blank" rel="noopener noreferrer">{profileData.website}</a></p>}
        </div>
      )}
    </div>
  );
};

export default StockQuoteDisplay;
