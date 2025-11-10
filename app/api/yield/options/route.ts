import { NextResponse } from "next/server";
import { ETHEREUM_CHAIN_ID } from "@/lib/contracts/aave-v3";

export const dynamic = "force-dynamic";

// Helper function to check if pool is on Ethereum Mainnet
function isEthereumMainnet(pool: any): boolean {
  const chain = String(pool.chain || "").toLowerCase().trim();
  const chainId = pool.chainId ? Number(pool.chainId) : null;
  
  // Explicitly exclude other chains
  const excludedChains = [
    "arbitrum", "arbitrum-one", "arbitrum one",
    "polygon", "polygon-pos", "polygon pos",
    "base", "base-mainnet",
    "optimism", "optimistic-ethereum",
    "avalanche", "avax", "avalanche c-chain",
    "fantom", "ftm",
    "harmony", "harmony-one"
  ];
  
  if (excludedChains.includes(chain)) {
    return false;
  }
  
  // Check for Ethereum Mainnet - must match chain name AND chain ID if available
  const isEthereumChain = chain === "ethereum" || chain === "eth" || chain === "mainnet";
  const isChainId1 = chainId === null || chainId === 1;
  
  return isEthereumChain && isChainId1;
}

// Fetch Aave V3 yields from DeFiLlama API
async function fetchAaveV3Yields(): Promise<any[]> {
  try {
    const r = await fetch("https://yields.llama.fi/pools", { cache: "no-store" });
    if (!r.ok) return [];
    const raw = await r.json();
    const data = Array.isArray(raw) ? raw : raw?.data ?? [];
    
    // Filter for Aave V3 on Ethereum Mainnet only
    return data.filter((p: any) => {
      if (!isEthereumMainnet(p)) return false;
      
      const protocol = String(p.project || "").toLowerCase();
      return protocol.includes("aave") && protocol.includes("v3");
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
    
    // Filter for Ethereum Mainnet USDC pools only
    return data.filter((p: any) => {
      if (!isEthereumMainnet(p)) return false;
      
      const symbol = String(p.symbol || "").toUpperCase();
      return symbol === "USDC";
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
    
    // Double-check all yields are Ethereum Mainnet before mapping
    const ethereumYields = yields.filter((p: any) => isEthereumMainnet(p));
    
    // If still no yields, return empty array (don't show options)
    if (ethereumYields.length === 0) {
      return NextResponse.json({ options: [], prioritized: false });
    }

    const options = ethereumYields
      .map((p: any) => {
        const symbol = String(p.symbol || "").toUpperCase();
        if (symbol !== "USDC") return null;
        
        // Final validation: ensure chain is Ethereum Mainnet
        if (!isEthereumMainnet(p)) return null;
        
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
          chainId: ETHEREUM_CHAIN_ID, // Explicitly set Ethereum Mainnet chain ID
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

