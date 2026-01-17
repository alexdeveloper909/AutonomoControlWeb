export type RecordType = 'INVOICE' | 'EXPENSE' | 'STATE_PAYMENT' | 'TRANSFER' | 'BUDGET'

export type IvaRate = 'ZERO' | 'SUPER_REDUCED' | 'REDUCED' | 'STANDARD'
export type RetencionRate = 'ZERO' | 'NEW_PROFESSIONAL' | 'STANDARD'
export type StatePaymentType =
  | 'Modelo303'
  | 'Modelo130'
  | 'SeguridadSocial'
  | 'RentaAnual'
  | 'Other'
export type TransferOp = 'Inflow' | 'Outflow'

export type InvoicePayload = {
  invoiceDate: string
  number: string
  client: string
  baseExclVat: number
  ivaRate: IvaRate
  retencion: RetencionRate
  paymentDate?: string
  amountReceivedOverride?: number
}

export type ExpensePayload = {
  documentDate: string
  vendor: string
  category: string
  baseExclVat: number
  ivaRate: IvaRate
  vatRecoverableFlag: boolean
  deductibleShare: number
  paymentDate?: string
  amountPaidOverride?: number
}

export type StatePaymentPayload = {
  paymentDate: string
  type: StatePaymentType
  amount: number
}

export type TransferPayload = {
  date: string
  operation: TransferOp
  amount: number
  note?: string
}

export type BudgetEntryPayload = {
  monthKey: string
  plannedSpend: number
  earned: number
  description?: string
  budgetGoal?: string
}

export type RecordPayload =
  | InvoicePayload
  | ExpensePayload
  | StatePaymentPayload
  | TransferPayload
  | BudgetEntryPayload

export type RecordResponse = {
  workspaceId: string
  recordKey: string
  recordId: string
  recordType: RecordType
  eventDate: string
  payload: RecordPayload
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}
