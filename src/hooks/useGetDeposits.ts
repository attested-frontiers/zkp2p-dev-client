import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { DEV_ADDRESSES, DEV_ACCOUNTS } from '../helpers/constants';
import EscrowABI from '../abis/Escrow.json';

const RPC_URL = 'http://localhost:8545';

interface DepositData {
  name: string;
  deposits: any[];
}

const useGetDeposits = () => {
  const [deposits, setDeposits] = useState<DepositData[]>([]);
  const [provider, setProvider] = useState<ethers.providers.JsonRpcProvider | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);

  useEffect(() => {
    try {
      const rpcProvider = new ethers.providers.JsonRpcProvider(RPC_URL);
      const escrowContract = new ethers.Contract(
        DEV_ADDRESSES.Escrow,
        EscrowABI.abi,
        rpcProvider
      );

      setProvider(rpcProvider);
      setContract(escrowContract);
    } catch (err) {
      console.error('Failed to initialize ethers:', err);
    }
  }, []);

  useEffect(() => {
    const fetchDeposits = async () => {
      if (!contract) {
        console.error('Contract not initialized');
        return;
      }

      const depositResults: DepositData[] = [];

      for (const accountName in DEV_ACCOUNTS) {
        const accountAddress = DEV_ACCOUNTS[accountName as keyof typeof DEV_ACCOUNTS].pub;
        try {
          const accountDeposits = await contract.getAccountDeposits(accountAddress);

          if (accountDeposits.length > 0) {
            depositResults.push({
              name: accountName,
              deposits: accountDeposits,
            });
          }
        } catch (err) {
          console.error(`Failed to fetch deposits for ${accountName}:`, err);
        }
      }

      console.log("Deposits fetched:", depositResults);

      setDeposits(depositResults);
    };

    fetchDeposits();
  }, [contract]);

  return deposits;
};

export default useGetDeposits;
