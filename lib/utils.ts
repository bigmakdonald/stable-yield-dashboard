import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Convert a decimal string amount into base units using BigInt to avoid precision loss
export function toBaseUnits(amount: string, decimals: number): string {
  if (!amount) return '0'
  const normalized = amount.trim()
  if (normalized === '') return '0'
  const negative = normalized.startsWith('-')
  const unsigned = negative ? normalized.slice(1) : normalized
  const [wholeRaw, fracRaw = ''] = unsigned.split('.')
  const whole = wholeRaw.replace(/[^0-9]/g, '') || '0'
  const fracDigits = fracRaw.replace(/[^0-9]/g, '')
  const frac = fracDigits.slice(0, decimals).padEnd(decimals, '0')
  const wholePart = BigInt(whole || '0') * (10n ** BigInt(decimals))
  const fracPart = frac ? BigInt(frac) : 0n
  const result = negative ? (-(wholePart + fracPart)).toString() : (wholePart + fracPart).toString()
  return result
}
