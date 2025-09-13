import { NextResponse } from "next/server";
import { CHAIN_MAPPING } from "@/lib/swap-config";
import type { Preferences, Candidate, RankedCandidate } from "@/lib/strategy/types";
import { scoreCandidate } from "@/lib/strategy/risk";

export const dynamic = "force-dynamic";

const DEFAULT_PREFS: Preferences = {
  risk: "Conservative",
  chains: [1],
  stables: ["USDC", "USDT", "DAI"],
  minTvlUsd: 5_000_000,
  slippageBps: 50,
  exclusions: { protocols: [], pools: [] },
  maxCandidates: 10,
};

type YieldsRow = {
  protocol: string;
  chain: string; // e.g., "Ethereum"
  stablecoin: "USDC" | "USDT" | "DAI" | string;
  apyBase?: number | null;
  apyReward?: number | null;
  apyNet?: number | null;
  tvlUsd?: number | null;
  poolId: string;
  poolAddress?: string | null;
};

function toCandidate(row: YieldsRow): Candidate | null {
  const chainId = (CHAIN_MAPPING as any)[row.chain];
  if (!chainId) return null;
  const token = (row.stablecoin || "").toUpperCase();
  if (!(token === "USDC" || token === "USDT" || token === "DAI")) return null;
  const apy = Number(row.apyNet ?? row.apyBase ?? 0) || 0;
  const tvlUsd = Number(row.tvlUsd ?? 0) || 0;
  return {
    poolId: row.poolId,
    chainId,
    protocol: (row.protocol || "").toLowerCase(),
    token: token as any,
    apy,
    tvlUsd,
    meta: { chain: row.chain, poolAddress: row.poolAddress },
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const prefs: Preferences = { ...DEFAULT_PREFS, ...(body?.preferences || body) };
    const maxCandidates = Number(prefs.maxCandidates || body?.maxCandidates || 10) || 10;

    const { origin } = new URL(req.url);
    const r = await fetch(`${origin}/api/yields`, { cache: "no-store" });
    if (!r.ok) {
      return NextResponse.json({ error: "Upstream yields error", status: r.status }, { status: 502 });
    }
    const j = await r.json();
    const rows: YieldsRow[] = (Array.isArray(j?.rows) ? j.rows : []) as any[];

    // Map to candidates
    const candidates: Candidate[] = rows
      .map(toCandidate)
      .filter(Boolean) as Candidate[];

    // Score and filter
    const ranked: RankedCandidate[] = candidates
      .map(c => scoreCandidate(c, prefs))
      .filter(rc => rc.eligible)
      .sort((a, b) => {
        const rs = a.riskScore - b.riskScore;
        if (rs !== 0) return rs;
        return (b.apy || 0) - (a.apy || 0);
      })
      .slice(0, maxCandidates);

    return NextResponse.json({
      preferences: prefs,
      count: ranked.length,
      candidates: ranked,
      updatedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const risk = (url.searchParams.get("risk") || "Conservative") as any
  const chains = (url.searchParams.get("chains") || "1")
    .split(",").map(s => Number(s.trim())).filter(Boolean)
  const stables = (url.searchParams.get("stables") || "USDC,USDT,DAI")
    .split(",").map(s => s.trim().toUpperCase())
  const minTvlUsd = Number(url.searchParams.get("minTvlUsd") || 5_000_000)
  const slippageBps = Number(url.searchParams.get("slippageBps") || 50)
  const maxCandidates = Number(url.searchParams.get("maxCandidates") || 10)

  const body = { risk, chains, stables, minTvlUsd, slippageBps, maxCandidates }
  return POST(new Request(req.url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }))
}
