export type RecordType = 'INVOICE' | 'EXPENSE' | 'STATE_PAYMENT' | 'TRANSFER' | 'BUDGET' | 'REGULAR_SPENDING' | 'BUSINESS_ENTITY_INVOICE'

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
export type InvoiceCurrency = 'USD' | 'UAH'
export type ExchangeRateSource = 'NBU' | 'MANUAL'

export type InvoicePayload = {
  entityId?: 'autonomo'
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

export type UkrainianFopInvoicePayload = {
  entityId: string
  invoiceType: 'UKRAINIAN_FOP'
  invoiceDate: string
  receivedDate: string
  number: string
  client: string
  amount: number
  currency: InvoiceCurrency
  taxCurrency: 'UAH'
  exchangeRateToTaxCurrency: number
  exchangeRateSource: ExchangeRateSource
  exchangeRateDate: string
  exchangeRateFetchedAt?: string | null
  amountTaxCurrency: number
}

export type BusinessEntityInvoicePayload = UkrainianFopInvoicePayload

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
  taxPeriodQuarter?: {
    year: number
    quarter: number
  }
}

export type TransferPayload = {
  date: string
  operation: TransferOp
  amount: number
  accountId?: string
  note?: string
}

export type InternalTransferPayload = {
  date: string
  movementType: 'InternalTransfer'
  fromAccountId: string
  toAccountId: string
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
export type RegularSpendingScheduleType = 'ONGOING' | 'FIXED_TERM'

export type OngoingRegularSpendingPayload = {
  name: string
  startDate: string
  scheduleType?: 'ONGOING'
  cadence: RegularSpendingCadence
  amount: number
}

export type FixedTermRegularSpendingPayload = {
  name: string
  startDate: string
  scheduleType: 'FIXED_TERM'
  paymentCount: number
  amount: number
}

export type RegularSpendingPayload = OngoingRegularSpendingPayload | FixedTermRegularSpendingPayload

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
  | BusinessEntityInvoicePayload
  | ExpensePayload
  | StatePaymentPayload
  | TransferPayload
  | InternalTransferPayload
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

export type UkrainianFopSummaryWarningCode = 'MISSING_TAX_RATES' | 'MISSING_SOCIAL_CONTRIBUTION_MONTHS' | (string & {})

export type UkrainianFopSummaryWarning = {
  code: UkrainianFopSummaryWarningCode
  message?: string
  year?: number
  missingMonths?: string[]
}

export type UkrainianFopSummaryRow = {
  monthKey?: string
  quarterKey?: string
  taxCurrency: 'UAH' | string
  invoiceCount: number
  taxableRevenue: number
  singleTaxRate?: number
  singleTax: number
  militaryLevyRate?: number
  militaryLevy: number
  socialContribution: number
  availableEstimate: number
}

export type UkrainianFopYearSummary = {
  workspaceId: string
  entity: unknown
  year: number
  isComplete: boolean
  warnings?: UkrainianFopSummaryWarning[]
  warningCodes?: UkrainianFopSummaryWarningCode[]
  effectiveYearSettings?: {
    taxRates?: {
      singleTaxRate: number
      militaryLevyRate: number
    } | null
    socialContribution?: {
      enabled: boolean
      monthlyAmountsUah?: Record<string, number>
      exemptionReason?: string | null
    } | null
  } | null
  months: UkrainianFopSummaryRow[]
  quarters: UkrainianFopSummaryRow[]
  totals: UkrainianFopSummaryRow
}
