"use client";

import { useState, useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { useAaveDeposit } from '@/lib/hooks/useAaveDeposit';
import WalletConnector from './WalletConnector';
import ChainSwitcher from './ChainSwitcher';
import { SupportedChain, isTestnet } from '@/lib/contracts/aave-v3';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Chain ID mapping for both mainnet and testnet
const getChainId = (chain: SupportedChain, testnet: boolean): number => {
  if (testnet) {
    const testnetMap: Record<SupportedChain, number> = {
      ethereum: 11155111, // Sepolia
      polygon: 80001, // Mumbai
      arbitrum: 421614, // Arbitrum Sepolia
      base: 84532, // Base Sepolia
      optimism: 11155420, // Optimism Sepolia
    };
    return testnetMap[chain];
  } else {
    const mainnetMap: Record<SupportedChain, number> = {
      ethereum: 1,
      polygon: 137,
      arbitrum: 42161,
      base: 8453,
      optimism: 10,
    };
    return mainnetMap[chain];
  }
};

const AVAILABLE_POOLS: Array<{ chain: SupportedChain; token: 'USDC' | 'USDT' | 'DAI' | 'USDE'; name: string; apy: string; chainId: number; testnetChainId: number }> = [
  { chain: 'ethereum', token: 'USDC', name: 'USDC on Ethereum', apy: '3.5%', chainId: 1, testnetChainId: 11155111 },
  { chain: 'ethereum', token: 'USDT', name: 'USDT on Ethereum', apy: '3.2%', chainId: 1, testnetChainId: 11155111 },
  { chain: 'ethereum', token: 'DAI', name: 'DAI on Ethereum', apy: '3.8%', chainId: 1, testnetChainId: 11155111 },
  { chain: 'base', token: 'USDC', name: 'USDC on Base', apy: '4.1%', chainId: 8453, testnetChainId: 84532 },
  { chain: 'arbitrum', token: 'USDC', name: 'USDC on Arbitrum', apy: '3.9%', chainId: 42161, testnetChainId: 421614 },
  { chain: 'polygon', token: 'USDC', name: 'USDC on Polygon', apy: '4.2%', chainId: 137, testnetChainId: 80001 },
  { chain: 'optimism', token: 'USDC', name: 'USDC on Optimism', apy: '3.7%', chainId: 10, testnetChainId: 11155420 },
];

export default function YieldFarming() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const [selectedPool, setSelectedPool] = useState(() => {
    // Try to find a pool matching current chain, otherwise default to first
    const matchingPool = AVAILABLE_POOLS.find(p => {
      const poolChainId = isTestnet ? p.testnetChainId : p.chainId;
      return poolChainId === chainId;
    });
    return matchingPool || AVAILABLE_POOLS[0];
  });
  const [amount, setAmount] = useState('');
  const [approvalStep, setApprovalStep] = useState<'idle' | 'approving' | 'approved' | 'depositing'>('idle');

  const {
    balance,
    needsApproval,
    hasInsufficientBalance,
    isCorrectChain,
    isValidToken,
    expectedChainId,
    approve,
    deposit,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    hash,
  } = useAaveDeposit({
    chain: selectedPool.chain,
    token: selectedPool.token,
    amount: amount || '0',
  });

  // Update selected pool when chain changes
  useEffect(() => {
    const matchingPool = AVAILABLE_POOLS.find(p => {
      const poolChainId = isTestnet ? p.testnetChainId : p.chainId;
      return poolChainId === chainId;
    });
    if (matchingPool) {
      const currentChainId = isTestnet ? selectedPool.testnetChainId : selectedPool.chainId;
      if (matchingPool.chainId !== currentChainId && matchingPool.testnetChainId !== currentChainId) {
        setSelectedPool(matchingPool);
        setAmount(''); // Reset amount when chain changes
      }
    }
  }, [chainId, isTestnet, selectedPool.chainId, selectedPool.testnetChainId]);

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (hasInsufficientBalance) {
      alert('Insufficient balance');
      return;
    }

    try {
      if (needsApproval && approvalStep === 'idle') {
        setApprovalStep('approving');
        await approve();
        // Wait for approval confirmation
        setApprovalStep('approved');
      } else if (!needsApproval || approvalStep === 'approved') {
        setApprovalStep('depositing');
        await deposit();
      }
    } catch (err) {
      console.error('Transaction error:', err);
      setApprovalStep('idle');
    }
  };

  // Reset approval step when transaction is confirmed
  useEffect(() => {
    if (isConfirmed && approvalStep !== 'idle') {
      const timer = setTimeout(() => setApprovalStep('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmed, approvalStep]);

  const getExplorerUrl = (txHash: string, chain: SupportedChain) => {
    const explorers: Record<SupportedChain, string> = {
      ethereum: isTestnet ? `https://sepolia.etherscan.io/tx/${txHash}` : `https://etherscan.io/tx/${txHash}`,
      polygon: isTestnet ? `https://mumbai.polygonscan.com/tx/${txHash}` : `https://polygonscan.com/tx/${txHash}`,
      arbitrum: isTestnet ? `https://sepolia.arbiscan.io/tx/${txHash}` : `https://arbiscan.io/tx/${txHash}`,
      base: isTestnet ? `https://sepolia.basescan.org/tx/${txHash}` : `https://basescan.org/tx/${txHash}`,
      optimism: isTestnet ? `https://sepolia-optimism.etherscan.io/tx/${txHash}` : `https://optimistic.etherscan.io/tx/${txHash}`,
    };
    return explorers[chain];
  };

  if (!isConnected) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>One-Click Yield Farming</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">
            Connect your wallet to start earning yield on your stablecoins with Aave V3.
            No account setup or KYC required - just connect and deposit!
          </p>
          <WalletConnector />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>One-Click Yield Farming</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <WalletConnector />
          <ChainSwitcher />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Select Pool</label>
          <select
            value={`${selectedPool.chain}-${selectedPool.token}`}
            onChange={(e) => {
              const [chain, token] = e.target.value.split('-');
              const pool = AVAILABLE_POOLS.find(p => p.chain === chain && p.token === token);
              if (pool) {
                setSelectedPool(pool);
                setAmount(''); // Reset amount when switching pools
              }
            }}
            className="w-full p-2 border rounded"
          >
            {AVAILABLE_POOLS.filter(pool => {
              // Filter pools based on current chain and network mode
              const poolChainId = isTestnet ? pool.testnetChainId : pool.chainId;
              return poolChainId === chainId;
            }).map((pool) => (
              <option key={`${pool.chain}-${pool.token}`} value={`${pool.chain}-${pool.token}`}>
                {pool.name} - APY: {pool.apy}
              </option>
            ))}
          </select>
          {AVAILABLE_POOLS.filter(p => {
            const poolChainId = isTestnet ? p.testnetChainId : p.chainId;
            return poolChainId === chainId;
          }).length === 0 && (
            <Alert className="mt-2">
              <AlertDescription>
                No pools available on this network. Please switch to a supported network.
                {isTestnet ? ' (Testnet mode active)' : ' (Mainnet mode active)'}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Amount to Deposit
          </label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={() => setAmount(balance)}
            >
              Max ({balance} {selectedPool.token})
            </Button>
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Balance: {balance} {selectedPool.token}
          </div>
        </div>

        {!isValidToken && (
          <Alert variant="destructive">
            <AlertDescription>
              ⚠️ {selectedPool.token} is not available on {selectedPool.name.split(' on ')[1]}. Please select a different pool.
            </AlertDescription>
          </Alert>
        )}

        {!isCorrectChain && isConnected && isValidToken && (
          <Alert>
            <AlertDescription>
              ⚠️ Please switch to the correct network. This pool requires {selectedPool.name.split(' on ')[1]}.
              Use the network selector above to switch.
            </AlertDescription>
          </Alert>
        )}

        {hasInsufficientBalance && (
          <Alert variant="destructive">
            <AlertDescription>
              Insufficient balance. You have {balance} {selectedPool.token}.
            </AlertDescription>
          </Alert>
        )}

        {needsApproval && amount && !hasInsufficientBalance && approvalStep === 'idle' && (
          <Alert>
            <AlertDescription>
              First transaction: Approve token spending
              <br />
              Second transaction: Deposit to Aave
            </AlertDescription>
          </Alert>
        )}

        {approvalStep === 'approving' && (
          <Alert>
            <AlertDescription>
              ⏳ Approving token spending... Please confirm in your wallet.
            </AlertDescription>
          </Alert>
        )}

        {approvalStep === 'approved' && (
          <Alert>
            <AlertDescription>
              ✅ Approval confirmed! Click the button again to deposit.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              <strong>Error:</strong> {error.message || 'Transaction failed. Please try again.'}
            </AlertDescription>
          </Alert>
        )}

        {hash && (
          <Alert>
            <AlertDescription>
              <strong>Transaction Hash:</strong>{' '}
              <a
                href={getExplorerUrl(hash, selectedPool.chain)}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
              >
                {hash.slice(0, 10)}...{hash.slice(-8)}
              </a>
              {' '}
              <span className="text-sm">(View on block explorer)</span>
            </AlertDescription>
          </Alert>
        )}

        {isConfirmed && (
          <Alert>
            <AlertDescription>
              ✅ Successfully deposited! Your funds are now earning yield on Aave V3.
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleDeposit}
          disabled={
            !isCorrectChain ||
            !isValidToken ||
            isPending || 
            isConfirming || 
            !amount || 
            parseFloat(amount) <= 0 || 
            hasInsufficientBalance ||
            approvalStep === 'approving' ||
            approvalStep === 'depositing'
          }
          className="w-full"
        >
          {approvalStep === 'approving' || (isPending && needsApproval)
            ? 'Approving...'
            : approvalStep === 'depositing' || (isPending && !needsApproval)
            ? 'Depositing...'
            : approvalStep === 'approved'
            ? 'Deposit to Aave'
            : needsApproval
            ? 'Approve & Start Yield Farming'
            : 'Start Yield Farming'}
        </Button>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Your funds are deposited directly into Aave V3 smart contracts</p>
          <p>• You maintain full custody - we never hold your funds</p>
          <p>• No account setup or KYC required</p>
          <p>• You can withdraw anytime</p>
        </div>
      </CardContent>
    </Card>
  );
}

