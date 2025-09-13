export type SwapStep = {
  type: "swap";
  chainId: number;
  sellToken: string; // address or ETH sentinel
  buyToken: string;  // address
  sellAmountWei: string; // decimal string (wei)
  minBuyAmountWei: string; // decimal string (wei of buy token)
  slippageBps: number;
};

export type ApproveStep = {
  type: "approve";
  chainId: number;
  token: string;   // ERC20 address
  spender: string; // contract that will spend token
  amountWei: string; // exact amount
};

export type ContractCallStep = {
  type: "contractCall";
  chainId: number;
  to: string;
  data?: string; // optional ABI-encoded call data (filled in P1-C)
  valueHex?: string; // 0x-prefixed if any
  description?: string;
};

export type ExecutionStep = SwapStep | ApproveStep | ContractCallStep;

export type PlanResponse = {
  candidate: {
    poolId: string;
    chainId: number;
    protocol: string;
    token: "USDC" | "USDT" | "DAI";
    apy: number;
    tvlUsd: number;
  };
  steps: ExecutionStep[];
  assumptions: {
    startAsset: "ETH" | "USDC" | "USDT" | "DAI";
    amountInput: string; // human units
    slippageBps: number;
  };
};
