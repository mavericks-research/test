import React, { useState } from 'react';

const StockSelector = ({ onSymbolSubmit }) => {
  const [symbolInput, setSymbolInput] = useState('');

  const handleSubmit = () => {
    if (symbolInput.trim()) {
      // Convert to uppercase to maintain consistency, as stock symbols are often uppercase.
      onSymbolSubmit(symbolInput.trim().toUpperCase());
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
      <input
        type="text"
        value={symbolInput}
        onChange={(e) => setSymbolInput(e.target.value)}
        onKeyPress={handleKeyPress} // Allow submission on Enter key
        placeholder="Enter stock symbol (e.g., AAPL)"
        style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '16px' }}
      />
      <button
        onClick={handleSubmit}
        style={{
          padding: '10px 15px',
          border: 'none',
          borderRadius: '4px',
          backgroundColor: '#007bff',
          color: 'white',
          fontSize: '16px',
          cursor: 'pointer'
        }}
      >
        Get Stock Data
      </button>
    </div>
  );
};

export default StockSelector;
