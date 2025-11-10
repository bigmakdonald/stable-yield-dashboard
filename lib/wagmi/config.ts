// lib/wagmi/config.ts
// Wagmi configuration for wallet connection - PUBLIC, no API keys

import { createConfig, http } from 'wagmi';
import { 
  mainnet, 
  polygon, 
  arbitrum, 
  base, 
  optimism,
  sepolia,
  polygonMumbai,
  arbitrumSepolia,
  baseSepolia,
  optimismSepolia,
} from 'wagmi/chains';
import { metaMask, walletConnect } from 'wagmi/connectors';

// WalletConnect Project ID - you can get a free one from https://cloud.walletconnect.com
// For MVP, we'll use a placeholder - users can still use MetaMask
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

// Network mode: 'mainnet' or 'testnet'
const networkMode = (process.env.NEXT_PUBLIC_NETWORK_MODE || 'mainnet') as 'mainnet' | 'testnet';

// Select chains based on network mode
const mainnetChains = [mainnet, polygon, arbitrum, base, optimism] as const;
const testnetChains = [sepolia, polygonMumbai, arbitrumSepolia, baseSepolia, optimismSepolia] as const;
const chains = (networkMode === 'testnet' ? testnetChains : mainnetChains) as unknown as typeof mainnetChains;

export const wagmiConfig = createConfig({
  chains,
  connectors: [
    metaMask(),
    ...(projectId ? [walletConnect({ projectId })] : []),
  ],
  transports: {
    // Mainnet transports
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
    [optimism.id]: http(),
    // Testnet transports
    [sepolia.id]: http(),
    [polygonMumbai.id]: http(),
    [arbitrumSepolia.id]: http(),
    [baseSepolia.id]: http(),
    [optimismSepolia.id]: http(),
  } as any, // Type assertion needed because TypeScript can't infer union of all chain IDs
});

export { chains };
export const isTestnetMode = networkMode === 'testnet';

