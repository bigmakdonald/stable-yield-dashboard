"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useWallet } from '@/contexts/WalletContext'
import { Wallet, ExternalLink, Copy, CheckCircle } from 'lucide-react'

export const WalletConnection: React.FC = () => {
  const {
    isConnected,
    address,
    isLoading,
    error,
    connectWallet,
    disconnectWallet,
    isMetaMaskInstalled,
  } = useWallet()

  const [copied, setCopied] = React.useState(false)

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const openMetaMaskInstall = () => {
    window.open('https://metamask.io/download/', '_blank')
  }

  if (!isMetaMaskInstalled) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Wallet className="h-4 w-4" />
            Connect Wallet
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>MetaMask Not Found</DialogTitle>
            <DialogDescription>
              MetaMask is required to connect your wallet. Please install MetaMask to continue.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Button onClick={openMetaMaskInstall} className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Install MetaMask
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (isConnected && address) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            {formatAddress(address)}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wallet Connected</DialogTitle>
            <DialogDescription>
              Your MetaMask wallet is successfully connected.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <Badge variant="secondary" className="gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                Connected
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 p-3 border rounded-md">
              <code className="flex-1 text-sm font-mono">{address}</code>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyAddress}
                className="gap-1"
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button variant="outline" onClick={disconnectWallet}>
              Disconnect Wallet
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Button
      onClick={connectWallet}
      disabled={isLoading}
      variant="outline"
      className="gap-2"
    >
      <Wallet className="h-4 w-4" />
      {isLoading ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  )
}
