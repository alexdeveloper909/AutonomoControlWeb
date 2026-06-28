import { defaultRetaPlanningSettings, type RetaBaseSelectionPolicy, type RetaEstimationDirectaMode, type RetaGenericDeductionMode, type RetaPlanningSettings } from './reta'

export type IrpfTerritory =
  | 'DEFAULT'
  | 'ANDALUCIA'
  | 'ARAGON'
  | 'ASTURIAS'
  | 'BALEARES'
  | 'CANARIAS'
  | 'CANTABRIA'
  | 'CASTILLA_LA_MANCHA'
  | 'CASTILLA_Y_LEON'
  | 'CATALUNYA'
  | 'COMUNITAT_VALENCIANA'
  | 'EXTREMADURA'
  | 'GALICIA'
  | 'LA_RIOJA'
  | 'MADRID'
  | 'MURCIA'
  | 'NAVARRA'
  | 'PAIS_VASCO'
  | 'CEUTA_MELILLA'

export type InicioActividadReductionSettings = {
  enabled: boolean
  firstPositiveNetIncomeYear: number | null
  incomeFromPriorEmployerShareOver50: boolean | null
  capEur: number | null
}

export type RentaPlanningSettings = {
  enabled: boolean
  taxYear: number
  residence: IrpfTerritory
  minimumPersonalFamiliar: number | null
  inicioActividadReduction: InicioActividadReductionSettings | null
  otherGeneralIncome: number | null
  otherReductions: number | null
}

export type VatDeductionRight = 'FULL' | 'NONE' | 'PARTIAL'
export type Q4NegativeVatAction = 'CARRY_FORWARD' | 'REQUEST_REFUND'
export type BalanceAccountKind = 'MAIN' | 'CASH' | 'OTHER'
export type BusinessEntityType = 'AUTONOMO' | 'UKRAINIAN_FOP_GROUP3_SIMPLIFIED' | (string & {})
export type BusinessEntityCurrency = 'USD' | 'UAH'
export type BusinessEntityExemptionReason = 'DISABILITY'

export type BalanceAccount = {
  accountId: string
  kind: BalanceAccountKind
  name: string
  openingBalance: number
  openingDate: string
  archivedAt?: string | null
  closedAt?: string | null
}

export type IvaDeductionProfile = {
  hasVatDeductionRight: VatDeductionRight
  defaultExpenseVatDeductible: boolean
  defaultExpenseVatDeductiblePercentage: number
  defaultIrpfDeductiblePercentage: number
  q4NegativeVatDefaultAction: Q4NegativeVatAction
  openingVatCredit: number | null
}

export type BusinessEntityTaxRates = {
  singleTaxRate: number
  militaryLevyRate: number
}

export type BusinessEntitySocialContributionYear = {
  enabled: boolean
  monthlyAmountsUah: Record<string, number>
  exemptionReason?: BusinessEntityExemptionReason | null
}

export type BusinessEntity = {
  entityId: string
  type: BusinessEntityType
  name: string
  taxCurrency?: BusinessEntityCurrency | string
  invoiceCurrencies?: (BusinessEntityCurrency | string)[]
  taxRatesByYear?: Record<string, BusinessEntityTaxRates>
  socialContribution?: {
    byYear?: Record<string, BusinessEntitySocialContributionYear>
  }
  createdAt?: string | null
  updatedAt?: string | null
  archivedAt?: string | null
  builtIn?: boolean
}

export type WorkspaceSettings = {
  year: number
  startDate: string
  ivaStd: number
  irpfRate: number
  obligacion130: boolean
  openingBalance: number | null
  balanceAccounts?: BalanceAccount[] | null
  rentaPlanning: RentaPlanningSettings | null
  retaPlanning: RetaPlanningSettings | null
  ivaProfile: IvaDeductionProfile
  entities?: BusinessEntity[] | null
}

const cleanTerritory = (v: unknown): IrpfTerritory => {
  const s = typeof v === 'string' ? v : ''
  const all: IrpfTerritory[] = [
    'DEFAULT',
    'ANDALUCIA',
    'ARAGON',
    'ASTURIAS',
    'BALEARES',
    'CANARIAS',
    'CANTABRIA',
    'CASTILLA_LA_MANCHA',
    'CASTILLA_Y_LEON',
    'CATALUNYA',
    'COMUNITAT_VALENCIANA',
    'EXTREMADURA',
    'GALICIA',
    'LA_RIOJA',
    'MADRID',
    'MURCIA',
    'NAVARRA',
    'PAIS_VASCO',
    'CEUTA_MELILLA',
  ]
  return (all as string[]).includes(s) ? (s as IrpfTerritory) : 'DEFAULT'
}

const cleanNumberOrNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const cleanNumber = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const cleanPercentage = (v: unknown, fallback: number): number => {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : fallback
  return Math.min(1, Math.max(0, n))
}

const cleanRetaEstimationDirectaMode = (v: unknown): RetaEstimationDirectaMode =>
  v === 'NORMAL' || v === 'SIMPLIFICADA' ? v : 'SIMPLIFICADA'

const cleanRetaGenericDeductionMode = (v: unknown): RetaGenericDeductionMode =>
  v === 'GENERAL_7_PERCENT' || v === 'SOCIO_3_PERCENT' ? v : 'GENERAL_7_PERCENT'

const cleanRetaBaseSelectionPolicy = (v: unknown): RetaBaseSelectionPolicy => (v === 'CUSTOM' ? 'CUSTOM' : 'MINIMUM')

const cleanTaxRatesByYear = (v: unknown): Record<string, BusinessEntityTaxRates> | undefined => {
  if (!v || typeof v !== 'object') return undefined
  const out: Record<string, BusinessEntityTaxRates> = {}
  for (const [year, raw] of Object.entries(v as Record<string, unknown>)) {
    if (!/^\d{4}$/.test(year) || !raw || typeof raw !== 'object') continue
    const o = raw as Record<string, unknown>
    out[year] = {
      singleTaxRate: cleanPercentage(o.singleTaxRate, 0.05),
      militaryLevyRate: cleanPercentage(o.militaryLevyRate, 0.01),
    }
  }
  return Object.keys(out).length ? out : undefined
}

const cleanSocialContributionByYear = (v: unknown): { byYear?: Record<string, BusinessEntitySocialContributionYear> } | undefined => {
  if (!v || typeof v !== 'object') return undefined
  const byYearRaw = (v as Record<string, unknown>).byYear
  if (!byYearRaw || typeof byYearRaw !== 'object') return undefined
  const byYear: Record<string, BusinessEntitySocialContributionYear> = {}
  for (const [year, raw] of Object.entries(byYearRaw as Record<string, unknown>)) {
    if (!/^\d{4}$/.test(year) || !raw || typeof raw !== 'object') continue
    const o = raw as Record<string, unknown>
    const amountsRaw = o.monthlyAmountsUah
    const monthlyAmountsUah: Record<string, number> = {}
    if (amountsRaw && typeof amountsRaw === 'object') {
      for (const [month, amount] of Object.entries(amountsRaw as Record<string, unknown>)) {
        if (month.startsWith(`${year}-`) && /^\d{4}-\d{2}$/.test(month)) monthlyAmountsUah[month] = Math.max(0, cleanNumber(amount))
      }
    }
    byYear[year] = {
      enabled: o.enabled !== false,
      monthlyAmountsUah,
      exemptionReason: o.exemptionReason === 'DISABILITY' ? 'DISABILITY' : null,
    }
  }
  return Object.keys(byYear).length ? { byYear } : undefined
}

const cleanBusinessEntity = (v: unknown): BusinessEntity | null => {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  if (typeof o.entityId !== 'string' || !o.entityId.trim()) return null
  if (typeof o.type !== 'string' || !o.type.trim()) return null
  if (typeof o.name !== 'string' || !o.name.trim()) return null
  const invoiceCurrencies = Array.isArray(o.invoiceCurrencies)
    ? o.invoiceCurrencies.filter((currency): currency is string => typeof currency === 'string' && Boolean(currency.trim()))
    : undefined
  return {
    entityId: o.entityId,
    type: o.type,
    name: o.name,
    taxCurrency: typeof o.taxCurrency === 'string' ? o.taxCurrency : undefined,
    invoiceCurrencies,
    taxRatesByYear: cleanTaxRatesByYear(o.taxRatesByYear),
    socialContribution: cleanSocialContributionByYear(o.socialContribution),
    createdAt: typeof o.createdAt === 'string' ? o.createdAt : null,
    updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : null,
    archivedAt: typeof o.archivedAt === 'string' ? o.archivedAt : null,
    builtIn: typeof o.builtIn === 'boolean' ? o.builtIn : undefined,
  }
}

