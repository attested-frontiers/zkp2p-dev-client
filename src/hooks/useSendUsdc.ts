import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { DEV_ADDRESSES, DEV_ACCOUNTS } from '@helpers/constants';
import ERC20MockABI from '../abis/ERC20Mock.json';

const RPC_URL = 'http://localhost:8545';

type AccountName = keyof typeof DEV_ACCOUNTS;

type SendUsdcResult = {
  success: boolean;
  error?: string;
};

export const useSendUsdc = (selectedAccount: AccountName = 'alice') => {
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

  const sendUsdc = useCallback(async (recipient: string, amount: number): Promise<SendUsdcResult> => {
    if (!contract || !wallet) {
      return { success: false, error: 'Contract or wallet not initialized' };
    }

    setLoading(true);
    setError(null);

    try {
      const decimals = await contract.decimals();
      const amountInUnits = ethers.utils.parseUnits(amount.toString(), decimals);
      const tx = await contract.transfer(recipient, amountInUnits);
      await tx.wait();
      return { success: true };
    } catch (err) {
      console.error('Failed to send USDC:', err);
      return { success: false, error: 'Failed to send USDC' };
    } finally {
      setLoading(false);
    }
  }, [contract, wallet]);

  return {
    sendUsdc,
    loading,
    error,
    walletAddress: wallet?.address || '',
    isConnected: !!provider && !!wallet && !!contract,
  };
};
