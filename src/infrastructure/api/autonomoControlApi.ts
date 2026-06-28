import type { Workspace } from '../../domain/workspace'
import { cleanWorkspaceSettings, type BusinessEntity, type WorkspaceSettings } from '../../domain/settings'
import type {
  RecordResponse,
  RecordType,
  RecordPayload,
  RegularSpendingOccurrencesResponse,
  UkrainianFopSummaryRow,
  UkrainianFopYearSummary,
} from '../../domain/records'
import type { BalanceResponse } from '../../domain/balance'
import type { UserMe } from '../../domain/user'
import type { AppLanguage } from '../../domain/language'
import { isAppLanguage } from '../../domain/language'
import { cleanRetaEstimate, type RetaEstimate, type RetaScenarioSettings } from '../../domain/reta'
import { env, requireEnv } from '../config/env'
import { jsonFetch } from '../http/jsonFetch'

type ListResponse<T> = { items: T[]; nextToken?: string | null }
type WorkspaceSettingsResponse = { workspaceId: string; settings: WorkspaceSettings }
type BusinessEntitiesResponse = { items: BusinessEntity[] }
type BusinessEntityResponse = { entity: BusinessEntity }
type UkrainianFopSummaryResponse = {
  entity?: BusinessEntity
  summary?: Omit<UkrainianFopYearSummary, 'workspaceId' | 'entity' | 'isComplete' | 'warnings'>
  isComplete?: boolean
} & Partial<UkrainianFopYearSummary>
type NbuExchangeRateResponse = {
  currency: string
  date: string
  rate: number
  source?: string
  fetchedAt?: string | null
}
type UserMeResponse = {
  userId: string
  email?: string | null
  givenName?: string | null
  familyName?: string | null
  preferredLanguage?: string | null
}

type WorkspaceShareResponse = { workspaceId: string; emailLower: string; role: string; status: string }

const moneyValue = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && Number.isFinite(Number(value))) return Number(value)
  if (value && typeof value === 'object') {
    const amount = (value as Record<string, unknown>).amount
    if (typeof amount === 'number' && Number.isFinite(amount)) return amount
    if (typeof amount === 'string' && Number.isFinite(Number(amount))) return Number(amount)
  }
  return 0
}

const monthKeyValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return undefined
  const objectValue = value as Record<string, unknown>
  const yearMonth = objectValue.ym
  if (typeof yearMonth === 'string') return yearMonth
  if (yearMonth && typeof yearMonth === 'object') {
    const ym = yearMonth as Record<string, unknown>
    if (typeof ym.year === 'number' && typeof ym.monthValue === 'number') {
      return `${ym.year}-${String(ym.monthValue).padStart(2, '0')}`
    }
  }
  return undefined
}

const quarterKeyValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return undefined
  const quarterKey = value as Record<string, unknown>
  if (typeof quarterKey.year === 'number' && typeof quarterKey.quarter === 'number') {
    return `${quarterKey.year}-Q${quarterKey.quarter}`
  }
  return undefined
}

const normalizeUkrainianFopSummaryRow = (row: Partial<UkrainianFopSummaryRow> | undefined): UkrainianFopSummaryRow => {
  const raw = row as Record<string, unknown> | undefined
  return {
    ...row,
    monthKey: monthKeyValue(raw?.monthKey),
    quarterKey: quarterKeyValue(raw?.quarterKey),
    taxCurrency: row?.taxCurrency ?? 'UAH',
    invoiceCount: row?.invoiceCount ?? 0,
    taxableRevenue: moneyValue(row?.taxableRevenue),
    singleTaxRate: row?.singleTaxRate,
    singleTax: moneyValue(row?.singleTax),
    militaryLevyRate: row?.militaryLevyRate,
    militaryLevy: moneyValue(row?.militaryLevy),
    socialContribution: moneyValue(row?.socialContribution),
    availableEstimate: moneyValue(row?.availableEstimate),
  }
}

export type RecordsSort = 'eventDateDesc'
export type RecordsListOptions = { sort?: RecordsSort; limit?: number; nextToken?: string | null }

export class AutonomoControlApi {
  private readonly baseUrl: string
  private readonly getIdToken: () => string | null

  constructor(getIdToken: () => string | null) {
    this.baseUrl = requireEnv(env.apiBaseUrl, 'VITE_API_BASE_URL')
    this.getIdToken = getIdToken
  }

