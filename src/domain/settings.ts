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

export type WorkspaceSettings = {
  year: number
  startDate: string
  ivaStd: number
  irpfRate: number
  obligacion130: boolean
  openingBalance: number | null
  rentaPlanning: RentaPlanningSettings | null
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

export const cleanWorkspaceSettings = (s: WorkspaceSettings): WorkspaceSettings => ({
  year: s.year,
  startDate: s.startDate,
  ivaStd: s.ivaStd,
  irpfRate: s.irpfRate,
  obligacion130: s.obligacion130,
  openingBalance: s.openingBalance ?? null,
  rentaPlanning: cleanRentaPlanning((s as unknown as Record<string, unknown>).rentaPlanning, s.year),
})
