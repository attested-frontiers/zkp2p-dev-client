import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { DEV_ADDRESSES, DEV_ACCOUNTS, ZERO_ADDRESS } from '@helpers/constants';
import EscrowABI from '../abis/Escrow.json';
import { currencyKeccak256 } from '@helpers/keccack';

const RPC_URL = 'http://localhost:8545';

type AccountName = keyof typeof DEV_ACCOUNTS;

type CreateDepositResult = {
  success: boolean;
  error?: string;
};

const getPayeeDetailsHash = async (receiveTo: string): Promise<string> => {
  const API_KEY = "zkp2p6xKYfbIdv9vmDtT3yqJkJMWyv7QF7dAi8APwxb6Z2pbfZVrJTV3CbwedWKu6Ryn3g38RluroNeT55LqRbj7Fr3O3UKtGGm4F0ioGrIvcHih59o2mNJ1lxtZOP4O";
  const API_URL = "https://api.zkp2p.xyz/v1/makers/create";

  const payload = {
    depositData: {
      venmoUsername: receiveTo,
      telegramUsername: ""
    },
    processorName: "venmo"
  };

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  console.log("Payee details response:", data.responseObject.hashedOnchainId);
  return data.responseObject.hashedOnchainId as string;
}

export const useCreateDeposit = (selectedAccount: AccountName = 'alice') => {
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
      const escrowContract = new ethers.Contract(
        DEV_ADDRESSES.Escrow,
        EscrowABI.abi,
        selectedWallet
      );

      setProvider(rpcProvider);
      setWallet(selectedWallet);
      setContract(escrowContract);
    } catch (err) {
      console.error('Failed to initialize ethers:', err);
      setError('Failed to connect to localhost:8545');
    }
  }, [selectedAccount]);

  const createDeposit = useCallback(async (amount: number, recieveTo: string): Promise<CreateDepositResult> => {
    if (!contract || !wallet) {
      return { success: false, error: 'Contract or wallet not initialized' };
    }

    setLoading(true);
    setError(null);

    try {
      const depositAmount = ethers.utils.parseUnits(amount.toString(), 6);
      const depositRange = {
        min: ethers.utils.parseUnits('0.01', 6),
        max: depositAmount
      };
      const verifierAddress = [DEV_ADDRESSES.verifiers.VenmoReclaimVerifier];
      const verifierData = [{
        // intentGatingService: DEV_ACCOUNTS.gating.pub,
        intentGatingService: ZERO_ADDRESS,
        payeeDetails: await getPayeeDetailsHash(recieveTo),
        data: ethers.utils.defaultAbiCoder.encode(
          ['address[]'],
          [['0x0636c417755E3ae25C6c166D181c0607F4C572A3']]
        )
      }];
      const currency = [[{
        code: currencyKeccak256('USD'),
        conversionRate: ethers.utils.parseUnits('1'),
      }]];
      console.log("Currency", currency);
      const tx = await contract.createDeposit(
        DEV_ADDRESSES.USDC, // token address
        depositAmount,
        depositRange,
        verifierAddress,
        verifierData,
        currency
      );
      await tx.wait();
      return { success: true };
    } catch (err) {
      console.error('Failed to create deposit:', err);
      return { success: false, error: 'Failed to create deposit' };
    } finally {
      setLoading(false);
    }
  }, [contract, wallet]);

  return {
    createDeposit,
    loading,
    error,
    walletAddress: wallet?.address || '',
    isConnected: !!provider && !!wallet && !!contract,
  };
};