  private authHeaders(): HeadersInit {
    const idToken = this.getIdToken()
    if (!idToken) return {}
    return { Authorization: `Bearer ${idToken}` }
  }

  async getUserMe(): Promise<UserMe> {
    const res = await jsonFetch<UserMeResponse>(new URL('/users/me', this.baseUrl).toString(), {
      headers: this.authHeaders(),
    })
    return {
      userId: res.userId,
      email: res.email ?? null,
      givenName: res.givenName ?? null,
      familyName: res.familyName ?? null,
      preferredLanguage: isAppLanguage(res.preferredLanguage) ? res.preferredLanguage : null,
    }
  }

  async putUserPreferredLanguage(preferredLanguage: AppLanguage): Promise<UserMe> {
    const res = await jsonFetch<UserMeResponse>(new URL('/users/me', this.baseUrl).toString(), {
      method: 'PUT',
      headers: this.authHeaders(),
      body: { preferredLanguage },
    })
    return {
      userId: res.userId,
      email: res.email ?? null,
      givenName: res.givenName ?? null,
      familyName: res.familyName ?? null,
      preferredLanguage: isAppLanguage(res.preferredLanguage) ? res.preferredLanguage : null,
    }
  }

  async listWorkspaces(options?: { includeDeleted?: boolean }): Promise<Workspace[]> {
    const url = new URL('/workspaces', this.baseUrl)
    if (options?.includeDeleted) url.searchParams.set('includeDeleted', 'true')
    const res = await jsonFetch<ListResponse<Workspace>>(url.toString(), {
      headers: this.authHeaders(),
    })
    return res.items
  }

  async createWorkspace(input: { name: string; settings: WorkspaceSettings }): Promise<{
    workspace: Workspace
    settings: WorkspaceSettings
  }> {
    const res = await jsonFetch<{ workspace: Workspace; settings: WorkspaceSettings }>(new URL('/workspaces', this.baseUrl).toString(), {
      method: 'POST',
      headers: this.authHeaders(),
      body: { ...input, settings: cleanWorkspaceSettings(input.settings) },
    })
    return { ...res, settings: cleanWorkspaceSettings(res.settings) }
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    await jsonFetch<void>(new URL(`/workspaces/${workspaceId}`, this.baseUrl).toString(), {
      method: 'DELETE',
      headers: this.authHeaders(),
    })
  }

  async restoreWorkspace(workspaceId: string): Promise<void> {
    await jsonFetch<void>(new URL(`/workspaces/${workspaceId}/restore`, this.baseUrl).toString(), {
      method: 'POST',
      headers: this.authHeaders(),
    })
  }

  async shareWorkspaceReadOnly(workspaceId: string, input: { email: string }): Promise<WorkspaceShareResponse> {
    return jsonFetch<WorkspaceShareResponse>(new URL(`/workspaces/${workspaceId}/share`, this.baseUrl).toString(), {
      method: 'POST',
      headers: this.authHeaders(),
      body: input,
    })
  }

  async getWorkspaceSettings(workspaceId: string): Promise<WorkspaceSettings> {
    const res = await jsonFetch<WorkspaceSettingsResponse>(
      new URL(`/workspaces/${workspaceId}/settings`, this.baseUrl).toString(),
      {
        headers: this.authHeaders(),
      },
    )
    return cleanWorkspaceSettings(res.settings)
  }

  async putWorkspaceSettings(workspaceId: string, settings: WorkspaceSettings): Promise<WorkspaceSettings> {
    const res = await jsonFetch<WorkspaceSettingsResponse>(
      new URL(`/workspaces/${workspaceId}/settings`, this.baseUrl).toString(),
      {
        method: 'PUT',
        headers: this.authHeaders(),
        body: cleanWorkspaceSettings(settings),
      },
    )
    return cleanWorkspaceSettings(res.settings)
  }

  async listBusinessEntities(workspaceId: string, includeArchived = false): Promise<BusinessEntity[]> {
    const url = new URL(`/workspaces/${workspaceId}/business-entities`, this.baseUrl)
    if (includeArchived) url.searchParams.set('includeArchived', 'true')
    const res = await jsonFetch<BusinessEntitiesResponse>(url.toString(), { headers: this.authHeaders() })
    return res.items
  }

