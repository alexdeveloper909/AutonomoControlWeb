import type { RecordType } from '../../domain/records'

export const queryKeys = {
  workspaceSettings: (workspaceId: string) => ['workspaces', workspaceId, 'settings'] as const,
  businessEntities: (workspaceId: string, includeArchived = false) =>
    ['workspaces', workspaceId, 'businessEntities', includeArchived ? 'archived' : 'active'] as const,
  businessEntitiesAll: (workspaceId: string) => ['workspaces', workspaceId, 'businessEntities'] as const,
  balance: (workspaceId: string, year: string, accountId: string | null) =>
    ['workspaces', workspaceId, 'balance', year, accountId ?? 'all'] as const,
  balanceAll: (workspaceId: string) => ['workspaces', workspaceId, 'balance'] as const,

  recordsByYear: (workspaceId: string, recordType: RecordType, year: string) =>
    ['workspaces', workspaceId, 'recordsByYear', recordType, year] as const,
  recordsByYearRecordType: (workspaceId: string, recordType: RecordType) =>
    ['workspaces', workspaceId, 'recordsByYear', recordType] as const,
  entityInvoiceRecordsByYear: (workspaceId: string, entityId: string, year: string) =>
    ['workspaces', workspaceId, 'businessEntities', entityId, 'recordsByYear', 'BUSINESS_ENTITY_INVOICE', year] as const,
  entityInvoiceRecordsAll: (workspaceId: string, entityId: string) =>
    ['workspaces', workspaceId, 'businessEntities', entityId, 'recordsByYear', 'BUSINESS_ENTITY_INVOICE'] as const,

  record: (workspaceId: string, recordType: RecordType, eventDate: string, recordId: string) =>
    ['workspaces', workspaceId, 'record', recordType, eventDate, recordId] as const,

  summaries: (workspaceId: string) => ['workspaces', workspaceId, 'summaries'] as const,
  retaSummaries: (workspaceId: string) => ['workspaces', workspaceId, 'summaries', 'reta'] as const,
  retaSummary: (workspaceId: string, settingsYear: number, scenarioKey: string) =>
    ['workspaces', workspaceId, 'summaries', 'reta', settingsYear, scenarioKey] as const,
  entitySummary: (workspaceId: string, entityId: string, year: string) =>
    ['workspaces', workspaceId, 'businessEntities', entityId, 'summary', year] as const,
  entitySummariesAll: (workspaceId: string, entityId: string) =>
    ['workspaces', workspaceId, 'businessEntities', entityId, 'summary'] as const,

  regularSpendings: (workspaceId: string) => ['workspaces', workspaceId, 'regularSpendings'] as const,
  regularSpendingOccurrencesAll: (workspaceId: string) =>
    ['workspaces', workspaceId, 'regularSpendingOccurrences'] as const,
  regularSpendingOccurrences: (workspaceId: string, from: string, to: string) =>
    ['workspaces', workspaceId, 'regularSpendingOccurrences', from, to] as const,
} as const
