import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import EscrowABI from '../abis/Escrow.json';
import { DEV_ADDRESSES, DEV_ACCOUNTS } from '../helpers/constants';

type AccountIntent = {
  amount: string;
  depositId: string;
  intentHash: string;
};

type UseGetAccountIntentsResult = {
  intents: AccountIntent | null;
  loading: boolean;
  error: string | null;
};

const RPC_URL = 'http://localhost:8545';

const useGetAccountIntents = (selectedAccount: keyof typeof DEV_ACCOUNTS): UseGetAccountIntentsResult => {
  const [intents, setIntents] = useState<AccountIntent | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIntents = async () => {
      try {
        const rpcProvider = new ethers.providers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(DEV_ACCOUNTS[selectedAccount].priv, rpcProvider);
        const escrowContract = new ethers.Contract(
          DEV_ADDRESSES.Escrow,
          EscrowABI.abi,
          wallet
        );

        const accountIntents = await escrowContract.getAccountIntent(wallet.address);
        console.log("raw account intents", accountIntents);
        const formattedIntent: AccountIntent = {
            amount: accountIntents.intent.amount.toString(),
            depositId: accountIntents.intent.depositId.toString(),
            intentHash: accountIntents.intentHash.toString()
        };
        console.log("account intents", formattedIntent);


        setIntents(formattedIntent);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch account intents:', err);
        setError('Failed to fetch account intents');
        setLoading(false);
      }
    };

    fetchIntents();
  }, [selectedAccount]);

  return { intents, loading, error };
};

export default useGetAccountIntents;
