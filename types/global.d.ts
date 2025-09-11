interface EthereumProvider {
  isMetaMask?: boolean
  request: (args: { method: string; params?: any[] }) => Promise<any>
  on: (event: string, handler: (...args: any[]) => void) => void
  removeListener: (event: string, handler: (...args: any[]) => void) => void
}

declare global {
  interface Window {
    ethereum?: EthereumProvider
  }
}

interface ZeroXPriceResponse {
  chainId: number;
  price: string;
  estimatedPriceImpact: string;
  value: string;
  gasPrice: string;
  gas: string;
  estimatedGas: string;
  protocolFee: string;
  minimumProtocolFee: string;
  buyTokenAddress: string;
  sellTokenAddress: string;
  buyAmount: string;
  sellAmount: string;
  allowanceTarget: string;
  sellTokenToEthRate: string;
  buyTokenToEthRate: string;
  expectedSlippage: string;
  liquidityAvailable: boolean;
  minBuyAmount: string;
  route: any;
  zid: string;
  issues?: {
    allowance?: {
      spender: string;
      allowance: string;
    };
  };
}

interface ZeroXQuoteResponse extends ZeroXPriceResponse {
  transaction: {
    to: string;
    data: string;
    gas: string;
    gasPrice: string;
    value: string;
  };
}


export {}
