export type RecordType = 'INVOICE' | 'EXPENSE' | 'STATE_PAYMENT' | 'TRANSFER' | 'BUDGET' | 'REGULAR_SPENDING'

export type IvaRate = 'ZERO' | 'SUPER_REDUCED' | 'REDUCED' | 'STANDARD'
export type RetencionRate = 'ZERO' | 'NEW_PROFESSIONAL' | 'STANDARD'
export type VatTreatment =
  | 'SPANISH_IVA'
  | 'REVERSE_CHARGE_EU'
  | 'EXPORT_OR_NON_EU'
  | 'EXEMPT_WITH_DEDUCTION_RIGHT'
  | 'EXEMPT_WITHOUT_DEDUCTION_RIGHT'
  | 'OUT_OF_SCOPE'
  | 'UNKNOWN'
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
  vatTreatment?: VatTreatment
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
  ivaDeductiblePercentage?: number
  irpfDeductiblePercentage?: number
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
  spent: number
  earned: number
  targetSpend?: number
  notes?: string
  exceptionalSpend?: number
  exceptionalNotes?: string
  description?: string
  budgetGoal?: string
  plannedSpend?: number
}

export const asBudgetEntryPayload = (payload: unknown): BudgetEntryPayload | null => {
  if (!payload || typeof payload !== 'object') return null
  const p = payload as Partial<BudgetEntryPayload>
  if (typeof p.monthKey !== 'string') return null
  const spent = typeof p.spent === 'number' ? p.spent : typeof p.plannedSpend === 'number' ? p.plannedSpend : null
  if (spent === null) return null
  if (typeof p.earned !== 'number') return null
  if (p.targetSpend != null && typeof p.targetSpend !== 'number') return null
  if (p.notes != null && typeof p.notes !== 'string') return null
  if (p.exceptionalSpend != null && typeof p.exceptionalSpend !== 'number') return null
  if (p.exceptionalNotes != null && typeof p.exceptionalNotes !== 'string') return null
  if (p.description != null && typeof p.description !== 'string') return null
  if (p.budgetGoal != null && typeof p.budgetGoal !== 'string') return null
  return {
    monthKey: p.monthKey,
    spent,
    earned: p.earned,
    targetSpend: p.targetSpend,
    notes: p.notes,
    exceptionalSpend: p.exceptionalSpend,
    exceptionalNotes: p.exceptionalNotes,
    description: p.description,
    budgetGoal: p.budgetGoal,
    plannedSpend: p.plannedSpend,
  }
}

export type RegularSpendingCadence = 'MONTHLY' | 'QUARTERLY' | 'YEARLY'

export type RegularSpendingPayload = {
  name: string
  startDate: string
  cadence: RegularSpendingCadence
  amount: number
}

export type RegularSpendingOccurrence = {
  recordId: string
  name: string
  payoutDate: string
  amount: number
}

export type RegularSpendingOccurrencesResponse = {
  from: string
  to: string
  items: RegularSpendingOccurrence[]
}

export type RecordPayload =
  | InvoicePayload
  | ExpensePayload
  | StatePaymentPayload
  | TransferPayload
  | BudgetEntryPayload
  | RegularSpendingPayload

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
