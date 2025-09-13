import riskMeta from "@/lib/protocol-risk.json";
import { CHAIN_MAPPING } from "@/lib/swap-config";
import type { Candidate, Preferences, RankedCandidate } from "./types";

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function protocolRisk(protocol: string): number {
  const entry = (riskMeta as any)?.protocols?.[protocol?.toLowerCase?.() ?? protocol];
  if (!entry) return 0.5; // default medium
  const s = Number(entry.score);
  return Number.isFinite(s) ? clamp01(s) : 0.5;
}

function chainRisk(chainName: string): number {
  const bias = (riskMeta as any)?.chainBias?.[chainName] ?? 0.1;
  const v = Number(bias);
  return Number.isFinite(v) ? clamp01(v) : 0.1;
}

function assetRisk(symbol: string): number {
  switch ((symbol || "").toUpperCase()) {
    case "USDC": return 0.05;
    case "DAI": return 0.08;
    case "USDT": return 0.10;
    default: return 0.12;
  }
}

function tvlRisk(tvlUsd: number): number {
  // Map TVL to risk; ≥$500m => near 0, small TVL => near 1
  const cap = 500_000_000;
  const x = Math.max(0, Math.min(tvlUsd, cap));
  return clamp01(1 - x / cap);
}

function thresholdForRiskLevel(level: Preferences["risk"]): number {
  switch (level) {
    case "Conservative": return 0.4;
    case "Balanced": return 0.6;
    case "Aggressive": return 0.8;
    default: return 0.6;
  }
}

export function scoreCandidate(candidate: Candidate, preferences: Preferences): RankedCandidate {
  const chainName = Object.keys(CHAIN_MAPPING).find(k => CHAIN_MAPPING[k] === candidate.chainId) || "";
  const rTvl = tvlRisk(candidate.tvlUsd);
  const rProt = protocolRisk(candidate.protocol);
  const rChain = chainRisk(chainName);
  const rAsset = assetRisk(candidate.token);

  // Weighted sum
  const riskScore = clamp01(0.5 * rTvl + 0.25 * rProt + 0.15 * rChain + 0.10 * rAsset);

  const reasons: string[] = [];
  if (candidate.tvlUsd < preferences.minTvlUsd) reasons.push(`Below min TVL (${candidate.tvlUsd.toFixed(0)} < ${preferences.minTvlUsd})`);
  const allowedChains = new Set(preferences.chains);
  if (allowedChains.size && !allowedChains.has(candidate.chainId)) reasons.push("Chain not allowed");
  const allowedStables = new Set(preferences.stables.map(s => s.toUpperCase()));
  if (allowedStables.size && !allowedStables.has(candidate.token)) reasons.push("Stable not allowed");
  if (preferences.exclusions?.protocols?.some(p => p.toLowerCase() === candidate.protocol.toLowerCase())) reasons.push("Protocol excluded");
  if (preferences.exclusions?.pools?.some(p => p === candidate.poolId)) reasons.push("Pool excluded");

  const threshold = thresholdForRiskLevel(preferences.risk);
  if (riskScore > threshold) reasons.push(`Risk above threshold (${riskScore.toFixed(2)} > ${threshold})`);

  const eligible = reasons.length === 0;
  return { ...candidate, riskScore, eligible, reasons };
}
