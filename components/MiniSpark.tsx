"use client";
import { useEffect, useState } from "react";
import { ResponsiveContainer, LineChart, Line, YAxis } from "recharts";

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

  // Calculate min/max for auto-scaling yield data
  const values = series.map((d: any) => d.tvlUsd);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue;
  
  // Handle edge case where all values are the same
  const padding = range === 0 ? Math.max(maxValue * 0.1, 0.1) : range * 0.1;
  const domain = range === 0 
    ? [Math.max(0, minValue - padding), maxValue + padding]
    : [Math.max(0, minValue - padding), maxValue + padding];

  return (
    <div style={{ width, height }}>
      <ResponsiveContainer>
        <LineChart data={series}>
          <YAxis 
            domain={domain}
            hide
          />
          <Line 
            type="monotone" 
            dataKey="tvlUsd" 
            dot={false} 
            strokeWidth={2}
            stroke="#10b981"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
