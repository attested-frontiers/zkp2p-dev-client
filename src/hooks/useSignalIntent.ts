import { useState, useEffect, useCallback } from 'react';
import { BigNumber, ethers } from 'ethers';
import EscrowABI from '../abis/Escrow.json';
import { DEV_ADDRESSES, DEV_ACCOUNTS } from '../helpers/constants';
import { currencyKeccak256 } from '@helpers/keccack';
import { generateGatingServiceSignature } from '@helpers/sig';

const RPC_URL = 'http://localhost:8545';

type AccountName = keyof typeof DEV_ACCOUNTS;

type SignalIntentResult = {
  success: boolean;
  error?: string;
};

/**
 * useSignalIntent hook
 * Signals intent to the escrow contract.
 * @returns {Function} signalIntent - Function to signal intent.
 */
const useSignalIntent = (selectedAccount: AccountName = 'alice') => {
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

  const signalIntent = useCallback(async (depositId: string, amount: number): Promise<SignalIntentResult> => {
    if (!contract || !wallet) {
      setError('Contract or wallet not initialized');
      return { success: false, error: 'Contract or wallet not initialized' };
    }

    const currency = currencyKeccak256("USD");
    const amountUnits = ethers.utils.parseUnits(amount.toString(), 6);
    
    console.log("Deposit ID:", depositId);
    console.log("Deposit ID BigNumber:", BigNumber.from(depositId));
    console.log("Amount: ", amount);
    console.log("Amount in units: ", amountUnits.toString());
    console.log("Wallet Address: ", wallet.address);
    console.log("Currency: ", currency);
    console.log("Chain ID: ", await wallet.getChainId());
    console.log("Chain ID BigNumber: ", BigNumber.from(await wallet.getChainId()).toString());


    const gatingSignature = await generateGatingServiceSignature(
        BigNumber.from(depositId),
        amountUnits,
        wallet.address,
        DEV_ADDRESSES.verifiers.VenmoReclaimVerifier,
        currency,
        BigNumber.from(await wallet.getChainId()).toString()
    )

    try {
      setLoading(true);
      const tx = await contract.signalIntent(
        depositId,
        amountUnits, // amount in USDC
        wallet.address,
        DEV_ADDRESSES.verifiers.VenmoReclaimVerifier,
        currencyKeccak256("USD"),
        gatingSignature
    );
      await tx.wait();
      setLoading(false);
      return { success: true };
    } catch (err) {
      console.error('Error signaling intent:', err);
      setLoading(false);
      return { success: false, error: 'Failed to signal intent' };
    }
  }, [contract, wallet]);

  return { signalIntent, loading, error };
};

export default useSignalIntent;
