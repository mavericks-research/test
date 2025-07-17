// frontend/frontend-app/src/pages/WalletsPage.jsx
import React, { useState } from 'react';
// Removed NavigationBar import

function WalletsPage() { // Removed handleLogout from props
  const [walletAddress, setWalletAddress] = useState('');
  const [walletBalance, setWalletBalance] = useState('');

  const connectToMetaMask = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const address = accounts[0];
        setWalletAddress(address);

        const balance = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [address, 'latest'],
        });
        setWalletBalance(balance);
      } catch (error) {
        console.error('Error connecting to MetaMask:', error);
      }
    } else {
      alert('MetaMask is not installed. Please install it to use this feature.');
    }
  };

  return (
    <div>
      {/* NavigationBar removed from here */}
      <p>Connect, view, and manage your wallets here.</p>
      <div>
        <label htmlFor="newWalletName">Add New Wallet Name: </label>
        <input type="text" id="newWalletName" />
      </div>
      <div>
        <label htmlFor="newWalletAddress">Wallet Address: </label>
        <input type="text" id="newWalletAddress" placeholder="0x..." />
      </div>
      <button>Add Wallet</button>
      <hr />
      <h3>Connect with MetaMask</h3>
      <button onClick={connectToMetaMask}>Connect to MetaMask</button>
      {walletAddress && (
        <div>
          <p>Connected Wallet: {walletAddress}</p>
          <p>Balance: {walletBalance ? `${(parseInt(walletBalance) / 1e18).toFixed(4)} ETH` : 'Loading...'}</p>
        </div>
      )}
    </div>
  );
}

export default WalletsPage;
