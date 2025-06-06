// frontend/frontend-app/src/pages/BudgetPlannerPage.jsx
import React from 'react';
import NavigationBar from '../components/NavigationBar';

function BudgetPlannerPage({ handleLogout }) {
  return (
    <div>
      <NavigationBar handleLogout={handleLogout} />
      <h1>Budgeting Planner Page</h1>
      <p>Plan your crypto spending and saving goals here.</p>
    </div>
  );
}

export default BudgetPlannerPage;
