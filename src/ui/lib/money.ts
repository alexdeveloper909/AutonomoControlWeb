export const parseEuroAmount = (raw: string): number | null => {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const withoutSymbols = trimmed.replace(/€|\s/g, '')

  const hasComma = withoutSymbols.includes(',')
  const hasDot = withoutSymbols.includes('.')

  let normalized = withoutSymbols
  if (hasComma && hasDot) {
    const lastComma = normalized.lastIndexOf(',')
    const lastDot = normalized.lastIndexOf('.')
    if (lastComma > lastDot) {
      normalized = normalized.replace(/\./g, '').replace(',', '.')
    } else {
      normalized = normalized.replace(/,/g, '')
    }
  } else if (hasComma) {
    normalized = normalized.replace(',', '.')
  }

  const amount = Number(normalized)
  return Number.isFinite(amount) ? amount : null
}

export const parseMoneyAmount = parseEuroAmount

export const roundMoney = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100

const normalizeDecimalString = (raw: string): string | null => {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const withoutSymbols = trimmed.replace(/€|\s/g, '')
  const hasComma = withoutSymbols.includes(',')
  const hasDot = withoutSymbols.includes('.')
  let normalized = withoutSymbols
  if (hasComma && hasDot) {
    const lastComma = normalized.lastIndexOf(',')
    const lastDot = normalized.lastIndexOf('.')
    normalized = lastComma > lastDot ? normalized.replace(/\./g, '').replace(',', '.') : normalized.replace(/,/g, '')
  } else if (hasComma) {
    normalized = normalized.replace(',', '.')
  }
  return /^\d+(\.\d+)?$/.test(normalized) ? normalized : null
}

const decimalToIntAndScale = (raw: string): { value: bigint; scale: number } | null => {
  const normalized = normalizeDecimalString(raw)
  if (!normalized) return null
  const [whole, fraction = ''] = normalized.split('.')
  return {
    value: BigInt(`${whole}${fraction}`),
    scale: fraction.length,
  }
}

export const multiplyMoneyToCents = (amountRaw: string, rateRaw: string): number | null => {
  const amount = decimalToIntAndScale(amountRaw)
  const rate = decimalToIntAndScale(rateRaw)
  if (!amount || !rate) return null
  const numerator = amount.value * rate.value * 100n
  const denominator = 10n ** BigInt(amount.scale + rate.scale)
  const roundedCents = (numerator + denominator / 2n) / denominator
  return Number(roundedCents) / 100
}

