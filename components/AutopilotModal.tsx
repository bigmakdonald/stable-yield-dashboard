"use client"

import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useWallet } from "@/contexts/WalletContext"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

type YieldOption = {
  protocol: string
  token: "USDC" | "USDT" | "DAI"
  apy: number
  apyBase: number
  apyReward: number
  tvlUsd: number
  poolId: string
  source: "aave-v3" | "defillama"
  poolAddress?: string | null
}

type DepositStep = {
  type: "swap" | "approve" | "deposit"
  to: string
  data: string
  value: string
  description: string
  estimatedBuyAmount?: string
  minimumBuyAmount?: string
  chainId?: number
}

export function AutopilotModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { isConnected, address } = useWallet()

  const [asset, setAsset] = useState<"USDC" | "ETH">("USDC")
  const [amount, setAmount] = useState("")
  const [yieldOptions, setYieldOptions] = useState<YieldOption[]>([])
  const [selectedOption, setSelectedOption] = useState<YieldOption | null>(null)
  const [depositSteps, setDepositSteps] = useState<DepositStep[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transactionHashes, setTransactionHashes] = useState<string[]>([])
  const [isDepositing, setIsDepositing] = useState(false)
  const [chainId, setChainId] = useState<number | null>(null)

  const ETHEREUM_CHAIN_ID = 1
  const ETHEREUM_CHAIN_ID_HEX = "0x1"

  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return

    const updateChainId = (chainHex: string) => {
      try {
        const parsed = parseInt(chainHex, 16)
        setChainId(Number.isNaN(parsed) ? null : parsed)
      } catch {
        setChainId(null)
      }
    }

    const fetchChainId = async () => {
      try {
        const currentChain = await window.ethereum!.request({ method: "eth_chainId" })
        updateChainId(currentChain)
      } catch {
        setChainId(null)
      }
    }

    fetchChainId()
    const handler = (newChainId: string) => updateChainId(newChainId)
    window.ethereum.on("chainChanged", handler)
    return () => {
      window.ethereum?.removeListener("chainChanged", handler)
    }
  }, [])

  const ensureEthereumChain = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setError("Ethereum provider not available. Please install MetaMask or another compatible wallet.")
      return false
    }

    try {
      const currentChain = await window.ethereum.request({ method: "eth_chainId" })
      if (currentChain !== ETHEREUM_CHAIN_ID_HEX) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: ETHEREUM_CHAIN_ID_HEX }],
          })
          setChainId(ETHEREUM_CHAIN_ID)
        } catch (switchError: any) {
          setError("Please switch to Ethereum Mainnet to continue with the yield farming flow.")
          return false
        }
      } else {
        setChainId(ETHEREUM_CHAIN_ID)
      }
      return true
    } catch (err: any) {
      setError(err?.message || "Failed to determine current network. Please try again.")
      return false
    }
  }

  const loadYieldOptions = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount")
      return
    }

    setLoadingOptions(true)
    setError(null)
    setYieldOptions([])
    setSelectedOption(null)

    try {
      const r = await fetch(`/api/yield/options?asset=${asset}`)
      const data = await r.json()
      
      if (!r.ok) {
        throw new Error(data.error || "Failed to load yield options")
      }

      if (!data.options || data.options.length === 0) {
        setError("No yield options available. Please try again later.")
        return
      }

      setYieldOptions(data.options)
    } catch (e: any) {
      setError(e?.message || "Failed to load yield options")
    } finally {
      setLoadingOptions(false)
    }
  }

  const prepareDeposit = async () => {
    if (!selectedOption || !isConnected || !address) {
      setError(!isConnected ? "Please connect your wallet first" : "Please select a yield option")
      return
    }

    setError(null)

    const onEthereum = await ensureEthereumChain()
    if (!onEthereum) {
      return
    }

    setLoading(true)
    setDepositSteps([])
    setCurrentStepIndex(0)
    setTransactionHashes([])

    try {
      const r = await fetch("/api/yield/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset,
          token: selectedOption.token,
          amount,
          protocol: selectedOption.protocol,
          poolId: selectedOption.poolId,
          userAddress: address,
          slippageBps: 50,
          chainId: ETHEREUM_CHAIN_ID,
        }),
      })

      const data = await r.json()
      
      if (!r.ok) {
        throw new Error(data.error || "Failed to prepare deposit")
      }

      if (!data.steps || data.steps.length === 0) {
        throw new Error("No deposit steps generated")
      }

      setDepositSteps(data.steps)
    } catch (e: any) {
      setError(e?.message || "Failed to prepare deposit")
    } finally {
      setLoading(false)
    }
  }

  const executeDeposit = async () => {
    if (!depositSteps.length || !isConnected || !address) {
      setError("Deposit not prepared or wallet not connected")
      return
    }

    const onEthereum = await ensureEthereumChain()
    if (!onEthereum) {
      return
    }

    setIsDepositing(true)
    setError(null)
    setCurrentStepIndex(0)
    const hashes: string[] = []

    try {
      for (let i = 0; i < depositSteps.length; i++) {
        setCurrentStepIndex(i)
        const step = depositSteps[i]

        const tx = {
          from: address,
          to: step.to,
          data: step.data,
          value: step.value || "0x0",
          chainId: ETHEREUM_CHAIN_ID_HEX,
        }

        // Send transaction
        const txHash = await (window as any).ethereum.request({
          method: "eth_sendTransaction",
          params: [tx],
        })

        hashes.push(txHash)
        setTransactionHashes([...hashes])

        // Wait for transaction confirmation (optional - can be improved with polling)
        // For now, we'll just wait a bit before next step
        if (i < depositSteps.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000))
        }
      }

      // Success - reset form
      setTimeout(() => {
        setAmount("")
        setSelectedOption(null)
        setDepositSteps([])
        setCurrentStepIndex(0)
        setTransactionHashes([])
        setIsDepositing(false)
      }, 3000)
    } catch (e: any) {
      setError(e?.message || "Transaction failed")
      setIsDepositing(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Yield Farming - Ethereum Mainnet</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Asset Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Asset</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={asset} onValueChange={(v) => {
                setAsset(v as "USDC" | "ETH")
                setYieldOptions([])
                setSelectedOption(null)
              }}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="USDC" id="usdc" />
                  <Label htmlFor="usdc" className="cursor-pointer">USDC</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ETH" id="eth" />
                  <Label htmlFor="eth" className="cursor-pointer">ETH</Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Amount Input */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Amount</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Enter amount in ${asset}`}
                step="0.01"
                min="0"
              />
              <Button
                onClick={loadYieldOptions}
                disabled={loadingOptions || !amount || parseFloat(amount) <= 0}
                className="w-full"
              >
                {loadingOptions ? "Loading Yield Options..." : "Load Yield Options"}
              </Button>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {chainId !== null && chainId !== ETHEREUM_CHAIN_ID && (
            <Alert variant="destructive">
              <AlertDescription>
                ⚠️ You are connected to chain ID {chainId}. Please switch to Ethereum Mainnet before continuing.
              </AlertDescription>
            </Alert>
          )}

          {/* Yield Options */}
          {yieldOptions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Available Yield Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {yieldOptions.map((option, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedOption(option)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedOption?.poolId === option.poolId
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">{option.protocol}</span>
                          <Badge variant="outline">{option.token}</Badge>
                          {option.source === "aave-v3" && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              Aave V3
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="text-2xl font-bold text-green-600">
                            Expected Yield: {option.apy.toFixed(2)}% APY
                          </div>
                          {option.apyReward > 0 && (
                            <div className="text-sm text-muted-foreground">
                              Base: {option.apyBase.toFixed(2)}% + Rewards: {option.apyReward.toFixed(2)}%
                            </div>
                          )}
                          <div className="text-sm text-muted-foreground">
                            TVL: {formatCurrency(option.tvlUsd)}
                          </div>
                        </div>
                      </div>
                      {selectedOption?.poolId === option.poolId && (
                        <div className="text-blue-500">✓</div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Deposit Preparation */}
          {selectedOption && !depositSteps.length && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="p-4 bg-muted/40 rounded-lg">
                    <div className="font-semibold mb-2">Selected Option:</div>
                    <div>{selectedOption.protocol} - {selectedOption.token}</div>
                    <div className="text-green-600 font-semibold mt-1">
                      Expected Yield: {selectedOption.apy.toFixed(2)}% APY
                    </div>
                  </div>
                  <Button
                    onClick={prepareDeposit}
                    disabled={loading || !isConnected}
                    className="w-full"
                  >
                    {loading ? "Preparing Deposit..." : isConnected ? "Prepare Deposit" : "Connect Wallet First"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Deposit Steps Preview */}
          {depositSteps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Deposit Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {depositSteps.map((step, index) => (
                  <div
                    key={index}
                    className={`p-3 border rounded ${
                      index < currentStepIndex
                        ? "bg-green-50 border-green-200"
                        : index === currentStepIndex
                        ? "bg-blue-50 border-blue-200"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {index < currentStepIndex ? "✓" : index === currentStepIndex ? "→" : index + 1}.
                      </span>
                      <span>{step.description}</span>
                    </div>
                    {transactionHashes[index] && (
                      <div className="mt-2 text-sm">
                        <a
                          href={`https://etherscan.io/tx/${transactionHashes[index]}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          View Transaction: {transactionHashes[index].slice(0, 10)}...
                        </a>
                      </div>
                    )}
                  </div>
                ))}
                <Button
                  onClick={executeDeposit}
                  disabled={isDepositing || !isConnected}
                  className="w-full"
                >
                  {isDepositing
                    ? `Executing Step ${currentStepIndex + 1} of ${depositSteps.length}...`
                    : "Execute Deposit"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Success Message */}
          {transactionHashes.length === depositSteps.length && depositSteps.length > 0 && (
            <Alert>
              <AlertDescription>
                ✅ Deposit completed successfully! Your funds are now earning yield.
                {transactionHashes.map((hash, i) => (
                  <div key={i} className="mt-1">
                    <a
                      href={`https://etherscan.io/tx/${hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Transaction {i + 1}: {hash.slice(0, 10)}...{hash.slice(-8)}
                    </a>
                  </div>
                ))}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
