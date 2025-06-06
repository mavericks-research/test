// frontend/frontend-app/src/pages/ReportsPage.jsx
import React from 'react';
import NavigationBar from '../components/NavigationBar';

function ReportsPage({ handleLogout }) {
  return (
    <div>
      <NavigationBar handleLogout={handleLogout} />
      <h1>Reports & Projections Page</h1>
      <p>View AI-generated net worth forecasts, risk assessments, and performance trends.</p>
    </div>
  );
}

export default ReportsPage;
