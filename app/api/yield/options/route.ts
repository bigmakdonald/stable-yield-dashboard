import { NextResponse } from "next/server";
import { AAVE_V3_ADDRESSES, POOL_ADDRESSES_PROVIDER_ABI, POOL_ABI, ERC20_ABI, ETHEREUM_CHAIN_ID } from "@/lib/contracts/aave-v3";
import { getTokenAddress, ETH_SENTINEL } from "@/lib/swap-config";
import { toBaseUnits } from "@/lib/utils";
import { encodeFunctionData, parseUnits } from "viem";

export const dynamic = "force-dynamic";

// Fetch Aave V3 yields from DeFiLlama API
async function fetchAaveV3Yields(): Promise<any[]> {
  try {
    const r = await fetch("https://yields.llama.fi/pools", { cache: "no-store" });
    if (!r.ok) return [];
    const raw = await r.json();
    const data = Array.isArray(raw) ? raw : raw?.data ?? [];
    
    // Filter for Aave V3 on Ethereum
    return data.filter((p: any) => {
      const chain = String(p.chain || "").toLowerCase();
      const protocol = String(p.project || "").toLowerCase();
      return chain === "ethereum" && protocol.includes("aave") && protocol.includes("v3");
    });
  } catch (e) {
    console.error("Failed to fetch Aave V3 yields:", e);
    return [];
  }
}

// Fetch fallback yields from DeFiLlama
async function fetchFallbackYields(): Promise<any[]> {
  try {
    const r = await fetch("https://yields.llama.fi/pools", { cache: "no-store" });
    if (!r.ok) return [];
    const raw = await r.json();
    const data = Array.isArray(raw) ? raw : raw?.data ?? [];
    
    // Filter for Ethereum stablecoins
    return data.filter((p: any) => {
      const chain = String(p.chain || "").toLowerCase();
      const symbol = String(p.symbol || "").toUpperCase();
      return chain === "ethereum" && ["USDC", "USDT", "DAI"].includes(symbol);
    });
  } catch (e) {
    console.error("Failed to fetch fallback yields:", e);
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const asset = searchParams.get("asset")?.toUpperCase() || "USDC";

  try {
    // Try to fetch Aave V3 yields first (prevailing yield)
    let aaveYields = await fetchAaveV3Yields();
    
    // If no Aave V3 yields, use fallback
    let yields = aaveYields.length > 0 ? aaveYields : await fetchFallbackYields();
    
    // If still no yields, return empty array (don't show options)
    if (yields.length === 0) {
      return NextResponse.json({ options: [], prioritized: false });
    }

    const options = yields
      .map((p: any) => {
        const symbol = String(p.symbol || "").toUpperCase();
        if (!["USDC", "USDT", "DAI"].includes(symbol)) return null;
        
        const apyBase = Number(p.apyBase ?? 0) || 0;
        const apyReward = Number(p.apyReward ?? 0) || 0;
        const apyNet = apyBase + apyReward;
        
        // Only include if we have yield data
        if (apyNet <= 0) return null;

        return {
          protocol: p.project || "Unknown",
          token: symbol as "USDC" | "USDT" | "DAI",
          apy: apyNet,
          apyBase,
          apyReward,
          tvlUsd: Number(p.tvlUsd ?? 0) || 0,
          poolId: p.pool || "",
          source: aaveYields.length > 0 && p.project?.toLowerCase().includes("aave") ? "aave-v3" : "defillama",
          poolAddress: p.url?.match(/0x[a-fA-F0-9]{40}/)?.[0]?.toLowerCase() || null,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.apy - a.apy); // Sort by APY descending

    return NextResponse.json({
      options,
      prioritized: aaveYields.length > 0,
      updatedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to fetch yield options" },
      { status: 500 }
    );
  }
}

