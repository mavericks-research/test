// frontend/frontend-app/src/pages/WalletsPage.jsx
import React, { useState, useEffect } from 'react';
import MetaMaskSDK from '@metamask/sdk';
import axios from 'axios';

function WalletsPage() {
  const [walletAddress, setWalletAddress] = useState('');
  const [plaidAccounts, setPlaidAccounts] = useState([]);

  const connectWithMetaMask = async () => {
    const MMSDK = new MetaMaskSDK();
    const ethereum = MMSDK.getProvider();
    const accounts = await ethereum.request({ method: 'eth_requestAccounts', params: [] });
    if (accounts && accounts.length > 0) {
      setWalletAddress(accounts[0]);
    }
  };

  useEffect(() => {
    const fetchPlaidAccounts = async () => {
      try {
        const response = await axios.get('/api/plaid/accounts');
        setPlaidAccounts(response.data.accounts);
      } catch (error) {
        console.error('Error fetching Plaid accounts:', error);
      }
    };
    fetchPlaidAccounts();
  }, []);

  return (
    <div>
      <p>Connect, view, and manage your wallets here.</p>
      <div>
        <label htmlFor="newWalletName">Add New Wallet Name: </label>
        <input type="text" id="newWalletName" />
      </div>
      <div>
        <label htmlFor="newWalletAddress">Wallet Address: </label>
        <input type="text" id="newWalletAddress" placeholder="0x..." value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} />
      </div>
      <button>Add Wallet</button>
      <button onClick={connectWithMetaMask}>Connect with MetaMask</button>

      <h2>Plaid Accounts</h2>
      <ul>
        {plaidAccounts.map((account) => (
          <li key={account.account_id}>
            {account.name} - {account.balances.current} {account.balances.iso_currency_code}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default WalletsPage;
