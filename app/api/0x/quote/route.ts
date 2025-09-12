import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ZERO_X_API_KEY = process.env.ZERO_X_API_KEY;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  if (!ZERO_X_API_KEY) {
    return NextResponse.json(
      { error: "0x API key not configured" },
      { status: 500 }
    );
  }
  
  const params = new URLSearchParams();
  searchParams.forEach((value, key) => {
    params.append(key, value);
  });

  try {
    const response = await fetch(
      `https://api.0x.org/swap/v1/quote?${params.toString()}`,
      {
        headers: {
          "0x-api-key": ZERO_X_API_KEY,
          "0x-version": "v1",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: "0x API error", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch quote", message: error.message },
      { status: 500 }
    );
  }
}