  async createBusinessEntity(workspaceId: string, payload: Omit<BusinessEntity, 'entityId' | 'createdAt' | 'updatedAt' | 'archivedAt'>): Promise<BusinessEntity> {
    const res = await jsonFetch<BusinessEntityResponse>(new URL(`/workspaces/${workspaceId}/business-entities`, this.baseUrl).toString(), {
      method: 'POST',
      headers: this.authHeaders(),
      body: payload,
    })
    return res.entity
  }

  async updateBusinessEntity(workspaceId: string, entityId: string, payload: BusinessEntity): Promise<BusinessEntity> {
    const res = await jsonFetch<BusinessEntityResponse>(new URL(`/workspaces/${workspaceId}/business-entities/${entityId}`, this.baseUrl).toString(), {
      method: 'PUT',
      headers: this.authHeaders(),
      body: payload,
    })
    return res.entity
  }

  async archiveBusinessEntity(workspaceId: string, entityId: string): Promise<BusinessEntity> {
    const res = await jsonFetch<BusinessEntityResponse>(new URL(`/workspaces/${workspaceId}/business-entities/${entityId}/archive`, this.baseUrl).toString(), {
      method: 'POST',
      headers: this.authHeaders(),
    })
    return res.entity
  }

  async getBalance(workspaceId: string, options?: { year?: string | number; accountId?: string | null }): Promise<BalanceResponse> {
    const url = new URL(`/workspaces/${workspaceId}/balance`, this.baseUrl)
    if (options?.year != null) url.searchParams.set('year', String(options.year))
    if (options?.accountId) url.searchParams.set('accountId', options.accountId)
    const res = await jsonFetch<BalanceResponse>(url.toString(), { headers: this.authHeaders() })
    return {
      ...res,
      year: res.year ?? null,
      selectedAccountId: res.selectedAccountId ?? null,
      nextPageToken: res.nextPageToken ?? null,
      accounts: res.accounts.map((account) => ({
        ...account,
        closedAt: account.closedAt ?? null,
      })),
      ledgerRows: res.ledgerRows.map((row) => ({
        ...row,
        operation: row.operation ?? null,
        accountId: row.accountId ?? null,
        fromAccountId: row.fromAccountId ?? null,
        toAccountId: row.toAccountId ?? null,
        selectedAccountImpact: row.selectedAccountImpact ?? null,
        selectedAccountRunningBalance: row.selectedAccountRunningBalance ?? null,
        note: row.note ?? null,
      })),
    }
  }

  async listRecordsByMonth(workspaceId: string, monthKey: string, recordType?: RecordType): Promise<RecordResponse[]> {
    const res = await this.listRecordsByMonthPaged(workspaceId, monthKey, { recordType })
    return res.items
  }

  async listRecordsByYear(workspaceId: string, year: string, recordType?: RecordType): Promise<RecordResponse[]> {
    const res = await this.listRecordsByYearPaged(workspaceId, year, { recordType })
    return res.items
  }

  async listRecordsByMonthPaged(
    workspaceId: string,
    monthKey: string,
    options?: { recordType?: RecordType } & RecordsListOptions,
  ): Promise<ListResponse<RecordResponse>> {
    const url = new URL(`/workspaces/${workspaceId}/records`, this.baseUrl)
    url.searchParams.set('month', monthKey)
    if (options?.recordType) url.searchParams.set('recordType', options.recordType)
    if (options?.sort) url.searchParams.set('sort', options.sort)
    if (options?.limit != null) url.searchParams.set('limit', String(options.limit))
    if (options?.nextToken) url.searchParams.set('nextToken', options.nextToken)
    const res = await jsonFetch<ListResponse<RecordResponse>>(url.toString(), { headers: this.authHeaders() })
    return { items: res.items, nextToken: res.nextToken ?? null }
  }

  async listRecordsByYearPaged(
    workspaceId: string,
    year: string,
    options?: { recordType?: RecordType } & RecordsListOptions,
  ): Promise<ListResponse<RecordResponse>> {
    const url = new URL(`/workspaces/${workspaceId}/records`, this.baseUrl)
    url.searchParams.set('year', year)
    if (options?.recordType) url.searchParams.set('recordType', options.recordType)
    if (options?.sort) url.searchParams.set('sort', options.sort)
    if (options?.limit != null) url.searchParams.set('limit', String(options.limit))
    if (options?.nextToken) url.searchParams.set('nextToken', options.nextToken)
    const res = await jsonFetch<ListResponse<RecordResponse>>(url.toString(), { headers: this.authHeaders() })
    return { items: res.items, nextToken: res.nextToken ?? null }
  }

