import React from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const StockHistoricalChart = ({ historicalData, stockName }) => {
  if (!historicalData || historicalData.length === 0) {
    return <p style={{ marginTop: '20px', textAlign: 'center' }}>No historical data available to display for {stockName || 'the selected stock'}.</p>;
  }

  // Recharts typically expects data to be in ascending order by the XAxis key (date).
  // If the data might not be sorted, sort it here. Assuming dates are in "YYYY-MM-DD" format.
  const sortedData = [...historicalData].sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div style={{
      border: '1px solid #eee',
      padding: '20px',
      borderRadius: '5px',
      marginTop: '20px',
      backgroundColor: '#ffffff', // Light background for the chart area
      // overflowX: 'auto' // Removed this
    }}>
      <h4 style={{ textAlign: 'center', marginBottom: '20px' }}>
        Historical Price and Volume for {stockName || 'Selected Stock'}
      </h4>
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart
          data={sortedData}
          margin={{
            top: 5,
            right: 30, // Adjusted margin to accommodate the second Y-axis
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
          <XAxis
            dataKey="date"
            stroke="#333"
            // tickFormatter={(dateStr) => dateStr.substring(5)} // Example: MM-DD
          />
          <YAxis
            yAxisId="left"
            stroke="#007bff"
            domain={['auto', 'auto']}
            tickFormatter={(value) => `$${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
            name="Price"
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#82ca9d"
            dataKey="volume"
            name="Volume"
            tickFormatter={(value) => {
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
              if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
              return value;
            }}
            domain={['auto', 'auto']} // Let Recharts determine domain, or set manually e.g. [0, 'dataMax + 20%']
          />
          <Tooltip
            // formatter can be enhanced if specific formatting per series is needed
            // For now, relying on default behavior which uses the 'name' prop of each series
            labelFormatter={(label) => `Date: ${label}`}
            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: '5px', padding: '10px' }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Line
            type="monotone"
            dataKey="close"
            stroke="#007bff"
            strokeWidth={2}
            yAxisId="left"
            name="Close Price"
            dot={false}
            activeDot={{ r: 6, stroke: '#0056b3', fill: '#007bff' }}
          />
          <Bar
            dataKey="volume"
            yAxisId="right"
            fill="#82ca9d"
            name="Volume"
            barSize={20} // Optional: adjust bar size
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StockHistoricalChart;
