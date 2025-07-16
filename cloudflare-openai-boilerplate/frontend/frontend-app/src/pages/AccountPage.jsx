// frontend/frontend-app/src/pages/AccountPage.jsx
import React from 'react';
import { useAuth } from '../contexts/AuthContext';

function AccountPage() {
  const { user } = useAuth();

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>My Account</h2>
      <p>Email: {user.email}</p>
      {user.name && <p>Name: {user.name}</p>}
      {user.picture && <img src={user.picture} alt="Profile" />}
    </div>
  );
}

export default AccountPage;
