// lib/wagmi/config.ts
// Wagmi configuration for wallet connection - Ethereum Mainnet only

import { createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { metaMask, walletConnect } from 'wagmi/connectors';

// WalletConnect Project ID - you can get a free one from https://cloud.walletconnect.com
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

export const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [
    metaMask(),
    ...(projectId ? [walletConnect({ projectId })] : []),
  ],
  transports: {
    [mainnet.id]: http(),
  },
});

export const chains = [mainnet] as const;

