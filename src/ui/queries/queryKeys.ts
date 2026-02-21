import type { RecordType } from '../../domain/records'

export const queryKeys = {
  workspaceSettings: (workspaceId: string) => ['workspaces', workspaceId, 'settings'] as const,

  recordsByYear: (workspaceId: string, recordType: RecordType, year: string) =>
    ['workspaces', workspaceId, 'recordsByYear', recordType, year] as const,
  recordsByYearRecordType: (workspaceId: string, recordType: RecordType) =>
    ['workspaces', workspaceId, 'recordsByYear', recordType] as const,

  record: (workspaceId: string, recordType: RecordType, eventDate: string, recordId: string) =>
    ['workspaces', workspaceId, 'record', recordType, eventDate, recordId] as const,

  summaries: (workspaceId: string) => ['workspaces', workspaceId, 'summaries'] as const,

  regularSpendings: (workspaceId: string) => ['workspaces', workspaceId, 'regularSpendings'] as const,
  regularSpendingOccurrences: (workspaceId: string, from: string, to: string) =>
    ['workspaces', workspaceId, 'regularSpendingOccurrences', from, to] as const,
} as const
