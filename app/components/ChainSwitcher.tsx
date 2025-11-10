'use client'

import { useAccount, useSwitchChain, useChainId } from 'wagmi'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { isTestnet } from '@/lib/contracts/aave-v3'

const getChainId = (chain: string, testnet: boolean): number => {
  if (testnet) {
    const testnetMap: Record<string, number> = {
      ethereum: 11155111, // Sepolia
      polygon: 80001, // Mumbai
      arbitrum: 421614, // Arbitrum Sepolia
      base: 84532, // Base Sepolia
      optimism: 11155420, // Optimism Sepolia
    };
    return testnetMap[chain] || 11155111;
  } else {
    const mainnetMap: Record<string, number> = {
      ethereum: 1,
      polygon: 137,
      arbitrum: 42161,
      base: 8453,
      optimism: 10,
    };
    return mainnetMap[chain] || 1;
  }
};

const getChainName = (chainId: number, testnet: boolean): string => {
  if (testnet) {
    const testnetMap: Record<number, string> = {
      11155111: 'Ethereum Sepolia',
      80001: 'Polygon Mumbai',
      421614: 'Arbitrum Sepolia',
      84532: 'Base Sepolia',
      11155420: 'Optimism Sepolia',
    };
    return testnetMap[chainId] || 'Unknown';
  } else {
    const mainnetMap: Record<number, string> = {
      1: 'Ethereum',
      137: 'Polygon',
      42161: 'Arbitrum',
      8453: 'Base',
      10: 'Optimism',
    };
    return mainnetMap[chainId] || 'Unknown';
  }
};

export default function ChainSwitcher() {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  if (!isConnected) return null

  const chains = isTestnet
    ? ['ethereum', 'polygon', 'arbitrum', 'base', 'optimism']
    : ['ethereum', 'polygon', 'arbitrum', 'base', 'optimism']

  const currentChainName = getChainName(chainId, isTestnet)

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Network:</span>
      <Select
        value={chainId.toString()}
        onValueChange={(value) => {
          const targetChainId = parseInt(value)
          if (targetChainId !== chainId) {
            switchChain({ chainId: targetChainId })
          }
        }}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue>{currentChainName}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {chains.map((chain) => {
            const chainIdValue = getChainId(chain, isTestnet)
            return (
              <SelectItem key={chain} value={chainIdValue.toString()}>
                {getChainName(chainIdValue, isTestnet)}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}

