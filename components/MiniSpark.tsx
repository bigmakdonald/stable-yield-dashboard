"use client";
import { useEffect, useState } from "react";
import { ResponsiveContainer, LineChart, Line } from "recharts";

type Pt = { date: string; tvlUsd: number };

export default function MiniSpark({
  poolId, project, chain, addr,
  days = 30, width = 96, height = 32,
}: {
  poolId: string;
  project?: string;
  chain?: string;
  addr?: string | null;
  days?: number;
  width?: number;
  height?: number;
}) {
  const [series, setSeries] = useState<Pt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams({
      pool: poolId || "",
      project: project || "",
      chain: chain || "",
      addr: addr || "",
      days: String(days),
    }).toString();

    async function load() {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const r = await fetch(`/api/yields/pool-history?${qs}`, { 
          cache: "no-store",
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!r.ok) {
          return;
        }
        
        const json = await r.json();
        
        if (!cancelled) {
          setSeries(json.series || []);
          setIsLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    if (poolId) load();
    return () => { cancelled = true; };
  }, [poolId, project, chain, addr, days]);

  if (isLoading) {
    return (
      <div 
        style={{ width, height }} 
        className="bg-muted/20 rounded flex items-center justify-center text-xs text-muted-foreground animate-pulse"
      >
        Loading...
      </div>
    );
  }

  if (!series.length) {
    return (
      <div 
        style={{ width, height }} 
        className="bg-muted/20 rounded flex items-center justify-center text-xs text-muted-foreground"
      >
        No data
      </div>
    );
  }

  return (
    <div style={{ width, height }}>
      <ResponsiveContainer>
        <LineChart data={series}>
          <Line type="monotone" dataKey="tvlUsd" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
