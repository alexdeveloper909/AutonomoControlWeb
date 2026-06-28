export type RetaProjectionMode = 'SAME_AS_CURRENT_RUN_RATE' | 'MANUAL_FUTURE_MONTHLY_INCOME'
export type RetaEstimationDirectaMode = 'NORMAL' | 'SIMPLIFICADA'
export type RetaGenericDeductionMode = 'GENERAL_7_PERCENT' | 'SOCIO_3_PERCENT'
export type RetaBaseSelectionPolicy = 'MINIMUM' | 'CUSTOM'
export type RetaTramoTable = 'REDUCED' | 'GENERAL'
export type RetaProjectionBucketKind = 'ACTUAL' | 'MANUAL' | 'PROJECTED' | 'INACTIVE'
export type RetaCuotaScenarioKind = 'MINIMUM_BASE' | 'SELECTED_BASE' | 'MAXIMUM_BASE' | 'TARIFA_PLANA'
export type RetaWarningCode =
  | 'MISSING_YEAR_CONFIGURATION'
  | 'CONTRIBUTION_RATE_COMPONENTS_DO_NOT_SUM_TO_TOTAL'
  | 'NO_COMPLETED_MONTHS_FOR_RUN_RATE'
  | 'MANUAL_FUTURE_MONTHLY_ACTIVITY_NET_REQUIRED'
  | 'SELECTED_BASE_BELOW_ALLOWED_RANGE'
  | 'SELECTED_BASE_ABOVE_ALLOWED_RANGE'
  | 'VERY_LOW_OR_NEGATIVE_EARNINGS_VERIFY_MINIMUM_CONTRIBUTION'
  | 'TARIFA_PLANA_VERIFY_ELIGIBILITY_AND_AMOUNT'

export type RetaTarifaPlanaSettings = {
  enabled: boolean
  startDate: string | null
  endDate: string | null
  fixedMonthlyCuota: number
}

export type RetaPlanningSettings = {
  enabled: boolean
  estimationDirectaMode: RetaEstimationDirectaMode
  genericDeductionMode: RetaGenericDeductionMode
  defaultBaseSelectionPolicy: RetaBaseSelectionPolicy
  defaultCustomContributionBase: number | null
  tarifaPlana: RetaTarifaPlanaSettings | null
}

export type RetaScenarioSettings = {
  projectionMode: RetaProjectionMode
  manualFutureMonthlyActivityNet?: number | null
  baseSelectionPolicy?: RetaBaseSelectionPolicy | null
  customContributionBase?: number | null
}

export type RetaContributionBaseRange = {
  minimumBase: number
  maximumBase: number
}

export type RetaTramo = {
  table: RetaTramoTable
  tramo: number
  monthlyEarningsLowerExclusive: number | null
  monthlyEarningsLowerInclusive: number | null
  monthlyEarningsUpperInclusive: number | null
  monthlyEarningsUpperExclusive: number | null
  contributionBaseRange: RetaContributionBaseRange
}

export type RetaProjectionMonthBucket = {
  monthKey: string
  kind: RetaProjectionBucketKind
  incomeBase: number
  deductibleExpenses: number
  seguridadSocialPaid: number
  activityNetBeforeSimplifiedDeduction: number
  irpfActivityNet: number
}

export type RetaProjectionBreakdown = {
  activeMonthsInYear: number
  observedCompletedMonths: number
  actualIncomeBase: number
  actualDeductibleExpenses: number
  actualSeguridadSocialPaid: number
  projectedIncomeBase: number
  projectedDeductibleExpenses: number
  projectedSeguridadSocialPaid: number
  simplifiedDifficultExpensesDeduction: number
  monthBuckets: RetaProjectionMonthBucket[]
}

export type RetaCuotaScenario = {
  kind: RetaCuotaScenarioKind
  contributionBase: number | null
  monthlyCuota: number
  annualizedCuota: number
}

export type RetaChangeWindow = {
  requestStart: string
  requestEnd: string
  effectiveDate: string
  isCurrent: boolean
}

export type RetaCatalogSource = {
  label: string
  url: string
}

export type RetaEstimate = {
  year: number
  projectionMode: RetaProjectionMode
  estimationDirectaMode: RetaEstimationDirectaMode
  genericDeductionMode: RetaGenericDeductionMode
  irpfActivityNetAnnual: number
  seguridadSocialPaidAnnual: number
  retaBeforeGenericDeduction: number
  retaGenericDeductionAmount: number
  retaComputableAnnualEarnings: number
  retaAverageMonthlyEarnings: number
  tramo: RetaTramo | null
  baseRange: RetaContributionBaseRange | null
  selectedContributionBase: number | null
  cuotaScenarios: RetaCuotaScenario[]
  projectionBreakdown: RetaProjectionBreakdown
  changeWindows: RetaChangeWindow[]
  nextChangeWindow: RetaChangeWindow
  warningCodes: RetaWarningCode[]
  catalogSources: RetaCatalogSource[]
}