  async listInvoiceRecordsByEntityYear(
    workspaceId: string,
    entityId: string,
    year: string,
    options?: RecordsListOptions,
  ): Promise<ListResponse<RecordResponse>> {
    const url = new URL(`/workspaces/${workspaceId}/records`, this.baseUrl)
    url.searchParams.set('year', year)
    url.searchParams.set('recordType', 'BUSINESS_ENTITY_INVOICE')
    url.searchParams.set('entityId', entityId)
    if (options?.sort) url.searchParams.set('sort', options.sort)
    if (options?.limit != null) url.searchParams.set('limit', String(options.limit))
    if (options?.nextToken) url.searchParams.set('nextToken', options.nextToken)
    const res = await jsonFetch<ListResponse<RecordResponse>>(url.toString(), { headers: this.authHeaders() })
    return { items: res.items, nextToken: res.nextToken ?? null }
  }

  async listRecordsByQuarter(
    workspaceId: string,
    quarterKey: string,
    recordType?: RecordType,
  ): Promise<RecordResponse[]> {
    const res = await this.listRecordsByQuarterPaged(workspaceId, quarterKey, { recordType })
    return res.items
  }

  async listRecordsByQuarterPaged(
    workspaceId: string,
    quarterKey: string,
    options?: { recordType?: RecordType } & RecordsListOptions,
  ): Promise<ListResponse<RecordResponse>> {
    const url = new URL(`/workspaces/${workspaceId}/records`, this.baseUrl)
    url.searchParams.set('quarter', quarterKey)
    if (options?.recordType) url.searchParams.set('recordType', options.recordType)
    if (options?.sort) url.searchParams.set('sort', options.sort)
    if (options?.limit != null) url.searchParams.set('limit', String(options.limit))
    if (options?.nextToken) url.searchParams.set('nextToken', options.nextToken)
    const res = await jsonFetch<ListResponse<RecordResponse>>(url.toString(), { headers: this.authHeaders() })
    return { items: res.items, nextToken: res.nextToken ?? null }
  }

  async createRecord(workspaceId: string, input: { recordType: RecordType; recordId?: string; payload: RecordPayload }) {
    return jsonFetch<RecordResponse>(new URL(`/workspaces/${workspaceId}/records`, this.baseUrl).toString(), {
      method: 'POST',
      headers: this.authHeaders(),
      body: input,
    })
  }

  async getRecord(workspaceId: string, recordType: RecordType, eventDate: string, recordId: string): Promise<RecordResponse> {
    return jsonFetch<RecordResponse>(
      new URL(`/workspaces/${workspaceId}/records/${recordType}/${eventDate}/${recordId}`, this.baseUrl).toString(),
      { headers: this.authHeaders() },
    )
  }

  async updateRecord(
    workspaceId: string,
    recordType: RecordType,
    eventDate: string,
    recordId: string,
    input: { recordType: RecordType; payload: RecordPayload },
  ): Promise<RecordResponse> {
    return jsonFetch<RecordResponse>(
      new URL(`/workspaces/${workspaceId}/records/${recordType}/${eventDate}/${recordId}`, this.baseUrl).toString(),
      {
        method: 'PUT',
        headers: this.authHeaders(),
        body: input,
      },
    )
  }

  async deleteRecord(workspaceId: string, recordType: RecordType, eventDate: string, recordId: string): Promise<void> {
    await jsonFetch<void>(new URL(`/workspaces/${workspaceId}/records/${recordType}/${eventDate}/${recordId}`, this.baseUrl).toString(), {
      method: 'DELETE',
      headers: this.authHeaders(),
    })
  }

