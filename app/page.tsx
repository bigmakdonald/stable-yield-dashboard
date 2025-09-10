"use client"

import { useState, useMemo, useEffect } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SimpleDropdown, SimpleDropdownItem } from "@/components/ui/simple-dropdown"
import { ArrowUpDown, ChevronDown, ExternalLink, Search, Filter } from "lucide-react"
import { cn } from "@/lib/utils"

type SortField = "protocol" | "chain" | "stablecoin" | "apyBase" | "apyReward" | "apyNet" | "tvlUsd"
type SortDirection = "asc" | "desc"

export default function StablecoinYieldDashboard() {
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedChains, setSelectedChains] = useState<string[]>([])
  const [selectedStablecoins, setSelectedStablecoins] = useState<string[]>([])
  const [sortField, setSortField] = useState<SortField>("apyNet")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [lastUpdated, setLastUpdated] = useState<string>("")

  // Load data
  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true)
        const res = await fetch("/api/yields", { cache: "no-store" })
        const json = await res.json()
        console.log("Loaded data:", json.rows?.length || 0, "items")
        console.log("Sample data item:", json.rows?.[0])
        setData(json.rows || [])
      } catch (err) {
        console.error("Failed to fetch yields", err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  // Timestamp (client-only to avoid hydration mismatch)
  useEffect(() => {
    const update = () => setLastUpdated(new Date().toLocaleString())
    update()
    const interval = setInterval(update, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Dynamic options (filter out falsy / duplicates)
  const chainOptions = useMemo(() => {
    const options = Array.from(new Set(data.map((d: any) => d.chain).filter(Boolean))).sort()
    console.log("Chain options:", options)
    return options
  }, [data])
  
  const stablecoinOptions = useMemo(() => {
    const options = Array.from(new Set(data.map((d: any) => d.stablecoin).filter(Boolean))).sort()
    console.log("Stablecoin options:", options)
    return options
  }, [data])

  // Normalized Sets for fast membership tests
  const chainSet = useMemo(
    () => new Set(selectedChains.map((c) => c.toLowerCase())),
    [selectedChains]
  )
  const stableSet = useMemo(
    () => new Set(selectedStablecoins.map((s) => s.toUpperCase())),
    [selectedStablecoins]
  )

  const filteredAndSortedData = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()

    const filtered = data.filter((item: any) => {
      const protocol = String(item.protocol || "").toLowerCase()
      const chain = String(item.chain || "")
      const chainLower = chain.toLowerCase()
      const stable = String(item.stablecoin || "")
      const stableUpper = stable.toUpperCase()

      const matchesSearch =
        protocol.includes(q) || chainLower.includes(q) || stable.toLowerCase().includes(q)

      const matchesChain = chainSet.size === 0 || chainSet.has(chainLower)
      const matchesStablecoin = stableSet.size === 0 || stableSet.has(stableUpper)

      return matchesSearch && matchesChain && matchesStablecoin
    })

    filtered.sort((a: any, b: any) => {
      let aValue = a[sortField]
      let bValue = b[sortField]

      // strings
      if (typeof aValue === "string" && typeof bValue === "string") {
        const A = aValue.toLowerCase()
        const B = bValue.toLowerCase()
        return sortDirection === "asc" ? A.localeCompare(B) : B.localeCompare(A)
      }
      // numbers (null/undefined -> 0)
      const A = Number(aValue) || 0
      const B = Number(bValue) || 0
      return sortDirection === "asc" ? A - B : B - A
    })

    return filtered
  }, [data, searchQuery, chainSet, stableSet, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value)

  const formatPercentage = (value: number | null | undefined) => {
    if (value == null || isNaN(value)) return "—"
    return `${value.toFixed(2)}%`
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Stablecoin Yield Dashboard</h1>
              <p className="text-sm text-muted-foreground">Compare yields across DeFi protocols</p>
            </div>
            <div className="text-sm text-muted-foreground">Data last updated: {lastUpdated}</div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search protocols, chains, or stablecoins..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>


              {/* Chain Filter */}
              <SimpleDropdown
                trigger={
                  <Button variant="outline" className="min-w-[140px] justify-between">
                    Chains {selectedChains.length > 0 && `(${selectedChains.length})`}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                }
                align="end"
              >
                {chainOptions.length === 0 ? (
                  <SimpleDropdownItem disabled>No chains available</SimpleDropdownItem>
                ) : (
                  chainOptions.map((chain) => (
                    <SimpleDropdownItem
                      key={chain}
                      onClick={() => {
                        console.log("[CHAIN CLICKED]", { chain, selectedChains })
                        setSelectedChains((prev) =>
                          prev.includes(chain)
                            ? prev.filter((c) => c !== chain)
                            : [...prev, chain]
                        )
                      }}
                    >
                      {selectedChains.includes(chain) && "✓ "}{chain}
                    </SimpleDropdownItem>
                  ))
                )}
              </SimpleDropdown>

              {/* Stablecoin Filter */}
              <SimpleDropdown
                trigger={
                  <Button variant="outline" className="min-w-[140px] justify-between">
                    Stablecoins {selectedStablecoins.length > 0 && `(${selectedStablecoins.length})`}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                }
                align="end"
              >
                {stablecoinOptions.length === 0 ? (
                  <SimpleDropdownItem disabled>No stablecoins available</SimpleDropdownItem>
                ) : (
                  stablecoinOptions.map((stablecoin) => (
                    <SimpleDropdownItem
                      key={stablecoin}
                      onClick={() => {
                        console.log("[STABLE CLICKED]", { stablecoin, selectedStablecoins })
                        setSelectedStablecoins((prev) =>
                          prev.includes(stablecoin)
                            ? prev.filter((s) => s !== stablecoin)
                            : [...prev, stablecoin]
                        )
                      }}
                    >
                      {selectedStablecoins.includes(stablecoin) && "✓ "}{stablecoin}
                    </SimpleDropdownItem>
                  ))
                )}
              </SimpleDropdown>
            </div>

            {/* Active Filters */}
            {(selectedChains.length > 0 || selectedStablecoins.length > 0) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedChains.map((chain) => (
                  <Badge
                    key={chain}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() =>
                      setSelectedChains((prev) => prev.filter((c) => c !== chain))
                    }
                  >
                    {chain} ×
                  </Badge>
                ))}
                {selectedStablecoins.map((stablecoin) => (
                  <Badge
                    key={stablecoin}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() =>
                      setSelectedStablecoins((prev) => prev.filter((s) => s !== stablecoin))
                    }
                  >
                    {stablecoin} ×
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>Yield Opportunities</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6">
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-4 w-[100px]" />
                      <Skeleton className="h-4 w-[80px]" />
                      <Skeleton className="h-4 w-[60px]" />
                      <Skeleton className="h-4 w-[80px]" />
                      <Skeleton className="h-4 w-[80px]" />
                      <Skeleton className="h-4 w-[80px]" />
                      <Skeleton className="h-4 w-[100px]" />
                    </div>
                  ))}
                </div>
              </div>
            ) : filteredAndSortedData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-3 mb-4">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                <p className="text-muted-foreground mb-4 max-w-sm">
                  Try adjusting your search terms or filters to find what you're looking for.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("")
                    setSelectedChains([])
                    setSelectedStablecoins([])
                  }}
                >
                  Clear all filters
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("protocol")}
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          Protocol
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("chain")}
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          Chain
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("stablecoin")}
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          Stablecoin
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("apyBase")}
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          Base APY
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("apyReward")}
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          Reward APY
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("apyNet")}
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          Net APY
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("tvlUsd")}
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          TVL
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead className="w-[100px]">Link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedData.map((item: any, index: number) => (
                      <TableRow key={index} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{item.protocol}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.chain}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{item.stablecoin}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">{formatPercentage(item.apyBase)}</TableCell>
                        <TableCell className="text-right font-mono">
                          <span className="text-accent">{formatPercentage(item.apyReward)}</span>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          <span
                            className={cn(
                              item.apyNet >= 7
                                ? "text-green-600"
                                : item.apyNet >= 5
                                ? "text-yellow-600"
                                : "text-foreground",
                            )}
                          >
                            {formatPercentage(item.apyNet)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(item.tvlUsd)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Visit ${item.protocol}`}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
