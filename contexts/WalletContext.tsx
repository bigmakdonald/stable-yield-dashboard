"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface WalletState {
  isConnected: boolean
  address: string | null
  isLoading: boolean
  error: string | null
}

interface WalletContextType extends WalletState {
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  isMetaMaskInstalled: boolean
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export const useWallet = () => {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    isLoading: false,
    error: null,
  })
  
  // Debug logging removed for performance

  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMetaMaskInstalled(typeof window.ethereum !== 'undefined')
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      // Check if user was previously connected
      const wasConnected = localStorage.getItem('wallet_connected') === 'true'
      console.log('Wallet init - wasConnected:', wasConnected)

      if (wasConnected) {
        console.log('Attempting to restore wallet connection...')
        checkConnection()
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        // Debug logging removed for performance
        if (accounts.length === 0) {
          console.log('Disconnecting wallet - no accounts');
          setWalletState(prev => ({
            ...prev,
            isConnected: false,
            address: null,
            error: null,
          }))
          localStorage.removeItem('wallet_connected')
        } else {
          // Debug logging removed for performance
          setWalletState(prev => ({
            ...prev,
            address: accounts[0],
            isConnected: true,
            error: null,
          }))
          localStorage.setItem('wallet_connected', 'true')
        }
      }

      window.ethereum.on('accountsChanged', handleAccountsChanged)

      return () => {
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged)
      }
    }
  }, [])

  const checkConnection = async () => {
    try {
      const accounts = await window.ethereum!.request({ method: 'eth_accounts' })
      // Debug logging removed for performance
      if (accounts.length > 0) {
        // Debug logging removed for performance
        setWalletState(prev => ({
          ...prev,
          isConnected: true,
          address: accounts[0],
          error: null,
        }))
      } else {
        // If no accounts but user was previously connected, try to request accounts
        const wasConnected = localStorage.getItem('wallet_connected') === 'true'
        if (wasConnected) {
          console.log('No accounts found but user was previously connected, trying to reconnect...')
          try {
            const newAccounts = await window.ethereum!.request({ method: 'eth_requestAccounts' })
            if (newAccounts.length > 0) {
              console.log('Reconnected successfully:', { address: newAccounts[0] });
              setWalletState(prev => ({
                ...prev,
                isConnected: true,
                address: newAccounts[0],
                error: null,
              }))
            }
          } catch (reconnectError) {
            console.log('Reconnect failed, clearing localStorage')
            localStorage.removeItem('wallet_connected')
          }
        }
      }
    } catch (error) {
      console.error('Error checking wallet connection:', error)
    }
  }

  const connectWallet = async () => {
    if (!isMetaMaskInstalled) {
      setWalletState(prev => ({
        ...prev,
        error: 'MetaMask is not installed. Please install MetaMask to continue.',
      }))
      return
    }

    setWalletState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const accounts = await window.ethereum!.request({
        method: 'eth_requestAccounts',
      })

      if (accounts.length > 0) {
        console.log('connectWallet success:', { address: accounts[0], addressType: typeof accounts[0] });
        setWalletState({
          isConnected: true,
          address: accounts[0],
          isLoading: false,
          error: null,
        })
        localStorage.setItem('wallet_connected', 'true')
      }
    } catch (error: any) {
      setWalletState({
        isConnected: false,
        address: null,
        isLoading: false,
        error: error.message || 'Failed to connect wallet',
      })
    }
  }

  const disconnectWallet = () => {
    setWalletState({
      isConnected: false,
      address: null,
      isLoading: false,
      error: null,
    })
    localStorage.removeItem('wallet_connected')
  }

  const value: WalletContextType = {
    ...walletState,
    connectWallet,
    disconnectWallet,
    isMetaMaskInstalled,
  }

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}
