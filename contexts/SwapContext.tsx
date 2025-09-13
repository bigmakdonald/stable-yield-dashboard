"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { useWallet } from './WalletContext'
import { getChainId, getTokenAddress, ETH_SENTINEL, CHAIN_CONFIGS } from '@/lib/swap-config'
import { toBaseUnits } from '@/lib/utils'

interface SwapState {
  isOpen: boolean;
  selectedRow: any | null;
  sellAmount: string;
  isLoading: boolean;
  error: string | null;
  priceData: any | null;
  needsApproval: boolean;
}

interface SwapContextType extends SwapState {
  openSwap: (rowData: any) => void
  closeSwap: () => void
  setSellAmount: (amount: string) => void
  fetchPrice: () => Promise<void>
  executeSwap: () => Promise<void>
  approveToken: () => Promise<void>
  switchChain: (chainId: number) => Promise<void>
}

const SwapContext = createContext<SwapContextType | undefined>(undefined)

export const useSwap = () => {
  const context = useContext(SwapContext)
  if (context === undefined) {
    throw new Error('useSwap must be used within a SwapProvider')
  }
  return context
}

export const SwapProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { address, isConnected } = useWallet()
  const [swapState, setSwapState] = useState<SwapState>({
    isOpen: false,
    selectedRow: null,
    sellAmount: '',
    isLoading: false,
    error: null,
    priceData: null,
    needsApproval: false,
  })

  const openSwap = (rowData: any) => {
    setSwapState(prev => ({
      ...prev,
      isOpen: true,
      selectedRow: rowData,
      sellAmount: '',
      error: null,
      priceData: null,
      needsApproval: false,
    }))
  }

  const closeSwap = () => {
    setSwapState(prev => ({
      ...prev,
      isOpen: false,
      selectedRow: null,
      sellAmount: '',
      error: null,
      priceData: null,
      needsApproval: false,
    }))
  }

  const setSellAmount = (amount: string) => {
    setSwapState(prev => ({ ...prev, sellAmount: amount }))
  }

  const switchChain = async (chainId: number) => {
    if (!window.ethereum) throw new Error('MetaMask not found')
    
    const chainConfig = CHAIN_CONFIGS[chainId]
    if (!chainConfig) throw new Error('Unsupported chain')

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainConfig.chainId }],
      })
    } catch (error: any) {
      if (error.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [chainConfig],
        })
      } else {
        throw error
      }
    }
  }

  const fetchPrice = async () => {
    if (!swapState.selectedRow || !swapState.sellAmount) {
      return
    }
    
    if (!address || !isConnected) {
      return
    }

    setSwapState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const chainId = getChainId(swapState.selectedRow.chain)
      const tokenAddress = getTokenAddress(chainId!, swapState.selectedRow.stablecoin)
      
      if (!chainId || !tokenAddress) {
        throw new Error('Unsupported chain or token')
      }

      const params = new URLSearchParams({
        chainId: chainId.toString(),
        sellToken: ETH_SENTINEL,
        buyToken: tokenAddress,
        sellAmount: toBaseUnits(swapState.sellAmount, 18),
        taker: address,
        recipient: address,
      })

      const response = await fetch(`/api/0x/price?${params}`)
      const data = await response.json()

      if (!response.ok) {
        console.error('0x API price error response:', data)
        const details = typeof data?.details === 'string' ? data.details : (data?.details ? JSON.stringify(data.details) : '')
        const message = `${data?.error || 'Failed to fetch price'}${details ? ' - ' + details : ''}`
        throw new Error(message)
      }

      setSwapState(prev => ({
        ...prev,
        priceData: data,
        needsApproval: !!data.issues?.allowance,
        isLoading: false,
      }))
    } catch (error: any) {
      setSwapState(prev => ({
        ...prev,
        error: error.message,
        isLoading: false,
      }))
    }
  }

  const approveToken = async () => {
    if (!swapState.priceData?.issues?.allowance || !window.ethereum) return

    setSwapState(prev => ({ ...prev, isLoading: true }))

    try {
      // Get the actual address, fallback to MetaMask if needed
      let actualAddress = address;
      if (!actualAddress) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            actualAddress = accounts[0];
          }
        } catch (error) {
          console.error('Error getting address for approval:', error);
        }
      }

      if (!actualAddress) {
        throw new Error('No wallet address available for approval');
      }

      const { spender, allowance } = swapState.priceData.issues.allowance
      
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: actualAddress,
          to: swapState.priceData.sellTokenAddress,
          data: `0x095ea7b3${spender.slice(2).padStart(64, '0')}${allowance.slice(2).padStart(64, '0')}`,
        }],
      })

      await new Promise(resolve => setTimeout(resolve, 2000))
      await fetchPrice()
    } catch (error: any) {
      setSwapState(prev => ({
        ...prev,
        error: error.message,
        isLoading: false,
      }))
    }
  }

  const executeSwap = async () => {
    if (!swapState.selectedRow || !swapState.sellAmount) {
      setSwapState(prev => ({
        ...prev,
        error: 'Missing required swap data',
        isLoading: false,
      }))
      return
    }
    
    // Try to get address directly from MetaMask if context address is missing
    let actualAddress = address;
    if (!actualAddress && typeof window !== 'undefined' && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) {
          actualAddress = accounts[0];
        }
      } catch (error) {
        console.error('Error getting address from MetaMask:', error);
      }
    }

    if (!actualAddress || !isConnected) {
      setSwapState(prev => ({
        ...prev,
        error: 'Please connect your wallet to continue',
        isLoading: false,
      }))
      return
    }

    setSwapState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const chainId = getChainId(swapState.selectedRow.chain)
      const tokenAddress = getTokenAddress(chainId!, swapState.selectedRow.stablecoin)
      
      if (!chainId || !tokenAddress) {
        throw new Error('Unsupported chain or token')
      }

      const sellAmountInWei = toBaseUnits(swapState.sellAmount, 18);
      
      const params = new URLSearchParams({
        chainId: chainId.toString(),
        sellToken: ETH_SENTINEL,
        buyToken: tokenAddress,
        sellAmount: sellAmountInWei,
        taker: actualAddress,
        recipient: actualAddress,
      })

      const response = await fetch(`/api/0x/quote?${params}`)
      const data = await response.json()
      
      if (!response.ok) {
        console.error('0x API quote error response:', data)
        const details = typeof data?.details === 'string' ? data.details : (data?.details ? JSON.stringify(data.details) : '')
        const message = `${data?.error || 'Failed to get quote'}${details ? ' - ' + details : ''}`
        throw new Error(message)
      }
      
      // Build a sanitized transaction for MetaMask
      // 0x may return decimal strings for numeric fields; MetaMask expects hex quantities
      const sellValueWei = sellAmountInWei
      const transaction = {
        from: actualAddress,
        to: data.transaction?.to,
        data: data.transaction?.data,
        // Always set value explicitly for native sells and convert to hex
        value: (typeof sellValueWei === 'string'
          ? `0x${BigInt(sellValueWei).toString(16)}`
          : `0x${BigInt(String(sellValueWei)).toString(16)}`),
      } as any

      const txHash = await window.ethereum!.request({
        method: 'eth_sendTransaction',
        params: [transaction],
      })

      closeSwap()
    } catch (error: any) {
      setSwapState(prev => ({
        ...prev,
        error: error.message,
        isLoading: false,
      }))
    }
  }

  const value: SwapContextType = {
    ...swapState,
    openSwap,
    closeSwap,
    setSellAmount,
    fetchPrice,
    executeSwap,
    approveToken,
    switchChain,
  }

  return <SwapContext.Provider value={value}>{children}</SwapContext.Provider>
}
