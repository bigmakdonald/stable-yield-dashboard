// lib/subgraphs.ts
// How to use:
// 1) Put GRAPH_API_KEY in .env.local and Vercel env.
// 2) import { endpointFor, SUBGRAPHS } from "@/lib/subgraphs"
// 3) const url = endpointFor("uniswap-v3", "base")  -> gateway URL
//    (returns null if we don't have that mapping)
const GRAPH_API_KEY = process.env.GRAPH_API_KEY || "36cdb2155d9cb4096130fb83dd73a720"

type Chain =
  | "ethereum" | "arbitrum" | "optimism" | "base" | "polygon" | "avalanche" | "gnosis";

type Proto =
  | "uniswap-v3" | "uniswap-v2"
  | "aave-v3"
  | "curve"
  | "balancer-v2"
  | "sushiswap"
  | "compound-v3"
  | "yearn-vaults"
  | "pendle";

// Entry can be a Graph Network subgraph ID (preferred) or a full URL (hosted/studio fallback)
type Entry = { id?: string; url?: string };

export const SUBGRAPHS: Record<Proto, Partial<Record<Chain, Entry>>> = {
  // ========== Uniswap V3 ==========
  // Uniswap keeps multiple V3 subgraphs; these IDs are the Graph Network “/subgraphs/id/<id>” values.
  // If one rotates, open Graph Explorer, find chain -> copy new ID.
  // Explorer “Uniswap V3 Ethereum/Base/Polygon/Arbitrum/Optimism” pages show the current IDs. 
  // (Example IDs below verified via Explorer pages.)
  // Docs: https://docs.uniswap.org/api/subgraph/overview
  "uniswap-v3": {
    ethereum: { id: "4cKy6QQMc5tpfdx8yxfYeb9TLZmgLQe44ddW1G7NwkA6" }, // Uniswap V3 Ethereum :contentReference[oaicite:1]{index=1}
    base:     { id: "FUbEPQw1oMghy39fwWBFY5fE6MXPXZQtjncQy2cXdrNS" }, // Uniswap V3 Base :contentReference[oaicite:2]{index=2}
    polygon:  { id: "3hCPRGf4z88VC5rsBKU5AA9FBBq5nF3jbKJG7VZCbhjm" }, // Uniswap V3 Polygon :contentReference[oaicite:3]{index=3}
    arbitrum: { id: "FQ6JYszEKApsBpAmiHesRsd9Ygc6mzmpNRANeVQFYoVX" }, // Uniswap V3 Arbitrum :contentReference[oaicite:4]{index=4}
    optimism: { id: "EgnS9YE1avupkvCNj9fHnJxppfEmNNywYJtghqiu2pd9" }, // Uniswap V3 Optimism :contentReference[oaicite:5]{index=5}
    // avalanche: community deployments exist; prefer Uniswap docs/Explorer to confirm current ID. :contentReference[oaicite:6]{index=6}
  },

  // ========== Uniswap V2 ==========
  "uniswap-v2": {
    ethereum: { id: "EYCKATKGBKLWvSfwvBjzfCBmGwYNdVkduYXVivCsLRFu" }, // Uniswap V2 mainnet :contentReference[oaicite:7]{index=7}
    // polygon/arbitrum have community v2 subgraphs; verify in Explorer if you need them. :contentReference[oaicite:8]{index=8}
  },

  // ========== Aave V3 ==========
  // Aave publishes chain-specific V3 subgraphs; Explorer pages list current IDs.
  // Also see: https://github.com/aave/protocol-subgraphs
  "aave-v3": {
    polygon:  { id: "6yuf1C49aWEscgk5n9D1DekeG1BCk5Z9imJYJT3sVmAT" }, // Aave V3 Polygon :contentReference[oaicite:9]{index=9}
    optimism: { id: "3RWFxWNstn4nP3dXiDfKi9GgBoHx7xzc7APkXs1MLEgi" }, // Aave V3 Optimism :contentReference[oaicite:10]{index=10}
    base:     { id: "D7mapexM5ZsQckLJai2FawTKXJ7CqYGKM8PErnS3cJi9" }, // Aave V3 Base (status may vary) :contentReference[oaicite:11]{index=11}
    // ethereum, arbitrum, avalanche: see Aave repo/Explorer for current IDs. :contentReference[oaicite:12]{index=12}
  },

  // ========== Curve ==========
  "curve": {
    ethereum: { id: "3fy93eAT56UJsRCEht8iFhfi6wjHWXtZ9dnnbQmvFopF" }, // Curve Finance Ethereum :contentReference[oaicite:13]{index=13}
    arbitrum: { id: "Gv6NJRut2zrm79ef4QHyKAm41YHqaLF392sM3cz9wywc" }, // Curve Finance Arbitrum :contentReference[oaicite:14]{index=14}
    // polygon/optimism etc: confirm in Explorer as needed. :contentReference[oaicite:15]{index=15}
  },

  // ========== Balancer v2 ==========
  // Balancer documents exact Graph Network IDs per chain (official docs below).
  // Docs: https://docs.balancer.fi/data-and-analytics/data-and-analytics/subgraph.html
  "balancer-v2": {
    ethereum: { id: "C4tijcwi6nThKJYBmT5JaYK2As2kJGADs89AoQaCnYz7" },
    arbitrum: { id: "EjSsjATNpZexLhozmDTe9kBHpZUt1GKjWdpZ2P9xmhsv" },
    optimism: { id: "DwreTHTzN3kV6szWr7Ldt6VwnGjtmKTKcYT9aDk37MEs" },
    base:     { id: "42QYdE4P8ZMKgPx4Mkw1Vnx3Zf6AEtWFVoeet1HZ4ntB" },
    avalanche:{ id: "QmchdxtRDQJxtt8VkV5MSmcUPvLmo1wgXD7Y7ZCNKNebN1" },
    gnosis:   { id: "yeZGqiwNf3Lqpeo8XNHih83bk5Tbu4KvFwWVy3Dbus6" }, // all from Balancer docs :contentReference[oaicite:16]{index=16}
  },

  // ========== SushiSwap (v2/route/minichef variants exist) ==========
  "sushiswap": {
    polygon:  { id: "CKaCne3uUUEqT7Ei9jjZbQqTLntEno9LnFa4JnsqqBma" }, // Sushi Polygon (network: matic) :contentReference[oaicite:17]{index=17}
    arbitrum: { id: "9tSS5FaePZnjmnXnSKCCqKVLAqA6eGg6jA2oRojsXUbP" }, // Sushi Arbitrum :contentReference[oaicite:18]{index=18}
    // ethereum/others: pick from Explorer; some “hosted service” endpoints are deprecated. :contentReference[oaicite:19]{index=19}
  },

  // ========== Compound v3 ==========
  "compound-v3": {
    ethereum: { id: "AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9" }, // Compound v3 mainnet :contentReference[oaicite:20]{index=20}
    optimism: { id: "4s7YgEisJDJZsQHjs8b3gCfaoiTAdRZXt9GqHnPiKpdz" }, // user-txns / markets variants exist :contentReference[oaicite:21]{index=21}
    // arbitrum, polygon, base: see Compound community subgraphs note. :contentReference[oaicite:22]{index=22}
  },

  // ========== Yearn (Vaults v2) ==========
  "yearn-vaults": {
    ethereum: { id: "76yQepzCZNVbAiRePxYDKC9ypENA6DwCLcvUCpCESoZG" }, // Yearn Vaults v2 (mainnet) :contentReference[oaicite:23]{index=23}
  },

  // ========== Pendle ==========
  "pendle": {
    ethereum: { id: "ExXGU3ub2nrT5stPk5cH4hSk2qunJcMcP8eX5GAhrZhe" }, // Pendle v2 mainnet :contentReference[oaicite:24]{index=24}
    // pendle publishes backends too; subgraphs vary by chain. :contentReference[oaicite:25]{index=25}
  },
};

// Build a Graph Gateway URL if we have an ID; else return the provided URL.
export function endpointFor(protocol: Proto, chain: Chain): string | null {
  const e = SUBGRAPHS[protocol]?.[chain];
  if (!e) return null;
  if (e.url) return e.url; // hosted/studio fallback
  if (e.id && GRAPH_API_KEY) {
    return `https://gateway.thegraph.com/api/${GRAPH_API_KEY}/subgraphs/id/${e.id}`;
  }
  // If no API key at dev time, you can still query in Explorer or Studio.
  return null;
}
