import { BigNumber } from "ethers";
import { usdcUnits } from "@helpers/units";
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt
export const ZERO = BigNumber.from(0);
export const ZERO_BIGINT = BigInt(0);
export const SECONDS_IN_DAY = BigNumber.from(86400);

// export const DEPOSIT_REFETCH_INTERVAL = 20000; // 0.3 minutes
export const DEPOSIT_REFETCH_INTERVAL = 300000; // 5 minutes
export const DEFAULT_MAX_ORDER_LIMIT = 2500;

export const BASE_CHAIN_ID = 8453;
export const SOLANA_CHAIN_ID = 792703809;
export const ETH_CHAIN_ID = 1;
export const POLYGON_CHAIN_ID = 137;
export const SONIC_CHAIN_ID = 146;
export const TRON_CHAIN_ID = 728126428;
export const BNB_CHAIN_ID = 56;
export const MINIMUM_DEPOSIT_AMOUNT = usdcUnits(0.1);
export const BASE_USDC_ADDRESS = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';

export const PRECISION = BigNumber.from("1000000000000000000"); // 18
export const USDC_UNITS = BigNumber.from("1000000"); // 6
export const PENNY_IN_USDC_UNITS = BigNumber.from("10000"); // 6

export const EMPTY_STRING = '';

export const QUOTE_DEFAULT_ADDRESS = '0x18Cc6F90512C6D95ACA0d57F98C727D61873c06a';
export const QUOTE_DEFAULT_SOL_ADDRESS = '8pHKRNF3u8tndkUJ4euAddNWM9EAMWbUiK5GVmtaGY5U';
export const QUOTE_DEFAULT_TRON_ADDRESS = 'TT2T17KZhoDu47i2E4FWxfG79zdkEWkU9N'; // justin's tron address
export const QUOTE_FETCHING_DEBOUNCE_MS = 750;

// the numeric form of the payload1 passed into the primitive
// corresponds to the openssh signature produced by the following command:
// echo "E PLURIBUS UNUM; DO NOT SHARE" | ssh-keygen -Y sign -n double-blind.xyz -f ~/.ssh/id_rsa | pbcopy
export const MAGIC_DOUBLE_BLIND_BASE_MESSAGE =
    14447023197094784173331616578829287000074783130802912942914027114823662617007553911501158244718575362051758829289159984830457466395841150324770159971462582912755545324694933673046215187947905307019469n;
// Length in bits
export const MAGIC_DOUBLE_BLIND_BASE_MESSAGE_LEN = 672;

export const CIRCOM_FIELD_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
export const MAX_HEADER_PADDED_BYTES = 1024; // NOTE: this must be the same as the first arg in the email in main args circom
export const MAX_BODY_PADDED_BYTES = 6400; // NOTE: this must be the same as the arg to sha the remainder number of bytes in the email in main args circom


export const CLIENT_VERSION = '0.4.4';

// Development contract addresses
export const DEV_ADDRESSES = {
  Escrow: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  Wrapper: '0x09635F643e140090A9A8Dcd712eD6285858ceBef',
  NullifierRegistry: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  verifiers: {
    VenmoReclaimVerifier: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
    RevolutReclaimVerifier: '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853',
    CashappReclaimVerifier: '0x610178dA211FEF7D417bC0e6FeD39F05609AD788',
    WiseReclaimVerifier: '0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82',
    MercadoPagoReclaimVerifier: '0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1',
    ZelleCitiReclaimVerifier: '0xc6e7DF5E7b4f2A278906862b61205850344D4e7d',
    ZelleBoAReclaimVerifier: '0x59b670e9fA9D0A427751Af201D676719a970857b',
    ZelleBaseVerifier: '0x3Aa5ebB10DC797CAC828524e59A333d0A371443c',
  },
  USDC: '0x5FbDB2315678afecb367f032d93F642f64180aa3'
};

export const DEV_ACCOUNTS = {
    alice: {
        priv: "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        pub: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    },
    bob: {
        priv: "59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
        pub: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
    },
    charlie: {
        priv: "5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
        pub: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
    },
    gating: {
        priv: "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6",
        pub: "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720"
    }
}

// circom constants from main.circom / https://zkrepl.dev/?gist=30d21c7a7285b1b14f608325f172417b
// template RSAGroupSigVerify(n, k, levels) {
// component main { public [ modulus ] } = RSAVerify(121, 17);
// component main { public [ root, payload1 ] } = RSAGroupSigVerify(121, 17, 30);
export const CIRCOM_BIGINT_N = 121;
export const CIRCOM_BIGINT_K = 17;
export const CIRCOM_LEVELS = 30;


// This is the string that comes right before the target string in the email. Ideally as close to the end of the email as possible.
export const STRING_PRESELECTOR = "<!-- recipient name -->";


// Misc smart contract values
export const UINT256_MAX = "0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const CALLER_ACCOUNT = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
export const DEFAULT_NETWORK = "base";


// Proving key paths
export const HOSTED_FILES_PATH = "https://s3.amazonaws.com/zk-p2p/v2/v0.0.10/";
export const REGISTRATION_KEY_FILE_NAME = "venmo_registration/venmo_registration";
export const SEND_KEY_FILE_NAME = "venmo_send/venmo_send";

export const RemoteProofGenEmailTypes = {
    REGISTRATION: "registration",
    SEND: "send",
};

const ENABLE_STATE_LOGGING = true;
export const esl = ENABLE_STATE_LOGGING;