export const defaultRetaPlanningSettings = (_year?: number): RetaPlanningSettings => ({
  enabled: true,
  estimationDirectaMode: 'SIMPLIFICADA',
  genericDeductionMode: 'GENERAL_7_PERCENT',
  defaultBaseSelectionPolicy: 'MINIMUM',
  defaultCustomContributionBase: null,
  tarifaPlana: null,
})

const asRecord = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' ? (v as Record<string, unknown>) : null)
const asNumber = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && Number.isFinite(Number(v))) return Number(v)
  const o = asRecord(v)
  if (o) return asNumber(o.amount)
  return null
}
const asString = (v: unknown): string | null => (typeof v === 'string' ? v : null)
const asBoolean = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null)

const cleanBaseRange = (v: unknown): RetaContributionBaseRange | null => {
  const o = asRecord(v)
  if (!o) return null
  const minimumBase = asNumber(o.minimumBase)
  const maximumBase = asNumber(o.maximumBase)
  return minimumBase == null || maximumBase == null ? null : { minimumBase, maximumBase }
}

const cleanTramo = (v: unknown): RetaTramo | null => {
  const o = asRecord(v)
  if (!o) return null
  const table = o.table === 'REDUCED' || o.table === 'GENERAL' ? o.table : null
  const tramo = asNumber(o.tramo)
  const contributionBaseRange = cleanBaseRange(o.contributionBaseRange)
  if (!table || tramo == null || !contributionBaseRange) return null
  return {
    table,
    tramo,
    monthlyEarningsLowerExclusive: asNumber(o.monthlyEarningsLowerExclusive),
    monthlyEarningsLowerInclusive: asNumber(o.monthlyEarningsLowerInclusive),
    monthlyEarningsUpperInclusive: asNumber(o.monthlyEarningsUpperInclusive),
    monthlyEarningsUpperExclusive: asNumber(o.monthlyEarningsUpperExclusive),
    contributionBaseRange,
  }
}

const cleanChangeWindow = (v: unknown): RetaChangeWindow | null => {
  const o = asRecord(v)
  if (!o) return null
  const requestStart = asString(o.requestStart)
  const requestEnd = asString(o.requestEnd)
  const effectiveDate = asString(o.effectiveDate)
  const isCurrent = asBoolean(o.isCurrent)
  if (!requestStart || !requestEnd || !effectiveDate || isCurrent == null) return null
  return { requestStart, requestEnd, effectiveDate, isCurrent }
}

const cleanMonthBucket = (v: unknown): RetaProjectionMonthBucket | null => {
  const o = asRecord(v)
  if (!o) return null
  const monthKeyRaw = o.monthKey
  const monthKey = asString(monthKeyRaw) ?? asString(asRecord(monthKeyRaw)?.ym)
  const kind =
    o.kind === 'ACTUAL' || o.kind === 'MANUAL' || o.kind === 'PROJECTED' || o.kind === 'INACTIVE'
      ? o.kind
      : null
  const incomeBase = asNumber(o.incomeBase)
  const deductibleExpenses = asNumber(o.deductibleExpenses)
  const seguridadSocialPaid = asNumber(o.seguridadSocialPaid)
  const activityNetBeforeSimplifiedDeduction = asNumber(o.activityNetBeforeSimplifiedDeduction)
  const irpfActivityNet = asNumber(o.irpfActivityNet)
  if (
    !monthKey ||
    !kind ||
    incomeBase == null ||
    deductibleExpenses == null ||
    seguridadSocialPaid == null ||
    activityNetBeforeSimplifiedDeduction == null ||
    irpfActivityNet == null
  ) {
    return null
  }
  return { monthKey, kind, incomeBase, deductibleExpenses, seguridadSocialPaid, activityNetBeforeSimplifiedDeduction, irpfActivityNet }
}

