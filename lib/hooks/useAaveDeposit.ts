// lib/hooks/useAaveDeposit.ts
// Hook for Aave V3 deposit flow - PUBLIC smart contract interaction

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { AAVE_V3_ADDRESSES, POOL_ADDRESSES_PROVIDER_ABI, POOL_ABI, ERC20_ABI, SupportedChain, SupportedToken, getChainId, isTestnet } from '../contracts/aave-v3';

interface UseAaveDepositParams {
  chain: SupportedChain;
  token: SupportedToken;
  amount: string; // Amount in human-readable format (e.g., "100.5")
}

export function useAaveDeposit({ chain, token, amount }: UseAaveDepositParams) {
  const { address, chainId: userChainId } = useAccount();
  const { writeContract, data: hash, error: writeError, isPending } = useWriteContract();
  
  const chainConfig = AAVE_V3_ADDRESSES[chain];
  const tokenAddress = chainConfig.tokens[token as keyof typeof chainConfig.tokens] as `0x${string}` | undefined;
  const poolAddressesProvider = chainConfig.PoolAddressesProvider;
  const expectedChainId = getChainId(chain, isTestnet);
  const isCorrectChain = userChainId === expectedChainId;
  const isValidToken = !!tokenAddress;

  // Get Pool contract address
  const { data: poolAddress } = useReadContract({
    address: poolAddressesProvider,
    abi: POOL_ADDRESSES_PROVIDER_ABI,
    functionName: 'getPool',
    chainId: expectedChainId,
    query: {
      enabled: isCorrectChain && isValidToken,
    },
  });

  // Check token allowance
  const { data: allowance } = useReadContract({
    address: tokenAddress!,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && poolAddress ? [address, poolAddress] : undefined,
    chainId: expectedChainId,
    query: {
      enabled: !!address && !!poolAddress && isCorrectChain && isValidToken,
    },
  });

  // Check token balance
  const { data: balance } = useReadContract({
    address: tokenAddress!,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: expectedChainId,
    query: {
      enabled: !!address && isCorrectChain && isValidToken,
    },
  });

  // Get token decimals
  const { data: decimals } = useReadContract({
    address: tokenAddress!,
    abi: ERC20_ABI,
    functionName: 'decimals',
    chainId: expectedChainId,
    query: {
      enabled: isCorrectChain && isValidToken,
    },
  });

  // Wait for transaction
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
    chainId: expectedChainId,
  });

  const needsApproval = (() => {
    if (!allowance || !amount || !decimals) return false;
    const amountWei = parseUnits(amount, decimals);
    return allowance < amountWei;
  })();

  const hasInsufficientBalance = (() => {
    if (!balance || !amount || !decimals) return false;
    const amountWei = parseUnits(amount, decimals);
    return balance < amountWei;
  })();

  const approve = async () => {
    if (!poolAddress || !decimals || !isCorrectChain || !isValidToken || !tokenAddress) return;
    
    const amountWei = parseUnits(amount, decimals);
    // Approve with a bit extra to avoid needing re-approval
    const maxApproval = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    
    writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [poolAddress, maxApproval],
      chainId: expectedChainId,
    });
  };

  const deposit = async () => {
    if (!poolAddress || !address || !decimals || !isCorrectChain || !isValidToken || !tokenAddress) return;
    
    const amountWei = parseUnits(amount, decimals);
    
    writeContract({
      address: poolAddress,
      abi: POOL_ABI,
      functionName: 'supply',
      args: [tokenAddress, amountWei, address, 0], // referralCode = 0
      chainId: expectedChainId,
    });
  };

  const depositWithApproval = async () => {
    try {
      if (needsApproval) {
        await approve();
        // Wait for approval transaction to be confirmed before depositing
        // This will be handled by the UI showing the approval step
      }
      // Deposit will be called separately after approval is confirmed
      await deposit();
    } catch (err) {
      console.error('Deposit error:', err);
      throw err;
    }
  };

  return {
    poolAddress,
    allowance: allowance ? formatUnits(allowance, decimals || 18) : '0',
    balance: balance ? formatUnits(balance, decimals || 18) : '0',
    needsApproval,
    hasInsufficientBalance,
    isCorrectChain,
    isValidToken,
    expectedChainId,
    approve,
    deposit,
    depositWithApproval,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error: writeError,
    decimals: decimals || 18,
  };
}