const cleanBusinessEntities = (v: unknown): BusinessEntity[] | null => {
  if (!Array.isArray(v)) return null
  const entities = v.map(cleanBusinessEntity).filter((entity): entity is BusinessEntity => entity != null)
  return entities.length ? entities : null
}

export const businessEntitiesFromSettings = (settings: WorkspaceSettings | null): BusinessEntity[] => settings?.entities ?? []

export const activeBusinessEntities = (entities: BusinessEntity[]): BusinessEntity[] =>
  entities.filter((entity) => entity.entityId === 'autonomo' || !entity.archivedAt)

export const isUkrainianFopEntity = (entity: BusinessEntity | null | undefined): boolean =>
  entity?.type === 'UKRAINIAN_FOP_GROUP3_SIMPLIFIED'

const cleanInicioActividad = (v: unknown, taxYear: number): InicioActividadReductionSettings | null => {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const enabled = Boolean(o.enabled)
  const firstPositiveNetIncomeYear = cleanNumberOrNull(o.firstPositiveNetIncomeYear)
  const incomeFromPriorEmployerShareOver50 = typeof o.incomeFromPriorEmployerShareOver50 === 'boolean' ? o.incomeFromPriorEmployerShareOver50 : null
  const capEur = cleanNumberOrNull(o.capEur)
  return {
    enabled,
    firstPositiveNetIncomeYear: enabled ? firstPositiveNetIncomeYear ?? taxYear : firstPositiveNetIncomeYear,
    incomeFromPriorEmployerShareOver50,
    capEur,
  }
}

export const defaultRentaPlanningSettings = (taxYear: number): RentaPlanningSettings => ({
  enabled: false,
  taxYear,
  residence: 'DEFAULT',
  minimumPersonalFamiliar: null,
  inicioActividadReduction: null,
  otherGeneralIncome: null,
  otherReductions: null,
})

export const defaultIvaDeductionProfile = (): IvaDeductionProfile => ({
  hasVatDeductionRight: 'FULL',
  defaultExpenseVatDeductible: true,
  defaultExpenseVatDeductiblePercentage: 1,
  defaultIrpfDeductiblePercentage: 1,
  q4NegativeVatDefaultAction: 'CARRY_FORWARD',
  openingVatCredit: null,
})

const cleanIvaProfile = (v: unknown): IvaDeductionProfile => {
  const defaults = defaultIvaDeductionProfile()
  if (!v || typeof v !== 'object') return defaults
  const o = v as Record<string, unknown>
  const hasVatDeductionRight =
    o.hasVatDeductionRight === 'FULL' || o.hasVatDeductionRight === 'NONE' || o.hasVatDeductionRight === 'PARTIAL'
      ? o.hasVatDeductionRight
      : defaults.hasVatDeductionRight
  const q4NegativeVatDefaultAction =
    o.q4NegativeVatDefaultAction === 'CARRY_FORWARD' || o.q4NegativeVatDefaultAction === 'REQUEST_REFUND'
      ? o.q4NegativeVatDefaultAction
      : defaults.q4NegativeVatDefaultAction
  return {
    hasVatDeductionRight,
    defaultExpenseVatDeductible:
      typeof o.defaultExpenseVatDeductible === 'boolean' ? o.defaultExpenseVatDeductible : defaults.defaultExpenseVatDeductible,
    defaultExpenseVatDeductiblePercentage: cleanPercentage(
      o.defaultExpenseVatDeductiblePercentage,
      defaults.defaultExpenseVatDeductiblePercentage,
    ),
    defaultIrpfDeductiblePercentage: cleanPercentage(o.defaultIrpfDeductiblePercentage, defaults.defaultIrpfDeductiblePercentage),
    q4NegativeVatDefaultAction,
    openingVatCredit: cleanNumberOrNull(o.openingVatCredit),
  }
}

