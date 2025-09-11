import { NextResponse } from "next/server";
import { endpointFor } from "@/lib/subgraphs";
import { graph, gql } from "@/lib/gql";

const Q_V3_YIELD_TEST = gql`
  query PoolDayYieldTest($pool: ID!, $first: Int!, $skip: Int!) {
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

const Q_AAVE_RESERVE_TEST = gql`
  query ReserveHistoryTest($reserve: ID!, $first: Int!) {
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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const protocol = url.searchParams.get("protocol") || "uniswap-v3";
  const chain = url.searchParams.get("chain") || "ethereum";
  const poolId = url.searchParams.get("pool") || "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640";
  
  try {
    const endpoint = endpointFor(protocol as any, chain as any);
    console.log(`Testing endpoint: ${endpoint}`);
    
    if (!endpoint) {
      return NextResponse.json({ 
        error: "No endpoint available",
        protocol,
        chain,
        apiKey: process.env.GRAPH_API_KEY ? "Set" : "Not set"
      }, { status: 400 });
    }

    const apiKey = process.env.GRAPH_API_KEY;
    const client = graph(endpoint, apiKey);
    
    const testQuery = protocol === "aave-v3" ? Q_AAVE_RESERVE_TEST : Q_V3_YIELD_TEST;
    const variables = protocol === "aave-v3" 
      ? { reserve: poolId, first: 5 }
      : { pool: poolId, first: 5, skip: 0 };
    
    const data = await client.request(testQuery, variables);
    
    return NextResponse.json({
      endpoint,
      protocol,
      chain,
      poolId,
      success: true,
      dataPoints: Array.isArray(data[Object.keys(data)[0]]) ? data[Object.keys(data)[0]].length : 0,
      sampleData: data
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      protocol,
      chain,
      endpoint: endpointFor(protocol as any, chain as any),
      stack: error.stack
    }, { status: 500 });
  }
}
