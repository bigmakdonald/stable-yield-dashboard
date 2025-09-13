import { NextResponse } from "next/server";
import { getUSDCAddress, getUSDTAddress, getDAIAddress, ETH_SENTINEL } from "@/lib/swap-config";
import { toBaseUnits } from "@/lib/utils";
import type { ExecutionStep, PlanResponse } from "@/lib/strategy/steps";

export const dynamic = "force-dynamic";

function tokenAddress(chainId: number, symbol: string): string | null {
  switch ((symbol || "").toUpperCase()) {
    case "USDC": return getUSDCAddress(chainId);
    case "USDT": return getUSDTAddress(chainId);
    case "DAI": return getDAIAddress(chainId);
    default: return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const candidate = body?.candidate;
    const amount = String(body?.amount || "1"); // in human units of startAsset
    const startAsset = (body?.startAsset || "ETH").toUpperCase();
    const slippageBps = Number(body?.slippageBps || 50);

    if (!candidate) {
      return NextResponse.json({ error: "Missing candidate" }, { status: 400 });
    }

    const chainId: number = candidate.chainId;
    const buySymbol: "USDC" | "USDT" | "DAI" = (candidate.token || "USDC").toUpperCase();
    const buyTokenAddr = tokenAddress(chainId, buySymbol);
    if (!buyTokenAddr) {
      return NextResponse.json({ error: "Unsupported token for chain" }, { status: 400 });
    }

    // Convert amount
    const sellAmountWei = toBaseUnits(amount, 18); // assume ETH start

    const steps: ExecutionStep[] = [];

    if (startAsset === "ETH") {
      steps.push({
        type: "swap",
        chainId,
        sellToken: ETH_SENTINEL,
        buyToken: buyTokenAddr,
        sellAmountWei,
        // minBuyAmount will be determined client-side by calling /api/0x/price
        minBuyAmountWei: "0",
        slippageBps,
      });
    }

    // Placeholder for approve + deposit steps to be added in P1-C

    const response: PlanResponse = {
      candidate: {
        poolId: candidate.poolId,
        chainId,
        protocol: candidate.protocol,
        token: buySymbol,
        apy: candidate.apy,
        tvlUsd: candidate.tvlUsd,
      },
      steps,
      assumptions: { startAsset: startAsset as any, amountInput: amount, slippageBps },
    };

    return NextResponse.json(response);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const chainId = Number(url.searchParams.get("chainId") || 1);
  const protocol = String(url.searchParams.get("protocol") || "aave-v3");
  const token = String(url.searchParams.get("token") || "USDC");
  const poolId = String(url.searchParams.get("poolId") || "demo");
  const amount = String(url.searchParams.get("amount") || "1");
  const startAsset = String(url.searchParams.get("startAsset") || "ETH");
  const apy = Number(url.searchParams.get("apy") || 0);
  const tvlUsd = Number(url.searchParams.get("tvlUsd") || 0);
  const slippageBps = Number(url.searchParams.get("slippageBps") || 50);

  const candidate = { poolId, chainId, protocol, token, apy, tvlUsd } as any;
  const body = { candidate, amount, startAsset, slippageBps };
  return POST(new Request(req.url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
}
