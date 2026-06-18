import type { BalanceAccountKind } from './settings'

export type BalanceAccountSummary = {
  accountId: string
  name: string
  kind: BalanceAccountKind
  archived: boolean
  closedAt: string | null
  currentBalance: number
}

export type BalanceLedgerRow = {
  recordKey: string
  recordId: string
  eventDate: string
  movementType: 'External' | 'InternalTransfer'
  operation?: 'Inflow' | 'Outflow' | null
  accountId?: string | null
  fromAccountId?: string | null
  toAccountId?: string | null
  amount: number
  selectedAccountImpact?: number | null
  totalBalanceImpact: number
  selectedAccountRunningBalance?: number | null
  totalRunningBalance: number
  note?: string | null
}

export type BalanceResponse = {
  workspaceId: string
  asOfDate: string
  year: number | null
  selectedAccountId: string | null
  totalCurrentBalance: number
  accounts: BalanceAccountSummary[]
  ledgerRows: BalanceLedgerRow[]
  nextPageToken?: string | null
}
