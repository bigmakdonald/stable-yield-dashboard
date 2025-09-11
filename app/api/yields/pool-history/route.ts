import { NextResponse } from "next/server";
import { graph, gql } from "@/lib/gql";
import { endpointFor } from "@/lib/subgraphs";

export const dynamic = "force-dynamic";

const Q_V3_YIELD = gql`
  query PoolDayYield($pool: ID!, $first: Int!, $skip: Int!) {
    poolDayDatas(
      where: { pool: $pool }
      orderBy: date
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      date
      tvlUSD
      volumeUSD
      feesUSD
    }
  }
`;

const Q_V2_YIELD = gql`
  query PairDayYield($pair: ID!, $first: Int!, $skip: Int!) {
    pairDayDatas(
      where: { pairAddress: $pair }
      orderBy: date
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      date
      reserveUSD
      dailyVolumeUSD
    }
  }
`;

const Q_AAVE_RESERVE = gql`
  query ReserveHistory($reserve: ID!, $first: Int!) {
    reserveParamsHistoryItems(
      where: { reserve: $reserve }
      orderBy: timestamp
      orderDirection: desc
      first: $first
    ) {
      timestamp
      liquidityRate
      variableBorrowRate
      utilizationRate
    }
  }
`;

type YieldPoint = { date: string; yieldValue: number };

async function fromGraphWithRetry(
  protocol: string,
  chain: string,
  poolAddress: string | null,
  days: number,
  maxRetries: number = 3
): Promise<YieldPoint[] | null> {
  if (!poolAddress) return null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const endpoint = endpointFor(protocol as any, chain as any);
      if (!endpoint) {
        console.log(`No endpoint for ${protocol} on ${chain}`);
        return null;
      }

      const apiKey = process.env.GRAPH_API_KEY;
      const client = graph(endpoint, apiKey);
      
      const result = await queryProtocolData(client, protocol, poolAddress, days);
      
      if (result && result.length > 0) {
        console.log(`Graph success: ${result.length} data points for ${protocol}`);
        return result;
      }
      
      return null;
    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries;
      const isRetryableError = error.response?.status >= 500 || error.code === 'NETWORK_ERROR';
      
      console.log(`Graph query attempt ${attempt} failed for ${protocol} on ${chain}:`, error.message);
      
      if (isLastAttempt || !isRetryableError) {
        console.log(`Final failure for ${protocol} on ${chain}`);
        return null;
      }
      
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return null;
}

async function queryProtocolData(
  client: any,
  protocol: string,
  poolAddress: string,
  days: number
): Promise<YieldPoint[] | null> {
  const id = poolAddress.toLowerCase();
  const first = Math.max(days + 5, 40);

  switch (protocol.toLowerCase()) {
    case "uniswap-v3":
      return await queryUniswapV3Yield(client, id, first, days);
    case "uniswap-v2":
      return await queryUniswapV2Yield(client, id, first, days);
    case "aave-v3":
      return await queryAaveYield(client, id, first, days);
    default:
      console.log(`Unsupported protocol: ${protocol}`);
      return null;
  }
}

async function queryUniswapV3Yield(
  client: any,
  poolId: string,
  first: number,
  days: number
): Promise<YieldPoint[] | null> {
  const data = await client.request<{ poolDayDatas: any[] }>(Q_V3_YIELD, { 
    pool: poolId, 
    first,
    skip: 0 
  });
  
  const rows = data?.poolDayDatas ?? [];
  if (!rows.length) return null;
  
  return rows
    .map((r: any) => {
      const tvl = Number(r.tvlUSD ?? 0);
      const fees = Number(r.feesUSD ?? 0);
      const dailyYield = tvl > 0 ? (fees / tvl) * 365 * 100 : 0;
      
      return {
        date: new Date(r.date * 1000).toISOString().slice(0, 10),
        yieldValue: dailyYield
      };
    })
    .filter((p: YieldPoint) => Number.isFinite(p.yieldValue) && p.yieldValue >= 0)
    .reverse()
    .slice(-days);
}

