// lib/contracts/aave-v3.ts
// Aave V3 contract addresses and ABIs - PUBLIC, no API keys required
// Supports both mainnet and testnet

// Export network mode for use in other files
export const isTestnet = (process.env.NEXT_PUBLIC_NETWORK_MODE || 'mainnet') === 'testnet';

// Mainnet addresses
const MAINNET_ADDRESSES = {
  ethereum: {
    PoolAddressesProvider: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2' as const,
    tokens: {
      USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as const,
      USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7' as const,
      DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F' as const,
      USDE: '0x4c9EDD5852cd905f086C759E8383e09bff1E68B3' as const,
    },
  },
  polygon: {
    PoolAddressesProvider: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb' as const,
    tokens: {
      USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as const,
      USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' as const,
      DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063' as const,
    },
  },
  arbitrum: {
    PoolAddressesProvider: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb' as const,
    tokens: {
      USDC: '0xaf88d065e77c8cC2239327C5edb3A432268e5831' as const,
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' as const,
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1' as const,
    },
  },
  base: {
    PoolAddressesProvider: '0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D' as const,
    tokens: {
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const,
    },
  },
  optimism: {
    PoolAddressesProvider: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb' as const,
    tokens: {
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' as const,
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58' as const,
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1' as const,
    },
  },
} as const;

// Testnet addresses (Aave V3 on Sepolia testnets)
const TESTNET_ADDRESSES = {
  ethereum: {
    // Sepolia testnet
    PoolAddressesProvider: '0x012bAC54348C0E635dCAc19D5FB99f06F24136C9A' as const,
    tokens: {
      USDC: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8' as const,
      USDT: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0' as const,
      DAI: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357' as const,
    },
  },
  polygon: {
    // Mumbai testnet - Aave V3 not available, using placeholder
    PoolAddressesProvider: '0x5343b5bA672Ae99d627A1C1A4319C5339c5d5C0C' as const,
    tokens: {
      USDC: '0x0FA8781a83E46826621b3BC094Ea2A0212e71B23' as const,
      USDT: '0xBD21A10F619BE90d6066c941b04e340841F1F989' as const,
    },
  },
  arbitrum: {
    // Arbitrum Sepolia
    PoolAddressesProvider: '0xB25a5D144626a0D488e52AE717A051a2E9997076' as const,
    tokens: {
      USDC: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' as const,
    },
  },
  base: {
    // Base Sepolia - Aave V3 not available, using placeholder
    PoolAddressesProvider: '0x8aF3460B7B8f3F8c3e1F8e8b8F8F8F8F8F8F8F8F' as const,
    tokens: {
      USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const,
    },
  },
  optimism: {
    // Optimism Sepolia - Aave V3 not available, using placeholder
    PoolAddressesProvider: '0x8aF3460B7B8f3F8c3e1F8e8b8F8F8F8F8F8F8F8F' as const,
    tokens: {
      USDC: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7' as const,
    },
  },
} as const;

// Export addresses based on network mode
export const AAVE_V3_ADDRESSES = isTestnet ? TESTNET_ADDRESSES : MAINNET_ADDRESSES;

// Aave V3 PoolAddressesProvider ABI (minimal - just getPool function)
export const POOL_ADDRESSES_PROVIDER_ABI = [
  {
    inputs: [],
    name: 'getPool',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Aave V3 Pool ABI (minimal - supply function)
export const POOL_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'asset', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'address', name: 'onBehalfOf', type: 'address' },
      { internalType: 'uint16', name: 'referralCode', type: 'uint16' },
    ],
    name: 'supply',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// ERC20 ABI (minimal - approve, allowance, balanceOf, decimals)
export const ERC20_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// EIP-2612 Permit ABI (for gas optimization)
export const PERMIT_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'value', type: 'uint256' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
      { internalType: 'uint8', name: 'v', type: 'uint8' },
      { internalType: 'bytes32', name: 'r', type: 'bytes32' },
      { internalType: 'bytes32', name: 's', type: 'bytes32' },
    ],
    name: 'permit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'nonces',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export type SupportedChain = keyof typeof AAVE_V3_ADDRESSES;
export type SupportedToken = 'USDC' | 'USDT' | 'DAI' | 'USDE';

// Helper to get chain ID for both mainnet and testnet
export function getChainId(chain: SupportedChain, isTestnetMode: boolean = isTestnet): number {
  if (isTestnetMode) {
    const testnetChainMap: Record<SupportedChain, number> = {
      ethereum: 11155111, // Sepolia
      polygon: 80001, // Mumbai
      arbitrum: 421614, // Arbitrum Sepolia
      base: 84532, // Base Sepolia
      optimism: 11155420, // Optimism Sepolia
    };
    return testnetChainMap[chain];
  } else {
    const mainnetChainMap: Record<SupportedChain, number> = {
      ethereum: 1,
      polygon: 137,
      arbitrum: 42161,
      base: 8453,
      optimism: 10,
    };
    return mainnetChainMap[chain];
  }
}

