import { NextResponse } from "next/server";
import { endpointFor } from "@/lib/subgraphs";

export async function GET() {
  try {
    // Test if we can get an endpoint
    const endpoint = endpointFor("uniswap-v3", "ethereum");
    console.log("Test endpoint:", endpoint);
    
    if (!endpoint) {
      return NextResponse.json({ 
        error: "No endpoint available",
        apiKey: process.env.GRAPH_API_KEY ? "Set" : "Not set"
      }, { status: 400 });
    }

    // Test a simple query
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          query {
            poolDayDatas(first: 1, where: { pool: "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640" }) {
              id
              date
              tvlUSD
              pool
            }
          }
        `
      })
    });

    const data = await response.json();
    
    return NextResponse.json({
      endpoint,
      status: response.status,
      data: data
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      endpoint: endpointFor("uniswap-v3", "ethereum")
    }, { status: 500 });
  }
}
