import { BigNumber, Wallet, ethers } from "ethers";
import { DEV_ACCOUNTS } from "./constants";

const gatingService = new ethers.Wallet(DEV_ACCOUNTS.gating.priv);

// generate gating service signature
export const generateGatingServiceSignature = async (
    depositId: BigNumber,
    amount: BigNumber,
    to: string,
    verifier: string,
    fiatCurrency: string,
    chainId: string
) => {
    const messageHash = ethers.utils.solidityKeccak256(
        ["uint256", "uint256", "address", "address", "bytes32", "uint256"],
        [depositId, amount, to, verifier, fiatCurrency, chainId]
    );
    return await gatingService.signMessage(ethers.utils.arrayify(messageHash));
}