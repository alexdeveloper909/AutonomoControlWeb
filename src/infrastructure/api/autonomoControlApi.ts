import type { Workspace } from '../../domain/workspace'
import { cleanWorkspaceSettings, type WorkspaceSettings } from '../../domain/settings'
import type { RecordResponse, RecordType, RecordPayload } from '../../domain/records'
import type { UserMe } from '../../domain/user'
import type { AppLanguage } from '../../domain/language'
import { isAppLanguage } from '../../domain/language'
import { env, requireEnv } from '../config/env'
import { jsonFetch } from '../http/jsonFetch'

type ListResponse<T> = { items: T[]; nextToken?: string | null }
type WorkspaceSettingsResponse = { workspaceId: string; settings: WorkspaceSettings }
type UserMeResponse = {
  userId: string
  email?: string | null
  givenName?: string | null
  familyName?: string | null
  preferredLanguage?: string | null
}

type WorkspaceShareResponse = { workspaceId: string; emailLower: string; role: string; status: string }

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
}
