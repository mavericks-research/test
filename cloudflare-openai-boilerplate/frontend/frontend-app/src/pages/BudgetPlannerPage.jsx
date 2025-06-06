// frontend/frontend-app/src/pages/BudgetPlannerPage.jsx
import React from 'react';
// Removed NavigationBar import

function BudgetPlannerPage() { // Removed handleLogout from props
  return (
    <div>
      {/* NavigationBar removed from here */}
      <h1>Budgeting Planner Page</h1>
      <p>Plan your crypto spending and saving goals here.</p>
      <div>
        <label htmlFor="budgetName">Budget Name: </label>
        <input type="text" id="budgetName" />
      </div>
      <div>
        <label htmlFor="budgetAmount">Amount (USD): </label>
        <input type="number" id="budgetAmount" />
      </div>
    </div>
  );
}

export default BudgetPlannerPage;
