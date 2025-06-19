import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import EscrowABI from '../abis/Escrow.json';
import { DEV_ADDRESSES, DEV_ACCOUNTS } from '../helpers/constants';
import { parseExtensionProof } from '@helpers/types';

type FulfillIntentResult = {
    success: boolean;
    error?: string;
};

const dummyProof = {
  "claim": {
    "provider": "http",
    "parameters": "{\"body\":\"\",\"headers\":{\"User-Agent\":\"reclaim/0.0.1\"},\"method\":\"GET\",\"paramValues\":{\"SENDER_ID\":\"2288142694481920628\"},\"responseMatches\":[{\"type\":\"regex\",\"value\":\"\\\"amount\\\":\\\"- \\\\$(?<amount>[^\\\"]+)\\\"\"},{\"type\":\"regex\",\"value\":\"\\\"date\\\":\\\"(?<date>[^\\\"]+)\\\"\"},{\"type\":\"regex\",\"value\":\"\\\"paymentId\\\":\\\"(?<paymentId>[^\\\"]+)\\\"\"},{\"hash\":true,\"type\":\"regex\",\"value\":\"\\\"id\\\":\\\"(?<receiverId>[^\\\"]+)\\\"\"},{\"type\":\"regex\",\"value\":\"\\\"subType\\\":\\\"none\\\"\"}],\"responseRedactions\":[{\"jsonPath\":\"$.stories[1].amount\",\"xPath\":\"\"},{\"jsonPath\":\"$.stories[1].date\",\"xPath\":\"\"},{\"jsonPath\":\"$.stories[1].paymentId\",\"xPath\":\"\"},{\"jsonPath\":\"$.stories[1].title.receiver.id\",\"xPath\":\"\"},{\"jsonPath\":\"$.stories[1].subType\",\"xPath\":\"\"}],\"url\":\"https://account.venmo.com/api/stories?feedType=me&externalId={{SENDER_ID}}\"}",
    "owner": "0xf9f25d1b846625674901ace47d6313d1ac795265",
    "timestampS": 1749506902,
    "context": "{\"contextAddress\":\"0x0\",\"contextMessage\":\"0x187c5fd6c9c8f9d08b62eaf8c9401b6823eec522e71949e95d722ee327d4af2d\",\"extractedParameters\":{\"SENDER_ID\":\"2288142694481920628\",\"amount\":\"3.00\",\"date\":\"2025-05-30T17:14:46\",\"paymentId\":\"4344101778666770884\",\"receiverId\":\"0x53fb467d4b1468e47c11a7b812ebca06338496451d4e4785d590c69a74fb80ca\"},\"providerHash\":\"0x654a9ad85aef525c1f46ae1003b6fc57f4ad93b1df15b8e05419cf0e285d973c\"}",
    "identifier": "0x3445053bbb13a7a12c344e95db1330548cb0683d241f380e8108ea2abd35f080",
    "epoch": 1
  },
  "signatures": {
    "attestorAddress": "0x0636c417755e3ae25c6c166d181c0607f4c572a3",
    "claimSignature": {
      "0": 204,
      "1": 191,
      "2": 221,
      "3": 66,
      "4": 87,
      "5": 8,
      "6": 244,
      "7": 24,
      "8": 165,
      "9": 142,
      "10": 19,
      "11": 65,
      "12": 181,
      "13": 22,
      "14": 194,
      "15": 120,
      "16": 195,
      "17": 233,
      "18": 208,
      "19": 212,
      "20": 191,
      "21": 206,
      "22": 206,
      "23": 31,
      "24": 223,
      "25": 50,
      "26": 124,
      "27": 218,
      "28": 34,
      "29": 140,
      "30": 211,
      "31": 219,
      "32": 46,
      "33": 58,
      "34": 60,
      "35": 206,
      "36": 21,
      "37": 121,
      "38": 36,
      "39": 22,
      "40": 129,
      "41": 69,
      "42": 66,
      "43": 77,
      "44": 66,
      "45": 124,
      "46": 186,
      "47": 155,
      "48": 12,
      "49": 213,
      "50": 184,
      "51": 53,
      "52": 117,
      "53": 204,
      "54": 119,
      "55": 215,
      "56": 174,
      "57": 246,
      "58": 155,
      "59": 81,
      "60": 35,
      "61": 79,
      "62": 145,
      "63": 170,
      "64": 28
    },
    "resultSignature": {
      "0": 103,
      "1": 56,
      "2": 194,
      "3": 176,
      "4": 200,
      "5": 62,
      "6": 119,
      "7": 150,
      "8": 6,
      "9": 0,
      "10": 10,
      "11": 226,
      "12": 31,
      "13": 125,
      "14": 178,
      "15": 210,
      "16": 93,
      "17": 218,
      "18": 177,
      "19": 24,
      "20": 71,
      "21": 161,
      "22": 83,
      "23": 130,
      "24": 193,
      "25": 14,
      "26": 4,
      "27": 173,
      "28": 46,
      "29": 7,
      "30": 126,
      "31": 84,
      "32": 102,
      "33": 154,
      "34": 203,
      "35": 65,
      "36": 59,
      "37": 221,
      "38": 30,
      "39": 101,
      "40": 184,
      "41": 226,
      "42": 106,
      "43": 69,
      "44": 45,
      "45": 36,
      "46": 57,
      "47": 184,
      "48": 152,
      "49": 195,
      "50": 169,
      "51": 149,
      "52": 240,
      "53": 14,
      "54": 231,
      "55": 182,
      "56": 190,
      "57": 39,
      "58": 139,
      "59": 134,
      "60": 178,
      "61": 93,
      "62": 58,
      "63": 135,
      "64": 27
    }
  }
}

const RPC_URL = 'http://localhost:8545';

const PROOF_ENCODING_STRING = "(tuple(string provider, string parameters, string context) claimInfo, tuple(tuple(bytes32 identifier, address owner, uint32 timestampS, uint32 epoch) claim, bytes[] signatures) signedClaim, bool isAppclipProof)";

const encodeProof = (proof: any) => {
	return ethers.utils.defaultAbiCoder.encode(
		[PROOF_ENCODING_STRING],
		[proof]
	);
};


export const useFulfillIntent = (selectedAccount: keyof typeof DEV_ACCOUNTS) => {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fulfillIntent = useCallback(async (intentHash: string, proxyProof: string): Promise<FulfillIntentResult> => {
        setLoading(true);
        setError(null);

        try {
            const proof = parseExtensionProof(JSON.parse(proxyProof)); // Validate the proof format
            // const proof = parseExtensionProof(dummyProof); // Use dummy proof for testing
            const encodedProof = encodeProof(proof)
            const rpcProvider = new ethers.providers.JsonRpcProvider(RPC_URL);
            const wallet = new ethers.Wallet(DEV_ACCOUNTS[selectedAccount].priv, rpcProvider);
            const escrowContract = new ethers.Contract(
                DEV_ADDRESSES.Escrow,
                EscrowABI.abi,
                wallet
            );

            await escrowContract.fulfillIntent(encodedProof, intentHash);

            setLoading(false);
            return { success: true };
        } catch (err) {
            console.error('Failed to fulfill intent:', err);
            setError('Failed to fulfill intent');
            setLoading(false);
            //@ts-ignore
            return { success: false, error: err.message };
        }
    }, [selectedAccount]);

    return { fulfillIntent, loading, error };
};
