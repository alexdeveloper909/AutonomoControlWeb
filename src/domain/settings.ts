export type WorkspaceSettings = {
  year: number
  startDate: string
  ivaStd: number
  irpfRate: number
  obligacion130: boolean
  openingBalance: number | null
  expenseCategories: string[]
}

export const cleanWorkspaceSettings = (s: WorkspaceSettings): WorkspaceSettings => ({
  year: s.year,
  startDate: s.startDate,
  ivaStd: s.ivaStd,
  irpfRate: s.irpfRate,
  obligacion130: s.obligacion130,
  openingBalance: s.openingBalance ?? null,
  expenseCategories: Array.isArray(s.expenseCategories) ? s.expenseCategories.slice() : [],
})