  async getUkrainianFopSummary(workspaceId: string, entityId: string, year: string | number): Promise<UkrainianFopYearSummary> {
    const url = new URL(`/workspaces/${workspaceId}/business-entities/${entityId}/summary`, this.baseUrl)
    url.searchParams.set('year', String(year))
    const res = await jsonFetch<UkrainianFopSummaryResponse>(url.toString(), { headers: this.authHeaders() })
    if (!res.summary) {
      return {
        workspaceId: res.workspaceId ?? workspaceId,
        entity: res.entity ?? null,
        year: res.year ?? Number(year),
        isComplete: res.isComplete ?? false,
        warnings: res.warnings,
        warningCodes: res.warningCodes,
        effectiveYearSettings: res.effectiveYearSettings,
        months: (res.months ?? []).map(normalizeUkrainianFopSummaryRow),
        quarters: (res.quarters ?? []).map(normalizeUkrainianFopSummaryRow),
        totals: normalizeUkrainianFopSummaryRow(res.totals),
      }
    }
    return {
      ...res.summary,
      workspaceId,
      entity: res.entity ?? null,
      isComplete: res.isComplete ?? false,
      months: (res.summary.months ?? []).map(normalizeUkrainianFopSummaryRow),
      quarters: (res.summary.quarters ?? []).map(normalizeUkrainianFopSummaryRow),
      totals: normalizeUkrainianFopSummaryRow(res.summary.totals),
    }
  }

  async getNbuExchangeRate(currency: 'USD', date: string): Promise<NbuExchangeRateResponse> {
    const url = new URL('/exchange-rates/nbu', this.baseUrl)
    url.searchParams.set('currency', currency)
    url.searchParams.set('date', date)
    return jsonFetch<NbuExchangeRateResponse>(url.toString(), { headers: this.authHeaders() })
  }

  async monthSummaries(workspaceId: string, settings: WorkspaceSettings): Promise<{ settings: WorkspaceSettings; items: unknown[] }> {
    return jsonFetch(new URL(`/workspaces/${workspaceId}/summaries/months`, this.baseUrl).toString(), {
      method: 'POST',
      headers: this.authHeaders(),
      body: settings,
    })
  }

  async quarterSummaries(
    workspaceId: string,
    settings: WorkspaceSettings,
  ): Promise<{ settings: WorkspaceSettings; items: unknown[] }> {
    return jsonFetch(new URL(`/workspaces/${workspaceId}/summaries/quarters`, this.baseUrl).toString(), {
      method: 'POST',
      headers: this.authHeaders(),
      body: settings,
    })
  }

  async rentaSummary(
    workspaceId: string,
    settings: WorkspaceSettings,
  ): Promise<{ settings: WorkspaceSettings; renta: unknown | null; rentaProjected?: unknown | null }> {
    return jsonFetch(new URL(`/workspaces/${workspaceId}/summaries/renta`, this.baseUrl).toString(), {
      method: 'POST',
      headers: this.authHeaders(),
      body: settings,
    })
  }

  async retaSummary(
    workspaceId: string,
    settings: WorkspaceSettings,
    scenario: RetaScenarioSettings,
  ): Promise<{ settings: WorkspaceSettings; reta: RetaEstimate | null }> {
    const res = await jsonFetch<{ settings: WorkspaceSettings; reta: unknown }>(
      new URL(`/workspaces/${workspaceId}/summaries/reta`, this.baseUrl).toString(),
      {
        method: 'POST',
        headers: this.authHeaders(),
        body: { settings: cleanWorkspaceSettings(settings), scenario },
      },
    )
    return { settings: cleanWorkspaceSettings(res.settings), reta: cleanRetaEstimate(res.reta) }
  }

  async ivaSummary(
    workspaceId: string,
    settings: WorkspaceSettings,
  ): Promise<{ settings: WorkspaceSettings; iva: unknown | null }> {
    return jsonFetch(new URL(`/workspaces/${workspaceId}/summaries/iva`, this.baseUrl).toString(), {
      method: 'POST',
      headers: this.authHeaders(),
      body: settings,
    })
  }

  async listRegularSpendings(workspaceId: string): Promise<ListResponse<RecordResponse>> {
    const url = new URL(`/workspaces/${workspaceId}/regular-spendings`, this.baseUrl)
    const res = await jsonFetch<ListResponse<RecordResponse>>(url.toString(), { headers: this.authHeaders() })
    return { items: res.items, nextToken: res.nextToken ?? null }
  }

  async listRegularSpendingOccurrences(
    workspaceId: string,
    params: { from: string; to: string },
  ): Promise<RegularSpendingOccurrencesResponse> {
    const url = new URL(`/workspaces/${workspaceId}/regular-spendings/occurrences`, this.baseUrl)
    url.searchParams.set('from', params.from)
    url.searchParams.set('to', params.to)
    return jsonFetch<RegularSpendingOccurrencesResponse>(url.toString(), { headers: this.authHeaders() })
  }
}
