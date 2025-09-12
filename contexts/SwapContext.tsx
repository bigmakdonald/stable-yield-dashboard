"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { useWallet } from './WalletContext'
import { getChainId, getTokenAddress, ETH_SENTINEL, CHAIN_CONFIGS } from '@/lib/swap-config'

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
    
    if (!swapState.selectedRow || !swapState.sellAmount) {
      console.log('fetchPrice validation failed - missing required data:', { 
        hasSelectedRow: !!swapState.selectedRow,
        hasSellAmount: !!swapState.sellAmount
      });
      return
    }
    
    if (!address || !isConnected) {
      console.log('fetchPrice validation failed - wallet not connected:', { 
        hasAddress: !!address,
        isConnected,
        reason: !address ? 'no address' : !isConnected ? 'not connected' : 'unknown'
      });
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
        sellAmount: (parseFloat(swapState.sellAmount) * 1e18).toString(),
        taker: address,
        recipient: address,
      })

      console.log('fetchPrice API params:', { 
        chainId: chainId.toString(),
        sellToken: ETH_SENTINEL,
        buyToken: tokenAddress,
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
    console.log('=== EXECUTE SWAP DEBUG ===');
    console.log('executeSwap called:', { 
      selectedRow: !!swapState.selectedRow, 
      sellAmount: swapState.sellAmount, 
      address, 
      isConnected, 
      addressType: typeof address,
      addressLength: address?.length,
      addressValue: address,
      walletContextAddress: address,
      windowEthereum: typeof window !== 'undefined' ? !!window.ethereum : 'no window',
      currentAccounts: typeof window !== 'undefined' && window.ethereum ? 'checking...' : 'no window'
    });

    // Double-check wallet connection right before swap
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const currentAccounts = await window.ethereum.request({ method: 'eth_accounts' });
        console.log('Current accounts from MetaMask:', { currentAccounts, length: currentAccounts?.length });
        
        if (currentAccounts && currentAccounts.length > 0 && currentAccounts[0] !== address) {
          console.log('WARNING: Address mismatch! Context says:', address, 'MetaMask says:', currentAccounts[0]);
          // Update the context with the actual current address
          // This is a workaround for timing issues
        }
      } catch (error) {
        console.error('Error checking current accounts:', error);
      }
    }
    
    if (!swapState.selectedRow || !swapState.sellAmount) {
      console.log('executeSwap validation failed - missing required data:', { 
        hasSelectedRow: !!swapState.selectedRow,
        hasSellAmount: !!swapState.sellAmount
      });
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
          console.log('Got address directly from MetaMask:', actualAddress);
        }
      } catch (error) {
        console.error('Error getting address from MetaMask:', error);
      }
    }

    if (!actualAddress || !isConnected) {
      console.log('executeSwap validation failed - wallet not connected:', { 
        hasAddress: !!actualAddress,
        isConnected,
        contextAddress: address,
        actualAddress: actualAddress,
        reason: !actualAddress ? 'no address' : !isConnected ? 'not connected' : 'unknown'
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
      const tokenAddress = getTokenAddress(chainId!, swapState.selectedRow.stablecoin)
      
      if (!chainId || !tokenAddress) {
        throw new Error('Unsupported chain or token')
      }

      const sellAmountInWei = (parseFloat(swapState.sellAmount) * 1e18).toString();
      
      const params = new URLSearchParams({
        chainId: chainId.toString(),
        sellToken: ETH_SENTINEL,
        buyToken: tokenAddress,
        sellAmount: sellAmountInWei,
        taker: actualAddress,
        recipient: actualAddress,
      })

      console.log('executeSwap API params:', { 
        chainId: chainId.toString(),
        sellToken: ETH_SENTINEL,
        buyToken: tokenAddress,
        sellAmount: sellAmountInWei,
        sellAmountOriginal: swapState.sellAmount,
        sellAmountParsed: parseFloat(swapState.sellAmount),
        sellAmountInWei: sellAmountInWei,
        stablecoin: swapState.selectedRow.stablecoin,
        taker: actualAddress,
        takerType: typeof actualAddress,
        takerLength: actualAddress?.length
      });

      console.log('Full URL being called:', `/api/0x/quote?${params}`);
      console.log('Params.toString():', params.toString());

      const response = await fetch(`/api/0x/quote?${params}`)
      const data = await response.json()
      
      console.log('API Response status:', response.status);
      console.log('API Response data:', data);
      console.log('Routing info:', {
        sources: data.sources,
        protocols: data.protocols,
        sellTokenSymbol: data.sellTokenSymbol,
        buyTokenSymbol: data.buyTokenSymbol
      });

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get quote')
      }

      console.log('Transaction data from 0x API:', data.transaction);
      console.log('Transaction value (should be sellAmountInWei):', data.transaction?.value);
      console.log('Expected value:', sellAmountInWei);
      console.log('Values match?', data.transaction?.value === sellAmountInWei);
      
      // Ensure the transaction has the correct from address
      const transaction = {
        ...data.transaction,
        from: actualAddress
      };
      
      console.log('Transaction being sent to MetaMask:', transaction);

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
