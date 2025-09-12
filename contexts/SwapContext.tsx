"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { useWallet } from './WalletContext'
import { getChainId, getUSDCAddress, ETH_SENTINEL, CHAIN_CONFIGS } from '@/lib/swap-config'

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
    console.log('fetchPrice called:', { 
      selectedRow: swapState.selectedRow?.chain, 
      sellAmount: swapState.sellAmount, 
      address, 
      isConnected,
      addressType: typeof address,
      addressLength: address?.length 
    });
    
    if (!swapState.selectedRow || !swapState.sellAmount || !address || !isConnected) {
      console.log('fetchPrice validation failed:', { 
        hasSelectedRow: !!swapState.selectedRow,
        hasSellAmount: !!swapState.sellAmount,
        hasAddress: !!address,
        isConnected,
        reason: !swapState.selectedRow ? 'no selectedRow' : 
                !swapState.sellAmount ? 'no sellAmount' :
                !address ? 'no address' :
                !isConnected ? 'not connected' : 'unknown'
      });
      return
    }

    setSwapState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const chainId = getChainId(swapState.selectedRow.chain)
      const usdcAddress = getUSDCAddress(chainId!)
      
      if (!chainId || !usdcAddress) {
        throw new Error('Unsupported chain')
      }

      const params = new URLSearchParams({
        chainId: chainId.toString(),
        sellToken: ETH_SENTINEL,
        buyToken: usdcAddress,
        sellAmount: (parseFloat(swapState.sellAmount) * 1e18).toString(),
        taker: address,
      })

      console.log('fetchPrice API params:', { 
        chainId: chainId.toString(),
        sellToken: ETH_SENTINEL,
        buyToken: usdcAddress,
        sellAmount: (parseFloat(swapState.sellAmount) * 1e18).toString(),
        taker: address,
        takerType: typeof address,
        takerLength: address?.length
      });

      const response = await fetch(`/api/0x/price?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch price')
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
      const { spender, allowance } = swapState.priceData.issues.allowance
      
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: address,
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
    console.log('executeSwap called:', { 
      selectedRow: !!swapState.selectedRow, 
      sellAmount: swapState.sellAmount, 
      address, 
      isConnected, 
      addressType: typeof address,
      addressLength: address?.length 
    });
    
    if (!swapState.selectedRow || !swapState.sellAmount || !address || !isConnected) {
      console.log('executeSwap validation failed:', { 
        hasSelectedRow: !!swapState.selectedRow,
        hasSellAmount: !!swapState.sellAmount,
        hasAddress: !!address,
        isConnected,
        reason: !swapState.selectedRow ? 'no selectedRow' : 
                !swapState.sellAmount ? 'no sellAmount' :
                !address ? 'no address' :
                !isConnected ? 'not connected' : 'unknown'
      });
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
      const usdcAddress = getUSDCAddress(chainId!)
      
      if (!chainId || !usdcAddress) {
        throw new Error('Unsupported chain')
      }

      const params = new URLSearchParams({
        chainId: chainId.toString(),
        sellToken: ETH_SENTINEL,
        buyToken: usdcAddress,
        sellAmount: (parseFloat(swapState.sellAmount) * 1e18).toString(),
        taker: address,
      })

      console.log('executeSwap API params:', { 
        chainId: chainId.toString(),
        sellToken: ETH_SENTINEL,
        buyToken: usdcAddress,
        sellAmount: (parseFloat(swapState.sellAmount) * 1e18).toString(),
        taker: address,
        takerType: typeof address,
        takerLength: address?.length
      });

      const response = await fetch(`/api/0x/quote?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get quote')
      }

      const txHash = await window.ethereum!.request({
        method: 'eth_sendTransaction',
        params: [data.transaction],
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
