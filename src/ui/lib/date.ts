const pad2 = (n: number): string => String(n).padStart(2, '0')

// Formats a Date using the user's *local* calendar date, avoiding UTC shifts from `toISOString()`.
export const toLocalIsoDate = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

