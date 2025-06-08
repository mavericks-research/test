import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

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
      overflowX: 'auto' // Added this
    }}>
      <h4 style={{ textAlign: 'center', marginBottom: '20px' }}>
        Historical Closing Prices for {stockName || 'Selected Stock'}
      </h4>
      {/* ResponsiveContainer might be removed or adjusted. For fixed width chart,
          LineChart itself gets the width/height directly. */}
      <LineChart
        width={1200} // Example fixed width
        height={400}
        data={sortedData}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
        <XAxis
            dataKey="date"
            stroke="#333"
            // Optional: tickFormatter to shorten date if necessary
            // tickFormatter={(dateStr) => dateStr.substring(5)} // Example: YYYY-MM-DD -> MM-DD
          />
          <YAxis
            stroke="#333"
            domain={['auto', 'auto']}
            // Optional: tickFormatter to add currency, e.g., (value) => `$${value.toFixed(2)}`
            tickFormatter={(value) => `$${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
          />
          <Tooltip
            formatter={(value, name, props) => [`$${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, "Close Price"]}
            labelFormatter={(label) => `Date: ${label}`}
            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: '5px', padding: '10px' }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Line
            type="monotone"
            dataKey="close"
            stroke="#007bff" // Changed stroke color for better visibility
            strokeWidth={2}
            activeDot={{ r: 6, stroke: '#0056b3', fill: '#007bff' }}
            name="Close Price"
            dot={false} // Hides dots on the line for a cleaner look, activeDot shows on hover
          />
        </LineChart>
    </div>
  );
};

export default StockHistoricalChart;
