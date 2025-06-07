// frontend/frontend-app/src/pages/BudgetPlannerPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import './BudgetPlannerPage.css'; // Import the CSS file

const WORKER_URL = 'https://worker-backend.lumexai.workers.dev'; // Define WORKER_URL locally

const defaultPlanState = {
  id: null,
  name: '',
  monthYear: '',
  categories: [{ id: null, name: '', budgetedAmount: 0, spentAmount: 0 }],
};

function BudgetPlannerPage() {
  const [budgetPlans, setBudgetPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(defaultPlanState);
  const [isEditing, setIsEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBudgetPlans = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${WORKER_URL}/api/budgets`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch budget plans. Server returned an error.' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setBudgetPlans(data);
    } catch (e) {
      console.error("Fetch error:", e);
      setError(e.message || 'Failed to fetch budget plans.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBudgetPlans();
  }, [fetchBudgetPlans]);

  const handleInputChange = (event, categoryIndex = null) => {
    const { name, value } = event.target;
    const val = name === 'budgetedAmount' ? parseFloat(value) : value;

    if (categoryIndex !== null) {
      const updatedCategories = currentPlan.categories.map((category, index) =>
        index === categoryIndex ? { ...category, [name]: val } : category
      );
      setCurrentPlan({ ...currentPlan, categories: updatedCategories });
    } else {
      setCurrentPlan({ ...currentPlan, [name]: val });
    }
  };

  const handleAddCategory = () => {
    setCurrentPlan({
      ...currentPlan,
      categories: [...currentPlan.categories, { id: null, name: '', budgetedAmount: 0, spentAmount: 0 }],
    });
  };

  const handleRemoveCategory = (categoryIndex) => {
    const updatedCategories = currentPlan.categories.filter((_, index) => index !== categoryIndex);
    setCurrentPlan({ ...currentPlan, categories: updatedCategories });
  };

  const handleCreateNewPlanClick = () => {
    setCurrentPlan(defaultPlanState);
    setIsEditing(false);
    setShowForm(true);
    setError(null);
  };

  const handleEditPlanClick = (plan) => {
    const planToEdit = { ...plan, categories: Array.isArray(plan.categories) ? plan.categories : [] };
    if (planToEdit.categories.length === 0) {
        planToEdit.categories.push({ id: null, name: '', budgetedAmount: 0, spentAmount: 0 });
    }
    setCurrentPlan(planToEdit);
    setIsEditing(true);
    setShowForm(true);
    setError(null);
  };

  const handleSavePlan = async () => {
    setIsLoading(true);
    setError(null);
    const method = currentPlan.id ? 'PUT' : 'POST';
    const url = currentPlan.id ? `${WORKER_URL}/api/budgets/${currentPlan.id}` : `${WORKER_URL}/api/budgets`;

    const planToSave = {
        ...currentPlan,
        categories: currentPlan.categories.map(cat => ({
            id: cat.id && !cat.id.startsWith('temp-') ? cat.id : null,
            name: cat.name,
            budgetedAmount: parseFloat(cat.budgetedAmount) || 0,
            spentAmount: parseFloat(cat.spentAmount) || 0
        }))
    };

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(planToSave),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Failed to ${method === 'POST' ? 'create' : 'update'} plan. Server error.` }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      await fetchBudgetPlans();
      handleCancelEdit();
    } catch (e) {
      console.error("Save error:", e);
      setError(e.message || `Failed to ${method === 'POST' ? 'create' : 'update'} plan.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePlan = async (planId) => {
    if (window.confirm("Are you sure you want to delete this budget plan?")) {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${WORKER_URL}/api/budgets/${planId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to delete plan. Server error.' }));
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        await fetchBudgetPlans();
      } catch (e) {
        console.error("Delete error:", e);
        setError(e.message || 'Failed to delete budget plan.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCancelEdit = () => {
    setCurrentPlan(defaultPlanState);
    setIsEditing(false);
    setShowForm(false);
    setError(null);
  };

  const globalLoading = isLoading && !showForm && budgetPlans.length === 0;

  return (
    <div className="budget-planner-page">
      {error && <p className="error-message">Error: {typeof error === 'string' ? error : JSON.stringify(error)}</p>}

      {!showForm && (
        <>
          <button onClick={handleCreateNewPlanClick} disabled={isLoading} className="btn btn-primary">Create New Budget Plan</button>
          <h2>Existing Budget Plans</h2>
          {globalLoading && <p className="loading-indicator">Loading budget plans...</p>}
          {!globalLoading && budgetPlans.length === 0 && <p>No budget plans yet. Create one!</p>}
          <ul className="budget-plans-list">
            {budgetPlans.map((plan) => (
              <li key={plan.id} className="budget-plan-item">
                <h3>{plan.name} ({plan.monthYear})</h3>
                {plan.categories && plan.categories.length > 0 ? (
                  <>
                    <h4>Categories:</h4>
                    <ul>
                      {plan.categories.map((cat) => (
                        <li key={cat.id || `cat-${cat.name}`}>
                          {cat.name}: Budgeted ${cat.budgetedAmount}, Spent ${cat.spentAmount}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : <p>No categories for this plan.</p>}
                <div className="plan-actions">
                  <button onClick={() => handleEditPlanClick(plan)} disabled={isLoading} className="btn btn-edit">Edit</button>
                  <button onClick={() => handleDeletePlan(plan.id)} disabled={isLoading} className="btn btn-danger">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {showForm && (
        <div className="plan-form">
          <h2>{isEditing ? 'Edit Budget Plan' : 'Create New Budget Plan'}</h2>
          {isLoading && <p className="loading-indicator">Saving...</p>}
          <div className="form-group">
            <label htmlFor="name">Plan Name: </label>
            <input
              type="text"
              id="name"
              name="name"
              value={currentPlan.name}
              onChange={handleInputChange}
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="monthYear">Month/Year (YYYY-MM): </label>
            <input
              type="text"
              id="monthYear"
              name="monthYear"
              value={currentPlan.monthYear}
              onChange={handleInputChange}
              placeholder="e.g., 2024-07"
              disabled={isLoading}
            />
          </div>

          <div className="categories-section">
            <h4>Categories</h4>
            {currentPlan.categories.map((category, index) => (
              <div key={category.id || `new-cat-${index}`} className="category-item">
                <div className="form-group">
                  <label htmlFor={`categoryName-${index}`}>Category Name: </label>
                  <input
                    type="text"
                    id={`categoryName-${index}`}
                    name="name"
                    value={category.name}
                    onChange={(e) => handleInputChange(e, index)}
                    disabled={isLoading}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor={`budgetedAmount-${index}`}>Budgeted Amount: </label>
                  <input
                    type="number"
                    id={`budgetedAmount-${index}`}
                    name="budgetedAmount"
                    value={category.budgetedAmount}
                    onChange={(e) => handleInputChange(e, index)}
                    disabled={isLoading}
                  />
                </div>
                <div className="form-group">
                  <span>Spent Amount: ${category.spentAmount || 0} (Read-only)</span>
                </div>
                <button onClick={() => handleRemoveCategory(index)} className="btn btn-danger" disabled={isLoading}>
                  Remove Category
                </button>
              </div>
            ))}
            <button onClick={handleAddCategory} className="btn btn-add-category" disabled={isLoading}>Add Category</button>
          </div>

          <div className="actions-group">
            <button onClick={handleSavePlan} className="btn btn-primary" disabled={isLoading}>
              {isLoading ? (isEditing ? 'Updating...' : 'Saving...') : (isEditing ? 'Update Plan' : 'Save Plan')}
            </button>
            <button onClick={handleCancelEdit} className="btn btn-secondary" style={{ marginLeft: '10px' }} disabled={isLoading}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BudgetPlannerPage;
