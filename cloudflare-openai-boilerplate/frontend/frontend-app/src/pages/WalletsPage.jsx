// frontend/frontend-app/src/pages/WalletsPage.jsx
import React, { useState } from 'react';
import { ethers } from 'ethers';

function WalletsPage() { // Removed handleLogout from props
  const [walletAddress, setWalletAddress] = useState('');
  const [walletBalance, setWalletBalance] = useState('');
  const [network, setNetwork] = useState('');
  const [ensName, setEnsName] = useState('');

  const connectToMetaMask = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_requestAccounts', []);
        const address = accounts[0];
        setWalletAddress(address);

        const balance = await provider.getBalance(address);
        setWalletBalance(ethers.formatEther(balance));

        const network = await provider.getNetwork();
        setNetwork(network.name);

        const ensName = await provider.lookupAddress(address);
        setEnsName(ensName);
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
          {ensName && <p>ENS Name: {ensName}</p>}
          <p>Balance: {walletBalance ? `${walletBalance} ETH` : 'Loading...'}</p>
          <p>Network: {network}</p>
        </div>
      )}
    </div>
  );
}

export default WalletsPage;
