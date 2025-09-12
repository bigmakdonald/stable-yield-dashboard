"use client"

import React, { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useSwap } from '@/contexts/SwapContext'
import { useWallet } from '@/contexts/WalletContext'
import { isChainSupported, getChainId } from '@/lib/swap-config'
import { ArrowDown, AlertTriangle, ExternalLink } from 'lucide-react'

export const SwapDrawer: React.FC = () => {
  const {
    isOpen,
    selectedRow,
    sellAmount,
    isLoading,
    error,
    priceData,
    needsApproval,
    closeSwap,
    setSellAmount,
    fetchPrice,
    executeSwap,
    approveToken,
    switchChain,
  } = useSwap()

  const { isConnected, address } = useWallet()
  
  console.log('SwapDrawer wallet state:', { isConnected, address, addressType: typeof address, addressLength: address?.length })

  useEffect(() => {
    if (!sellAmount || parseFloat(sellAmount) <= 0) return
    
    const timer = setTimeout(() => {
      fetchPrice()
    }, 250)

    return () => clearTimeout(timer)
  }, [sellAmount, selectedRow, fetchPrice])

  const handleChainSwitch = async () => {
    if (!selectedRow) return
    
    const chainId = getChainId(selectedRow.chain)
    if (chainId) {
      try {
        await switchChain(chainId)
      } catch (error) {
        console.error('Failed to switch chain:', error)
      }
    }
  }

  const formatAmount = (amount: string, decimals: number = 18) => {
    const num = parseFloat(amount) / Math.pow(10, decimals)
    return num.toFixed(6)
  }

  if (!selectedRow) return null

  const chainSupported = isChainSupported(selectedRow.chain)

  return (
    <Sheet open={isOpen} onOpenChange={closeSwap}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Swap to {selectedRow.stablecoin}</SheetTitle>
          <SheetDescription>
            Swap ETH for {selectedRow.stablecoin} on {selectedRow.chain}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {!chainSupported ? (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Unsupported Chain</span>
              </div>
              <p className="text-sm text-destructive/80 mt-1">
                {selectedRow.chain} is not supported for swaps. Please select a different protocol.
              </p>
            </div>
          ) : !isConnected ? (
            <div className="p-4 bg-muted border rounded-md text-center">
              <p className="text-sm text-muted-foreground">
                Please connect your wallet to continue
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 bg-muted/50 rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{selectedRow.protocol}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedRow.chain} • {selectedRow.stablecoin}
                    </p>
                  </div>
                  <Badge variant="outline">{selectedRow.chain}</Badge>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">You pay</label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={sellAmount}
                      onChange={(e) => setSellAmount(e.target.value)}
                      className="pr-16"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Badge variant="secondary">ETH</Badge>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <ArrowDown className="h-4 w-4 text-muted-foreground" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">You receive</label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="0.0"
                      value={priceData ? formatAmount(priceData.buyAmount, 6) : ''}
                      readOnly
                      className="pr-20"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Badge variant="secondary">{selectedRow.stablecoin}</Badge>
                    </div>
                  </div>
                </div>

                {priceData && (
                  <div className="p-3 bg-muted/30 rounded-md space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Min. received</span>
                      <span>{formatAmount(priceData.minBuyAmount, 6)} {selectedRow.stablecoin}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Price impact</span>
                      <span>{priceData.estimatedPriceImpact ? (parseFloat(priceData.estimatedPriceImpact) * 100).toFixed(2) + '%' : 'N/A'}</span>
                    </div>
                    {!priceData.liquidityAvailable && (
                      <div className="flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="h-3 w-3" />
                        <span className="text-xs">Limited liquidity available</span>
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <div className="space-y-3">
                  {needsApproval && (
                    <Button
                      onClick={approveToken}
                      disabled={isLoading}
                      className="w-full"
                      variant="outline"
                    >
                      {isLoading ? 'Approving...' : 'Approve Token'}
                    </Button>
                  )}

                  <Button
                    onClick={executeSwap}
                    disabled={
                      isLoading ||
                      !sellAmount ||
                      parseFloat(sellAmount) <= 0 ||
                      !priceData ||
                      needsApproval
                    }
                    className="w-full"
                  >
                    {isLoading ? 'Swapping...' : 'Swap'}
                  </Button>

                  <Button
                    onClick={handleChainSwitch}
                    variant="outline"
                    className="w-full gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Switch to {selectedRow.chain}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
