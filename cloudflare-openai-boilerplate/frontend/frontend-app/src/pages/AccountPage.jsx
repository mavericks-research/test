// frontend/frontend-app/src/pages/AccountPage.jsx
import React from 'react';

function AccountPage() {
  return (
    <div>
      <h1>Account</h1>
      <p>Manage your account settings here.</p>
      <div>
        <label htmlFor="username">Username: </label>
        <input type="text" id="username" />
      </div>
      <div>
        <label htmlFor="email">Email: </label>
        <input type="email" id="email" />
      </div>
    </div>
  );
}

export default AccountPage;
