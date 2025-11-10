import { NextResponse } from "next/server";
import { AAVE_V3_ADDRESSES, POOL_ABI, ERC20_ABI, ETHEREUM_CHAIN_ID } from "@/lib/contracts/aave-v3";
import { getTokenAddress, ETH_SENTINEL } from "@/lib/swap-config";
import { toBaseUnits } from "@/lib/utils";
import { encodeFunctionData, parseUnits, createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

export const dynamic = "force-dynamic";

// Create public client for reading contract data
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

// Aave V3 Pool address on Ethereum Mainnet (hardcoded constant)
const POOL_ADDRESS = AAVE_V3_ADDRESSES.ethereum.Pool;

// Get token decimals
async function getTokenDecimals(tokenAddress: string): Promise<number> {
  try {
    const decimals = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'decimals',
    });
    return Number(decimals);
  } catch (e) {
    // Default to 18 if we can't read decimals
    return 18;
  }
}

// Get swap quote from internal 0x API
async function getSwapQuote(
  sellToken: string,
  buyToken: string,
  sellAmount: string,
  slippageBps: number,
  taker: string,
  requestUrl: string
): Promise<any> {
  const params = new URLSearchParams({
    chainId: String(ETHEREUM_CHAIN_ID),
    sellToken,
    buyToken,
    sellAmount,
    slippageBps: String(slippageBps),
    taker,
    recipient: taker,
  });

  // Use the request URL origin to call internal API
  const url = new URL(requestUrl);
  const baseUrl = `${url.protocol}//${url.host}`;
  const apiUrl = `${baseUrl}/api/0x/quote?${params.toString()}`;
  
  const response = await fetch(apiUrl);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(`Swap quote error: ${errorData.error || "Failed to get quote"}`);
  }

  return response.json();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      asset, // 'USDC' or 'ETH'
      token, // 'USDC' | 'USDT' | 'DAI'
      amount, // human-readable amount
      protocol, // protocol name (e.g., 'aave-v3')
      poolId, // pool ID
      userAddress, // user's wallet address
      slippageBps = 50, // slippage in basis points
      chainId, // optional chain ID from frontend
    } = body;

    if (!asset || !token || !amount || !userAddress) {
      return NextResponse.json(
        { error: "Missing required fields: asset, token, amount, userAddress" },
        { status: 400 }
      );
    }

    // Validate we're only processing Ethereum Mainnet (chain ID 1)
    if (chainId && chainId !== ETHEREUM_CHAIN_ID) {
      return NextResponse.json(
        { error: `Only Ethereum Mainnet (chain ID ${ETHEREUM_CHAIN_ID}) is supported. Received chain ID: ${chainId}` },
        { status: 400 }
      );
    }

    // Validate token
    if (!["USDC", "USDT", "DAI"].includes(token.toUpperCase())) {
      return NextResponse.json(
        { error: "Invalid token. Must be USDC, USDT, or DAI" },
        { status: 400 }
      );
    }

    // Get token address - ensure it's Ethereum Mainnet
    const tokenAddress = getTokenAddress(ETHEREUM_CHAIN_ID, token);
    if (!tokenAddress) {
      return NextResponse.json(
        { error: `Token ${token} not supported on Ethereum Mainnet` },
        { status: 400 }
      );
    }
    
    // Verify token address is an Ethereum Mainnet address
    const ethereumTokenAddresses = AAVE_V3_ADDRESSES.ethereum.tokens;
    const isValidEthereumToken = Object.values(ethereumTokenAddresses).includes(tokenAddress as any);
    if (!isValidEthereumToken) {
      return NextResponse.json(
        { error: `Token address ${tokenAddress} is not a valid Ethereum Mainnet address` },
        { status: 400 }
      );
    }

    // Use the hardcoded Aave V3 Pool address
    const poolAddress = POOL_ADDRESS;
    
    // Get token decimals
    const decimals = await getTokenDecimals(tokenAddress);
    const amountWei = parseUnits(amount, decimals);

    const steps: any[] = [];

    // If asset is ETH, we need to swap first
    if (asset.toUpperCase() === "ETH") {
      const sellAmountWei = toBaseUnits(amount, 18); // ETH has 18 decimals
      
      try {
        const swapQuote = await getSwapQuote(
          ETH_SENTINEL,
          tokenAddress,
          sellAmountWei,
          slippageBps,
          userAddress,
          req.url
        );

        steps.push({
          type: "swap",
          to: swapQuote.transaction?.to || swapQuote.to,
          data: swapQuote.transaction?.data || swapQuote.data,
          value: swapQuote.value || `0x${BigInt(sellAmountWei).toString(16)}`,
          description: `Swap ${amount} ETH to ${token}`,
          estimatedBuyAmount: swapQuote.buyAmount || swapQuote.buyTokenAmount,
        });
      } catch (e: any) {
        return NextResponse.json(
          { error: `Failed to get swap quote: ${e.message}` },
          { status: 500 }
        );
      }
    }

    // Approval step (always needed for ERC20 tokens)
    const maxApproval = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    const approveData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [poolAddress as `0x${string}`, maxApproval],
    });

    steps.push({
      type: "approve",
      to: tokenAddress,
      data: approveData,
      value: "0x0",
      description: `Approve ${token} spending`,
    });

    // Deposit step
    const depositData = encodeFunctionData({
      abi: POOL_ABI,
      functionName: 'supply',
      args: [
        tokenAddress as `0x${string}`,
        amountWei,
        userAddress as `0x${string}`,
        0, // referralCode
      ],
    });

    steps.push({
      type: "deposit",
      to: poolAddress,
      data: depositData,
      value: "0x0",
      description: `Deposit ${amount} ${token} to ${protocol}`,
    });

    return NextResponse.json({
      steps,
      expectedYield: null, // Will be provided by options API
      protocol,
      token,
      amount,
    });
  } catch (e: any) {
    console.error("Deposit API error:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to prepare deposit transactions" },
      { status: 500 }
    );
  }
}

