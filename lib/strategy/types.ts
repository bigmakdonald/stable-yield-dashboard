export type RiskLevel = "Conservative" | "Balanced" | "Aggressive";

export type Preferences = {
  risk: RiskLevel;
  chains: number[]; // EVM chainIds
  stables: ("USDC" | "USDT" | "DAI")[];
  minTvlUsd: number;
  maxLockupDays?: number;
  slippageBps: number; // 1% = 100 bps
  exclusions?: { protocols?: string[]; pools?: string[] };
  maxCandidates?: number;
};

export type Candidate = {
  poolId: string;
  chainId: number;
  protocol: string;
  token: "USDC" | "USDT" | "DAI";
  apy: number; // percentage
  tvlUsd: number;
  meta?: Record<string, any>;
};

export type RankedCandidate = Candidate & {
  riskScore: number; // 0 (safer) → 1 (riskier)
  eligible: boolean;
  reasons: string[];
};
