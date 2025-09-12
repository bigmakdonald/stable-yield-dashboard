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
  1: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  42161: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  10: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
  137: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
  43114: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
  56: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
  59144: "0x176211869cA2b568f2A7D4EE941E073a821EE1ff",
  534352: "0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4",
  5000: "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9",
  81457: "0x4300000000000000000000000000000000000003",
  34443: "0xd988097fb8612cc24eeC14542bC03424c656005f",
};

export const USDT_ADDRESSES: Record<number, string> = {
  1: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  42161: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
  8453: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
  10: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
  137: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
  43114: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
  56: "0x55d398326f99059fF775485246999027B3197955",
  59144: "0x1E4a5963aBFD975d8c9021ce480b433888D1C5a0",
  534352: "0xf55BEC9cafDbE8730f096Aa55dad6D22d44099Df",
  5000: "0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE",
  81457: "0x4300000000000000000000000000000000000003",
  34443: "0x4300000000000000000000000000000000000003",
};

export const DAI_ADDRESSES: Record<number, string> = {
  1: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  42161: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
  8453: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
  10: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
  137: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
  43114: "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70",
  56: "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3",
  59144: "0x4Af15ec2A0BD43Db75dd04E680F31C5d33eAdB65",
  534352: "0xCa14007Eff0dB1f8135f4C25B34De49AB0d42766",
  5000: "0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE",
  81457: "0x4300000000000000000000000000000000000003",
  34443: "0x4300000000000000000000000000000000000003",
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

export function getUSDTAddress(chainId: number): string | null {
  return USDT_ADDRESSES[chainId] || null;
}

export function getDAIAddress(chainId: number): string | null {
  return DAI_ADDRESSES[chainId] || null;
}

export function getTokenAddress(chainId: number, symbol: string): string | null {
  const upperSymbol = symbol.toUpperCase();
  switch (upperSymbol) {
    case 'USDC': return getUSDCAddress(chainId);
    case 'USDT': return getUSDTAddress(chainId);
    case 'DAI': return getDAIAddress(chainId);
    default: return null;
  }
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
