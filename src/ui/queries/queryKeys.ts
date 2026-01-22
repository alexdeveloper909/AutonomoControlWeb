import type { RecordType } from '../../domain/records'

export const queryKeys = {
  workspaceSettings: (workspaceId: string) => ['workspaces', workspaceId, 'settings'] as const,

  recordsByYear: (workspaceId: string, recordType: RecordType, year: string) =>
    ['workspaces', workspaceId, 'recordsByYear', recordType, year] as const,
  recordsByYearRecordType: (workspaceId: string, recordType: RecordType) =>
    ['workspaces', workspaceId, 'recordsByYear', recordType] as const,

  summaries: (workspaceId: string) => ['workspaces', workspaceId, 'summaries'] as const,
} as const

