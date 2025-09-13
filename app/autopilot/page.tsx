"use client"

import React, { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useWallet } from "@/contexts/WalletContext"
import { ETH_SENTINEL, CHAIN_MAPPING } from "@/lib/swap-config"

export default function AutopilotPage() {
  const { isConnected, address } = useWallet()

  const [risk, setRisk] = useState("Conservative")
  const [chainId, setChainId] = useState(1)
  const [stable, setStable] = useState("USDC")
  const [amountEth, setAmountEth] = useState("1")
  const [minTvl, setMinTvl] = useState("10000000")
  const [slippageBps, setSlippageBps] = useState("50")

  const [rankResult, setRankResult] = useState<any>(null)
  const [plan, setPlan] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const top = useMemo(() => rankResult?.candidates?.[0] ?? null, [rankResult])

  const runRank = async () => {
    setLoading(true); setError(null)
    try {
      const url = new URL("/api/strategy/rank", window.location.origin)
      url.searchParams.set("risk", risk)
      url.searchParams.set("chains", String(chainId))
      url.searchParams.set("stables", stable)
      url.searchParams.set("minTvlUsd", minTvl || "0")
      url.searchParams.set("slippageBps", slippageBps)
      url.searchParams.set("maxCandidates", "5")
      const r = await fetch(url.toString())
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error || "Failed to rank")
      setRankResult(j)
    } catch (e: any) {
      setError(e?.message || "Failed")
    } finally { setLoading(false) }
  }

  const buildPlan = async () => {
    if (!top) return
    setLoading(true); setError(null)
    try {
      const url = new URL("/api/strategy/plan", window.location.origin)
      url.searchParams.set("chainId", String(top.chainId))
      url.searchParams.set("protocol", top.protocol)
      url.searchParams.set("token", top.token)
      url.searchParams.set("poolId", top.poolId)
      url.searchParams.set("amount", amountEth)
      url.searchParams.set("startAsset", "ETH")
      url.searchParams.set("apy", String(top.apy))
      url.searchParams.set("tvlUsd", String(top.tvlUsd))
      url.searchParams.set("slippageBps", slippageBps)
      const r = await fetch(url.toString())
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error || "Failed to plan")
      setPlan(j)
    } catch (e: any) {
      setError(e?.message || "Failed")
    } finally { setLoading(false) }
  }

  const executeFirstSwap = async () => {
    if (!plan?.steps?.length || !isConnected || !address) {
      setError(!isConnected ? "Connect wallet first" : "No plan available")
      return
    }
    const step = plan.steps[0]
    if (step.type !== "swap") { setError("First step is not a swap"); return }

    try {
      setLoading(true); setError(null)
      const params = new URLSearchParams({
        chainId: String(step.chainId),
        sellToken: step.sellToken,
        buyToken: step.buyToken,
        sellAmount: step.sellAmountWei,
        slippageBps: String(step.slippageBps || slippageBps || "50"),
        taker: address!,
        recipient: address!,
      })
      // Optional: preview
      await fetch(`/api/0x/price?${params}`).then(r=>r.json())
      // Executable quote
      const quote = await fetch(`/api/0x/quote?${params}`).then(r=>r.json())
      if (quote?.error) throw new Error(quote.error)

      const tx = {
        from: address!,
        to: quote.transaction.to,
        data: quote.transaction.data,
        value: '0x' + BigInt(step.sellAmountWei).toString(16),
      } as any
      const txHash = await (window as any).ethereum.request({ method: 'eth_sendTransaction', params: [tx] })
      console.log('Swap sent', txHash)
    } catch (e: any) {
      setError(e?.message || 'Swap failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Autopilot Strategy Builder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm">Risk</label>
              <Select value={risk} onValueChange={setRisk}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Conservative">Conservative</SelectItem>
                  <SelectItem value="Balanced">Balanced</SelectItem>
                  <SelectItem value="Aggressive">Aggressive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm">Chain</label>
              <Select value={String(chainId)} onValueChange={(v)=>setChainId(Number(v))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CHAIN_MAPPING).map(([name,id])=> (
                    <SelectItem key={name} value={String(id)}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm">Stable</label>
              <Select value={stable} onValueChange={setStable}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USDC">USDC</SelectItem>
                  <SelectItem value="USDT">USDT</SelectItem>
                  <SelectItem value="DAI">DAI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm">Min TVL (USD)</label>
              <Input value={minTvl} onChange={e=>setMinTvl(e.target.value)} />
            </div>
            <div>
              <label className="text-sm">Amount (ETH)</label>
              <Input value={amountEth} onChange={e=>setAmountEth(e.target.value)} />
            </div>
            <div>
              <label className="text-sm">Slippage (bps)</label>
              <Input value={slippageBps} onChange={e=>setSlippageBps(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={runRank} disabled={loading}>Find Strategy</Button>
            <Button onClick={buildPlan} disabled={loading || !top}>Build Plan</Button>
            <Button onClick={executeFirstSwap} disabled={loading || !plan || !isConnected}>Execute Swap</Button>
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
        </CardContent>
      </Card>

      {rankResult && (
        <Card>
          <CardHeader><CardTitle>Top Candidate</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(rankResult.candidates?.[0], null, 2)}</pre>
          </CardContent>
        </Card>
      )}

      {plan && (
        <Card>
          <CardHeader><CardTitle>Plan</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(plan, null, 2)}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