async function queryUniswapV2Yield(
  client: any,
  poolId: string,
  first: number,
  days: number
): Promise<YieldPoint[] | null> {
  const data = await client.request<{ pairDayDatas: any[] }>(Q_V2_YIELD, { 
    pair: poolId, 
    first,
    skip: 0 
  });
  
  const rows = data?.pairDayDatas ?? [];
  if (!rows.length) return null;
  
  return rows
    .map((r: any) => {
      const tvl = Number(r.reserveUSD ?? 0);
      const volume = Number(r.dailyVolumeUSD ?? 0);
      const dailyYield = tvl > 0 ? (volume * 0.003 / tvl) * 365 * 100 : 0;
      
      return {
        date: new Date(r.date * 1000).toISOString().slice(0, 10),
        yieldValue: dailyYield
      };
    })
    .filter((p: YieldPoint) => Number.isFinite(p.yieldValue) && p.yieldValue >= 0)
    .reverse()
    .slice(-days);
}

async function queryAaveYield(
  client: any,
  reserveId: string,
  first: number,
  days: number
): Promise<YieldPoint[] | null> {
  const data = await client.request<{ reserveParamsHistoryItems: any[] }>(Q_AAVE_RESERVE, { 
    reserve: reserveId, 
    first 
  });
  
  const rows = data?.reserveParamsHistoryItems ?? [];
  if (!rows.length) return null;
  
  return rows
    .map((r: any) => {
      const liquidityRate = Number(r.liquidityRate ?? 0);
      const yieldValue = liquidityRate / 1e25 * 100;
      
      return {
        date: new Date(r.timestamp * 1000).toISOString().slice(0, 10),
        yieldValue: yieldValue
      };
    })
    .filter((p: YieldPoint) => Number.isFinite(p.yieldValue) && p.yieldValue >= 0)
    .reverse()
    .slice(-days);
}

async function fromLlamaWithRetry(poolId: string, days: number): Promise<YieldPoint[] | null> {
  if (!poolId) return null;
  
  try {
    console.log(`Trying DeFiLlama for pool: ${poolId}`);
    const endpoints = [
      `https://yields.llama.fi/chart/${encodeURIComponent(poolId)}`,
      `https://yields.llama.fi/poolHistory/${encodeURIComponent(poolId)}`
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, { 
          cache: "no-store",
          headers: {
            'User-Agent': 'StablecoinYieldDashboard/1.0',
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(10000)
        });
        
        if (!response.ok) continue;
        
        const data = await response.json();
        const rawData = Array.isArray(data) ? data : (data?.data ?? []);
        
        const series = rawData
          .map((pt: any) => ({
            date: new Date(pt.timestamp).toISOString().slice(0, 10),
            yieldValue: Number(pt.apy ?? pt.apyBase ?? 0)
          }))
          .filter((p: YieldPoint) => Number.isFinite(p.yieldValue) && p.yieldValue >= 0)
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(-days);
          
        if (series.length > 0) {
          console.log(`DeFiLlama success: ${series.length} data points`);
          return series;
        }
      } catch (error) {
        console.log(`DeFiLlama endpoint ${endpoint} failed:`, error);
        continue;
      }
    }
    
    return null;
  } catch (error) {
    console.log(`DeFiLlama query failed:`, error);
    return null;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const pool = url.searchParams.get("pool") || "";
  const project = url.searchParams.get("project") || "";
  const chain = url.searchParams.get("chain") || "";
  const addr = (url.searchParams.get("addr") || "").toLowerCase();
  const days = Math.min(Math.max(Number(url.searchParams.get("days") || 30), 7), 365);
  const debug = url.searchParams.get("debug") === "1";

  if (debug) {
    console.log(`Pool history request:`, { pool, project, chain, addr, days });
  }

  try {
    let used = "graph";
    let endpoint = "";
    
    let series = await fromGraphWithRetry(project, chain, addr, days);

    if (!series) {
      console.log("Graph failed, trying DeFiLlama fallback");
      used = "llama";
      series = await fromLlamaWithRetry(pool, days);
    } else {
      endpoint = endpointFor(project as any, chain as any) || "";
    }

    const formattedSeries = series?.map(point => ({
      date: point.date,
      tvlUsd: point.yieldValue
    })) || [];

    const payload: any = { 
      series: formattedSeries, 
      updatedAt: new Date().toISOString(),
      dataType: "yield"
    };
    
    if (debug) {
      payload.debug = { 
        used, 
        project, 
        chain, 
        addrLower: addr,
        endpoint,
        poolId: pool,
        days,
        originalDataPoints: series?.length || 0
      };
    }
    
    return NextResponse.json(payload);
  } catch (e: any) {
    console.error("Pool history error:", e);
    return NextResponse.json({ 
      error: e?.message || "Failed",
      series: [],
      dataType: "yield"
    }, { status: 500 });
  }
}
