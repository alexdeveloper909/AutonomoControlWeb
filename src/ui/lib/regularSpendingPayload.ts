import type { RegularSpendingCadence, RegularSpendingPayload } from '../../domain/records'

const CADENCE_OPTIONS: RegularSpendingCadence[] = ['MONTHLY', 'QUARTERLY', 'YEARLY']

type RegularSpendingPayloadCandidate = Partial<{
  name: unknown
  startDate: unknown
  scheduleType: unknown
  cadence: unknown
  paymentCount: unknown
  amount: unknown
}>

const isRegularSpendingCadence = (value: unknown): value is RegularSpendingCadence =>
  typeof value === 'string' && (CADENCE_OPTIONS as readonly string[]).includes(value)

export const asRegularSpendingPayload = (payload: unknown): RegularSpendingPayload | null => {
  if (!payload || typeof payload !== 'object') return null
  const p = payload as RegularSpendingPayloadCandidate
  if (typeof p.name !== 'string') return null
  if (typeof p.startDate !== 'string') return null
  if (typeof p.amount !== 'number') return null
  if (p.scheduleType === 'FIXED_TERM') {
    if (typeof p.paymentCount !== 'number') return null
    if (p.cadence != null && p.cadence !== 'MONTHLY') return null
    return {
      name: p.name,
      startDate: p.startDate,
      scheduleType: 'FIXED_TERM',
      paymentCount: p.paymentCount,
      amount: p.amount,
    }
  }
  if (p.scheduleType != null && p.scheduleType !== 'ONGOING') return null
  if (!isRegularSpendingCadence(p.cadence)) return null
  return {
    name: p.name,
    startDate: p.startDate,
    scheduleType: 'ONGOING',
    cadence: p.cadence,
    amount: p.amount,
  }
}
