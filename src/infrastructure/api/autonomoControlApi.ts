import type { Workspace } from '../../domain/workspace'
import type { WorkspaceSettings } from '../../domain/settings'
import type { RecordResponse, RecordType, RecordPayload } from '../../domain/records'
import { env, requireEnv } from '../config/env'
import { jsonFetch } from '../http/jsonFetch'

type ListResponse<T> = { items: T[] }
type WorkspaceSettingsResponse = { workspaceId: string; settings: WorkspaceSettings }

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

  async listWorkspaces(): Promise<Workspace[]> {
    const res = await jsonFetch<ListResponse<Workspace>>(new URL('/workspaces', this.baseUrl).toString(), {
      headers: this.authHeaders(),
    })
    return res.items
  }

  async createWorkspace(input: { name: string; settings: WorkspaceSettings }): Promise<{
    workspace: Workspace
    settings: WorkspaceSettings
  }> {
    return jsonFetch(new URL('/workspaces', this.baseUrl).toString(), {
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
    return res.settings
  }

  async putWorkspaceSettings(workspaceId: string, settings: WorkspaceSettings): Promise<WorkspaceSettings> {
    const res = await jsonFetch<WorkspaceSettingsResponse>(
      new URL(`/workspaces/${workspaceId}/settings`, this.baseUrl).toString(),
      {
        method: 'PUT',
        headers: this.authHeaders(),
        body: settings,
      },
    )
    return res.settings
  }

  async listRecordsByMonth(workspaceId: string, monthKey: string, recordType?: RecordType): Promise<RecordResponse[]> {
    const url = new URL(`/workspaces/${workspaceId}/records`, this.baseUrl)
    url.searchParams.set('month', monthKey)
    if (recordType) url.searchParams.set('recordType', recordType)
    const res = await jsonFetch<ListResponse<RecordResponse>>(url.toString(), { headers: this.authHeaders() })
    return res.items
  }

  async listRecordsByQuarter(
    workspaceId: string,
    quarterKey: string,
    recordType?: RecordType,
  ): Promise<RecordResponse[]> {
    const url = new URL(`/workspaces/${workspaceId}/records`, this.baseUrl)
    url.searchParams.set('quarter', quarterKey)
    if (recordType) url.searchParams.set('recordType', recordType)
    const res = await jsonFetch<ListResponse<RecordResponse>>(url.toString(), { headers: this.authHeaders() })
    return res.items
  }

  async createRecord(workspaceId: string, input: { recordType: RecordType; recordId?: string; payload: RecordPayload }) {
    return jsonFetch<RecordResponse>(new URL(`/workspaces/${workspaceId}/records`, this.baseUrl).toString(), {
      method: 'POST',
      headers: this.authHeaders(),
      body: input,
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
}
