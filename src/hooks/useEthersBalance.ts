import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { DEV_ADDRESSES, DEV_ACCOUNTS } from '@helpers/constants';
import ERC20MockABI from '../abis/ERC20Mock.json';

const RPC_URL = 'http://localhost:8545';

type AccountName = keyof typeof DEV_ACCOUNTS;

export const useEthersBalance = (selectedAccount: AccountName = 'alice') => {
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.providers.JsonRpcProvider | null>(null);
  const [wallet, setWallet] = useState<ethers.Wallet | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);

  // Initialize provider, wallet, and contract
  useEffect(() => {
    try {
      const rpcProvider = new ethers.providers.JsonRpcProvider(RPC_URL);
      const selectedWallet = new ethers.Wallet(DEV_ACCOUNTS[selectedAccount].priv, rpcProvider);
      const usdcContract = new ethers.Contract(
        DEV_ADDRESSES.USDC,
        ERC20MockABI.abi,
        selectedWallet
      );

      setProvider(rpcProvider);
      setWallet(selectedWallet);
      setContract(usdcContract);
    } catch (err) {
      console.error('Failed to initialize ethers:', err);
      setError('Failed to connect to localhost:8545');
    }
  }, [selectedAccount]);

  const fetchBalance = useCallback(async () => {
    if (!contract || !wallet) {
      setError('Contract or wallet not initialized');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const rawBalance = await contract.balanceOf(wallet.address);
      const decimals = await contract.decimals();
      const formattedBalance = ethers.utils.formatUnits(rawBalance, decimals);
      setBalance(formattedBalance);
    } catch (err) {
      console.error('Failed to fetch balance:', err);
      setError('Failed to fetch balance');
    } finally {
      setLoading(false);
    }
  }, [contract, wallet]);

  // Fetch balance on initialization
  useEffect(() => {
    if (contract && wallet) {
      fetchBalance();
    }
  }, [contract, wallet, fetchBalance]);

  return {
    balance,
    loading,
    error,
    refreshBalance: fetchBalance,
    walletAddress: wallet?.address || '',
    isConnected: !!provider && !!wallet && !!contract,
  };
};
