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