const cleanProjectionBreakdown = (v: unknown): RetaProjectionBreakdown | null => {
  const o = asRecord(v)
  if (!o) return null
  const activeMonthsInYear = asNumber(o.activeMonthsInYear)
  const observedCompletedMonths = asNumber(o.observedCompletedMonths)
  const actualIncomeBase = asNumber(o.actualIncomeBase)
  const actualDeductibleExpenses = asNumber(o.actualDeductibleExpenses)
  const actualSeguridadSocialPaid = asNumber(o.actualSeguridadSocialPaid)
  const projectedIncomeBase = asNumber(o.projectedIncomeBase)
  const projectedDeductibleExpenses = asNumber(o.projectedDeductibleExpenses)
  const projectedSeguridadSocialPaid = asNumber(o.projectedSeguridadSocialPaid)
  const simplifiedDifficultExpensesDeduction = asNumber(o.simplifiedDifficultExpensesDeduction)
  if (
    activeMonthsInYear == null ||
    observedCompletedMonths == null ||
    actualIncomeBase == null ||
    actualDeductibleExpenses == null ||
    actualSeguridadSocialPaid == null ||
    projectedIncomeBase == null ||
    projectedDeductibleExpenses == null ||
    projectedSeguridadSocialPaid == null ||
    simplifiedDifficultExpensesDeduction == null
  ) {
    return null
  }
  return {
    activeMonthsInYear,
    observedCompletedMonths,
    actualIncomeBase,
    actualDeductibleExpenses,
    actualSeguridadSocialPaid,
    projectedIncomeBase,
    projectedDeductibleExpenses,
    projectedSeguridadSocialPaid,
    simplifiedDifficultExpensesDeduction,
    monthBuckets: (Array.isArray(o.monthBuckets) ? o.monthBuckets : []).map(cleanMonthBucket).filter((b): b is RetaProjectionMonthBucket => b != null),
  }
}

const cleanCuotaScenario = (v: unknown): RetaCuotaScenario | null => {
  const o = asRecord(v)
  if (!o) return null
  const kind =
    o.kind === 'MINIMUM_BASE' || o.kind === 'SELECTED_BASE' || o.kind === 'MAXIMUM_BASE' || o.kind === 'TARIFA_PLANA'
      ? o.kind
      : null
  const monthlyCuota = asNumber(o.monthlyCuota)
  const annualizedCuota = asNumber(o.annualizedCuota)
  if (!kind || monthlyCuota == null || annualizedCuota == null) return null
  return { kind, contributionBase: asNumber(o.contributionBase), monthlyCuota, annualizedCuota }
}

export const cleanRetaEstimate = (v: unknown): RetaEstimate | null => {
  const o = asRecord(v)
  if (!o) return null
  const year = asNumber(o.year)
  const projectionMode =
    o.projectionMode === 'SAME_AS_CURRENT_RUN_RATE' || o.projectionMode === 'MANUAL_FUTURE_MONTHLY_INCOME' ? o.projectionMode : null
  const estimationDirectaMode = o.estimationDirectaMode === 'NORMAL' || o.estimationDirectaMode === 'SIMPLIFICADA' ? o.estimationDirectaMode : null
  const genericDeductionMode =
    o.genericDeductionMode === 'GENERAL_7_PERCENT' || o.genericDeductionMode === 'SOCIO_3_PERCENT' ? o.genericDeductionMode : null
  const projectionBreakdown = cleanProjectionBreakdown(o.projectionBreakdown)
  const nextChangeWindow = cleanChangeWindow(o.nextChangeWindow)
  const required = [
    asNumber(o.irpfActivityNetAnnual),
    asNumber(o.seguridadSocialPaidAnnual),
    asNumber(o.retaBeforeGenericDeduction),
    asNumber(o.retaGenericDeductionAmount),
    asNumber(o.retaComputableAnnualEarnings),
    asNumber(o.retaAverageMonthlyEarnings),
  ]
  if (year == null || !projectionMode || !estimationDirectaMode || !genericDeductionMode || !projectionBreakdown || !nextChangeWindow || required.some((n) => n == null)) {
    return null
  }
  return {
    year,
    projectionMode,
    estimationDirectaMode,
    genericDeductionMode,
    irpfActivityNetAnnual: required[0] ?? 0,
    seguridadSocialPaidAnnual: required[1] ?? 0,
    retaBeforeGenericDeduction: required[2] ?? 0,
    retaGenericDeductionAmount: required[3] ?? 0,
    retaComputableAnnualEarnings: required[4] ?? 0,
    retaAverageMonthlyEarnings: required[5] ?? 0,
    tramo: cleanTramo(o.tramo),
    baseRange: cleanBaseRange(o.baseRange),
    selectedContributionBase: asNumber(o.selectedContributionBase),
    cuotaScenarios: (Array.isArray(o.cuotaScenarios) ? o.cuotaScenarios : []).map(cleanCuotaScenario).filter((s): s is RetaCuotaScenario => s != null),
    projectionBreakdown,
    changeWindows: (Array.isArray(o.changeWindows) ? o.changeWindows : []).map(cleanChangeWindow).filter((w): w is RetaChangeWindow => w != null),
    nextChangeWindow,
    warningCodes: (Array.isArray(o.warningCodes) ? o.warningCodes : []).filter((w): w is RetaWarningCode => typeof w === 'string'),
    catalogSources: (Array.isArray(o.catalogSources) ? o.catalogSources : [])
      .map((source) => {
        const sourceRecord = asRecord(source)
        const label = asString(sourceRecord?.label)
        const url = asString(sourceRecord?.url)
        return label && url ? { label, url } : null
      })
      .filter((source): source is RetaCatalogSource => source != null),
  }
}
