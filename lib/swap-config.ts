export const ETH_SENTINEL = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

export const CHAIN_MAPPING: Record<string, number> = {
  "Ethereum": 1,
  "Arbitrum": 42161,
  "Base": 8453,
  "Optimism": 10,
  "Polygon": 137,
  "Avalanche": 43114,
  "Bsc": 56,
  "Linea": 59144,
  "Scroll": 534352,
  "Mantle": 5000,
  "Blast": 81457,
  "Mode": 34443,
};

export const USDC_ADDRESSES: Record<number, string> = {
  1: "0xA0b86a33E6441b8C4505B4afDcA7aBB2606C5B4E",
  42161: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  10: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
  137: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  43114: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
  56: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
  59144: "0x176211869cA2b568f2A7D4EE941E073a821EE1ff",
  534352: "0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4",
  5000: "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9",
  81457: "0x4300000000000000000000000000000000000003",
  34443: "0xd988097fb8612cc24eeC14542bC03424c656005f",
};

export const SUPPORTED_CHAINS = new Set(Object.values(CHAIN_MAPPING));

export function isChainSupported(chainName: string): boolean {
  return chainName in CHAIN_MAPPING;
}

export function getChainId(chainName: string): number | null {
  return CHAIN_MAPPING[chainName] || null;
}

export function getUSDCAddress(chainId: number): string | null {
  return USDC_ADDRESSES[chainId] || null;
}

export const CHAIN_CONFIGS: Record<number, any> = {
  1: { 
    chainId: "0x1", 
    chainName: "Ethereum Mainnet",
    rpcUrls: ["https://mainnet.infura.io/v3/"],
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }
  },
  42161: { 
    chainId: "0xa4b1", 
    chainName: "Arbitrum One",
    rpcUrls: ["https://arb1.arbitrum.io/rpc"],
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }
  },
  8453: {
    chainId: "0x2105",
    chainName: "Base",
    rpcUrls: ["https://mainnet.base.org"],
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }
  },
  10: {
    chainId: "0xa",
    chainName: "Optimism",
    rpcUrls: ["https://mainnet.optimism.io"],
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }
  },
  137: {
    chainId: "0x89",
    chainName: "Polygon",
    rpcUrls: ["https://polygon-rpc.com"],
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 }
  }
};
