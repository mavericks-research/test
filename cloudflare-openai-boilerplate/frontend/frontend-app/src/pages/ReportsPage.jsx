// frontend/frontend-app/src/pages/ReportsPage.jsx
import React from 'react';
// Removed NavigationBar import

function ReportsPage() { // Removed handleLogout from props
  return (
    <div>
      {/* NavigationBar removed from here */}
      <h1>Reports & Projections Page</h1>
      <p>View AI-generated net worth forecasts, risk assessments, and performance trends.</p>
      <div>
        <label htmlFor="reportType">Report Type: </label>
        <input type="text" id="reportType" list="reportTypes" />
        <datalist id="reportTypes">
          <option value="Net Worth" />
          <option value="Spending by Category" />
        </datalist>
      </div>
    </div>
  );
}

export default ReportsPage;
