export const DEFAULT_EXPENSE_CATEGORY_KEYS = [
  'healthInsurance',
  'homeOfficeUtilityBills',
  'homeOfficeRentalExpense',
  'personalNonDeductible',
  'professionalExpenses',
  'socialSecurityAndProfFees',
  'transportationAndAccommodation',
  'foodAndDrinksIncludingLunch',
  'purchaseOfGoods',
  'businessLunchWithClients',
  'gasolineAndVehicleExpenses',
  'computerHardwareAndSoftware',
  'furnitureAndOtherTangibleAssets',
  'other',
] as const

export type DefaultExpenseCategoryKey = (typeof DEFAULT_EXPENSE_CATEGORY_KEYS)[number]

export const defaultExpenseCategories = (t: (key: string) => string): string[] =>
  DEFAULT_EXPENSE_CATEGORY_KEYS.map((k) => t(`expenseCategories.defaults.${k}`))
