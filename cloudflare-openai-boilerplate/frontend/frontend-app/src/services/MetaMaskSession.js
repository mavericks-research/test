// frontend/frontend-app/src/services/MetaMaskSession.js

const METAMASK_SESSION_KEY = 'metamask_session';

export const getMetaMaskSession = () => {
  const session = localStorage.getItem(METAMASK_SESSION_KEY);
  return session ? JSON.parse(session) : null;
};

export const setMetaMaskSession = (session) => {
  localStorage.setItem(METAMASK_SESSION_KEY, JSON.stringify(session));
};

export const clearMetaMaskSession = () => {
  localStorage.removeItem(METAMASK_SESSION_KEY);
};