const cleanBalanceAccount = (v: unknown): BalanceAccount | null => {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const kind = o.kind === 'MAIN' || o.kind === 'CASH' || o.kind === 'OTHER' ? o.kind : null
  if (typeof o.accountId !== 'string' || !o.accountId.trim()) return null
  if (typeof o.name !== 'string' || !o.name.trim()) return null
  if (!kind) return null
  const openingBalance = cleanNumberOrNull(o.openingBalance)
  if (openingBalance == null) return null
  if (typeof o.openingDate !== 'string' || !o.openingDate.trim()) return null
  return {
    accountId: o.accountId,
    kind,
    name: o.name,
    openingBalance,
    openingDate: o.openingDate,
    archivedAt: typeof o.archivedAt === 'string' ? o.archivedAt : null,
    closedAt: typeof o.closedAt === 'string' ? o.closedAt : null,
  }
}

const cleanBalanceAccounts = (v: unknown): BalanceAccount[] | null => {
  if (!Array.isArray(v)) return null
  const accounts = v.map(cleanBalanceAccount).filter((account): account is BalanceAccount => account != null)
  return accounts.length ? accounts : null
}

export const normalizedBalanceAccounts = (settings: WorkspaceSettings | null): BalanceAccount[] => {
  if (!settings) return []
  if (settings.balanceAccounts?.length) return settings.balanceAccounts
  return [
    {
      accountId: 'main',
      kind: 'MAIN',
      name: 'Main',
      openingBalance: settings.openingBalance ?? 0,
      openingDate: settings.startDate,
      archivedAt: null,
      closedAt: null,
    },
  ]
}

const cleanRentaPlanning = (v: unknown, taxYear: number): RentaPlanningSettings | null => {
  if (!v || typeof v !== 'object') return defaultRentaPlanningSettings(taxYear)
  const o = v as Record<string, unknown>
  const enabled = Boolean(o.enabled)
  return {
    enabled,
    taxYear: cleanNumberOrNull(o.taxYear) ?? taxYear,
    residence: cleanTerritory(o.residence),
    minimumPersonalFamiliar: cleanNumberOrNull(o.minimumPersonalFamiliar),
    inicioActividadReduction: cleanInicioActividad(o.inicioActividadReduction, taxYear),
    otherGeneralIncome: cleanNumberOrNull(o.otherGeneralIncome),
    otherReductions: cleanNumberOrNull(o.otherReductions),
  }
}

const cleanRetaPlanning = (v: unknown): RetaPlanningSettings => {
  const defaults = defaultRetaPlanningSettings()
  if (!v || typeof v !== 'object') return defaults
  const o = v as Record<string, unknown>
  const tarifaRaw = o.tarifaPlana
  const tarifaPlana =
    tarifaRaw && typeof tarifaRaw === 'object'
      ? {
          enabled: Boolean((tarifaRaw as Record<string, unknown>).enabled),
          startDate: typeof (tarifaRaw as Record<string, unknown>).startDate === 'string' ? ((tarifaRaw as Record<string, unknown>).startDate as string) : null,
          endDate: typeof (tarifaRaw as Record<string, unknown>).endDate === 'string' ? ((tarifaRaw as Record<string, unknown>).endDate as string) : null,
          fixedMonthlyCuota: Math.max(0, cleanNumber((tarifaRaw as Record<string, unknown>).fixedMonthlyCuota, 88.64)),
        }
      : null
  return {
    enabled: o.enabled !== false,
    estimationDirectaMode: cleanRetaEstimationDirectaMode(o.estimationDirectaMode),
    genericDeductionMode: cleanRetaGenericDeductionMode(o.genericDeductionMode),
    defaultBaseSelectionPolicy: cleanRetaBaseSelectionPolicy(o.defaultBaseSelectionPolicy),
    defaultCustomContributionBase: cleanNumberOrNull(o.defaultCustomContributionBase),
    tarifaPlana,
  }
}

export const cleanWorkspaceSettings = (s: WorkspaceSettings): WorkspaceSettings => ({
  year: s.year,
  startDate: s.startDate,
  ivaStd: s.ivaStd,
  irpfRate: s.irpfRate,
  obligacion130: s.obligacion130,
  openingBalance: s.openingBalance ?? null,
  balanceAccounts: cleanBalanceAccounts((s as unknown as Record<string, unknown>).balanceAccounts),
  rentaPlanning: cleanRentaPlanning((s as unknown as Record<string, unknown>).rentaPlanning, s.year),
  retaPlanning: cleanRetaPlanning((s as unknown as Record<string, unknown>).retaPlanning),
  ivaProfile: cleanIvaProfile((s as unknown as Record<string, unknown>).ivaProfile),
  entities: cleanBusinessEntities((s as unknown as Record<string, unknown>).entities),
})
