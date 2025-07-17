// frontend/frontend-app/src/services/BudgetPlan.js

const BUDGET_PLAN_KEY_PREFIX = 'budget_plan_';

export const getBudgetPlan = (username) => {
  const key = `${BUDGET_PLAN_KEY_PREFIX}${username}`;
  const plan = localStorage.getItem(key);
  return plan ? JSON.parse(plan) : null;
};

export const saveBudgetPlan = (username, plan) => {
  const key = `${BUDGET_PLAN_KEY_PREFIX}${username}`;
  localStorage.setItem(key, JSON.stringify(plan));
};
