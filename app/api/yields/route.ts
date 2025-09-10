import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Allowlist of stablecoins
const STABLES = new Set(["USDC","USDT","DAI","SDAI","GUSD","TUSD","USDE","FDUSD"]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const minTVL = Number(searchParams.get("minTvl") ?? "0");
  const chains = (searchParams.get("chains") ?? "")
    .split(",").map(s => s.trim()).filter(Boolean).map(s => s.toLowerCase());
  const stables = (searchParams.get("stables") ?? "")
    .split(",").map(s => s.trim().toUpperCase()).filter(Boolean);

  try {
    const r = await fetch("https://yields.llama.fi/pools", { cache: "no-store" });
    if (!r.ok) {
      return NextResponse.json({ error: "Upstream error", status: r.status }, { status: 502 });
    }
    const raw = await r.json();
    const data = Array.isArray(raw) ? raw : raw?.data ?? [];
    const rows = data
      .filter((p: any) => {
        const sym = (p.symbol || "").toUpperCase();
        if (!STABLES.has(sym)) return false;
        if (minTVL && (p.tvlUsd ?? 0) < minTVL) return false;
        if (chains.length && !chains.includes(String(p.chain || "").toLowerCase())) return false;
        if (stables.length && !stables.includes(sym)) return false;
        return true;
      })
      .map((p: any) => ({
        protocol: p.project,
        chain: (p.chain || "").charAt(0).toUpperCase() + (p.chain || "").slice(1).toLowerCase(),
        stablecoin: (p.symbol || "").toUpperCase(),
        apyBase: p.apyBase ?? null,
        apyReward: p.apyReward ?? 0,
        apyNet: (p.apyBase ?? 0) + (p.apyReward ?? 0),
        tvlUsd: p.tvlUsd ?? null,
        link: p.url || p.projectWebsite || `https://defillama.com/yields/pool/${p.pool}`
      }))
      
      .sort((a: any, b: any) => (b.apyNet ?? 0) - (a.apyNet ?? 0));

    return NextResponse.json({ rows, updatedAt: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
