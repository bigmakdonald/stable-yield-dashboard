import { NextResponse } from "next/server";
import { AAVE_V3_ADDRESSES, POOL_ABI, ERC20_ABI, ETHEREUM_CHAIN_ID } from "@/lib/contracts/aave-v3";
import { getTokenAddress } from "@/lib/swap-config";
import { toBaseUnits } from "@/lib/utils";
import { encodeFunctionData, parseUnits, createPublicClient, http, formatUnits } from "viem";
import { mainnet } from "viem/chains";

export const dynamic = "force-dynamic";

// Create public client for reading contract data
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

// Aave V3 Pool address on Ethereum Mainnet (hardcoded constant)
const POOL_ADDRESS = AAVE_V3_ADDRESSES.ethereum.Pool;
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as const;
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564' as const;
const UNISWAP_V3_QUOTER = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e' as const;
const UNISWAP_FEE_TIER = 500; // 0.05% pool for WETH/USDC
const DEFAULT_DEADLINE_SECONDS = 60 * 30; // 30 minutes

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

const UNISWAP_QUOTER_ABI = [
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'tokenIn', type: 'address' },
          { internalType: 'address', name: 'tokenOut', type: 'address' },
          { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
          { internalType: 'uint256', name: 'sqrtPriceLimitX96', type: 'uint256' },
          { internalType: 'uint24', name: 'fee', type: 'uint24' },
        ],
        internalType: 'struct IQuoterV2.QuoteExactInputSingleParams',
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'quoteExactInputSingle',
    outputs: [
      { internalType: 'uint256', name: 'amountOut', type: 'uint256' },
      { internalType: 'uint160', name: 'sqrtPriceX96After', type: 'uint160' },
      { internalType: 'uint32', name: 'initializedTicksCrossed', type: 'uint32' },
      { internalType: 'uint256', name: 'gasEstimate', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

const UNISWAP_ROUTER_ABI = [
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'tokenIn', type: 'address' },
          { internalType: 'address', name: 'tokenOut', type: 'address' },
          { internalType: 'uint24', name: 'fee', type: 'uint24' },
          { internalType: 'address', name: 'recipient', type: 'address' },
          { internalType: 'uint256', name: 'deadline', type: 'uint256' },
          { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
          { internalType: 'uint256', name: 'amountOutMinimum', type: 'uint256' },
          { internalType: 'uint160', name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
        internalType: 'struct ISwapRouter.ExactInputSingleParams',
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'exactInputSingle',
    outputs: [{ internalType: 'uint256', name: 'amountOut', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

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
    
    // Verify token address is an Ethereum Mainnet address (case-insensitive comparison)
    const ethereumTokenAddresses = AAVE_V3_ADDRESSES.ethereum.tokens;
    const normalizedTokenAddress = tokenAddress.toLowerCase();
    const normalizedEthereumAddresses = Object.values(ethereumTokenAddresses).map(addr => String(addr).toLowerCase());
    const isValidEthereumToken = normalizedEthereumAddresses.includes(normalizedTokenAddress);
    
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

    const steps: any[] = [];
    let depositAmountWei: bigint;

    // If asset is ETH, we need to swap first (only USDC target is currently supported)
    if (asset.toUpperCase() === "ETH") {
      if (token.toUpperCase() !== "USDC") {
        return NextResponse.json(
          { error: "ETH entry is only supported for USDC pools at the moment." },
          { status: 400 }
        );
      }

      const amountInWei = toBaseUnits(amount, 18); // ETH has 18 decimals

      if (amountInWei <= 0n) {
        return NextResponse.json(
          { error: "Swap amount must be greater than zero." },
          { status: 400 }
        );
      }

      try {
        const quoteResult = await publicClient.readContract({
          address: UNISWAP_V3_QUOTER,
          abi: UNISWAP_QUOTER_ABI,
          functionName: 'quoteExactInputSingle',
          args: [{
            tokenIn: WETH_ADDRESS,
            tokenOut: tokenAddress as `0x${string}`,
            amountIn: amountInWei,
            sqrtPriceLimitX96: 0n,
            fee: UNISWAP_FEE_TIER,
          }],
        }) as readonly [bigint, bigint, number, bigint];

        const expectedAmountOut = quoteResult[0];

        if (expectedAmountOut <= 0n) {
          return NextResponse.json(
            { error: "Unable to fetch a valid quote for ETH to USDC swap." },
            { status: 400 }
          );
        }

        const slippage = BigInt(slippageBps);
        let minimumAmountOut = expectedAmountOut - (expectedAmountOut * slippage) / 10_000n;
        if (minimumAmountOut < 0n) {
          minimumAmountOut = 0n;
        }

        const deadline = BigInt(Math.floor(Date.now() / 1000) + DEFAULT_DEADLINE_SECONDS);

        const swapData = encodeFunctionData({
          abi: UNISWAP_ROUTER_ABI,
          functionName: 'exactInputSingle',
          args: [{
            tokenIn: WETH_ADDRESS,
            tokenOut: tokenAddress as `0x${string}`,
            fee: UNISWAP_FEE_TIER,
            recipient: userAddress as `0x${string}`,
            deadline,
            amountIn: amountInWei,
            amountOutMinimum: minimumAmountOut,
            sqrtPriceLimitX96: 0n,
          }],
        });

        steps.push({
          type: "swap",
          protocol: "uniswap-v3",
          to: UNISWAP_V3_ROUTER,
          data: swapData,
          value: `0x${amountInWei.toString(16)}`,
          description: `Swap ${amount} ETH to ${token}`,
          estimatedBuyAmount: expectedAmountOut.toString(),
          minimumBuyAmount: minimumAmountOut.toString(),
          chainId: ETHEREUM_CHAIN_ID,
        });

        depositAmountWei = minimumAmountOut;
      } catch (e: any) {
        console.error("Uniswap quote error:", e);
        return NextResponse.json(
          { error: `Failed to prepare swap transaction: ${e.message || e}` },
          { status: 500 }
        );
      }
    } else {
      depositAmountWei = parseUnits(amount, decimals);
      if (depositAmountWei <= 0n) {
        return NextResponse.json(
          { error: "Deposit amount must be greater than zero." },
          { status: 400 }
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
      chainId: ETHEREUM_CHAIN_ID,
    });

    // Deposit step
    const depositData = encodeFunctionData({
      abi: POOL_ABI,
      functionName: 'supply',
      args: [
        tokenAddress as `0x${string}`,
        depositAmountWei,
        userAddress as `0x${string}`,
        0, // referralCode
      ],
    });

    const depositAmountFormatted = Number(formatUnits(depositAmountWei, decimals))
      .toLocaleString(undefined, { maximumFractionDigits: 6 });

    steps.push({
      type: "deposit",
      to: poolAddress,
      data: depositData,
      value: "0x0",
      description: `Deposit ${depositAmountFormatted} ${token} to ${protocol}`,
      chainId: ETHEREUM_CHAIN_ID,
    });

    return NextResponse.json({
      steps,
      expectedYield: null, // Will be provided by options API
      protocol,
      token,
      amount,
      depositAmountWei: depositAmountWei.toString(),
    });
  } catch (e: any) {
    console.error("Deposit API error:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to prepare deposit transactions" },
      { status: 500 }
    );
  }
}

