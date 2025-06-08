import React from 'react';

const StockHistoricalChart = ({ historicalData, stockName }) => {
  if (!historicalData || historicalData.length === 0) {
    return <p style={{ marginTop: '10px' }}>No historical data available to display for {stockName || 'the selected stock'}.</p>;
  }

  return (
    <div style={{ border: '1px solid #eee', padding: '15px', borderRadius: '5px', marginTop: '20px' }}>
      <h4>Historical Data Preview for {stockName || 'Selected Stock'}</h4>
      <p>A full chart would typically be displayed here. Below is a preview of the most recent data points:</p>
      <ul style={{ listStyleType: 'none', paddingLeft: '0' }}>
        {historicalData.slice(0, 5).map(dataPoint => (
          <li
            key={dataPoint.date}
            style={{
              padding: '8px 0',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              justifyContent: 'space-between'
            }}
          >
            <span><strong>Date:</strong> {dataPoint.date}</span>
            <span><strong>Close:</strong> ${dataPoint.close ? dataPoint.close.toLocaleString() : 'N/A'}</span>
            <span><strong>Volume:</strong> {dataPoint.volume ? dataPoint.volume.toLocaleString() : 'N/A'}</span>
          </li>
        ))}
        {historicalData.length > 5 && (
          <li style={{paddingTop: '10px', fontStyle: 'italic'}}>And {historicalData.length - 5} more data point(s)...</li>
        )}
      </ul>
      <div style={{ marginTop: '15px', padding: '10px', background: '#f9f9f9', borderRadius: '4px' }}>
        <p><strong>Note:</strong> Full interactive chart rendering would require a charting library (e.g., Recharts, Chart.js).</p>
      </div>
    </div>
  );
};

export default StockHistoricalChart;
