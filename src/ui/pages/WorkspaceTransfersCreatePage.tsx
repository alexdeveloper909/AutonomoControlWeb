import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
} from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import type { InternalTransferPayload, RecordResponse, TransferOp, TransferPayload } from '../../domain/records'
import type { BalanceAccount, WorkspaceSettings } from '../../domain/settings'
import { normalizedBalanceAccounts } from '../../domain/settings'
import { PageHeader } from '../components/PageHeader'
import { ErrorAlert } from '../components/ErrorAlert'
import { EuroTextField } from '../components/EuroTextField'
import { FieldLabel } from '../components/FieldLabel'
import { parseEuroAmount } from '../lib/money'
import { queryKeys } from '../queries/queryKeys'
import { useTranslation } from 'react-i18next'
import { ResponsiveActionRow } from '../components/ResponsiveActionRow'

type MovementMode = 'ExternalInflow' | 'ExternalOutflow' | 'InternalTransfer'
type BalancePayload = TransferPayload | InternalTransferPayload

const errorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err))

const todayIso = (): string => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const isIsoDate = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s)

const asBalancePayload = (payload: unknown): BalancePayload | null => {
  if (!payload || typeof payload !== 'object') return null
  const p = payload as Record<string, unknown>
  const date = p.date
  const amount = p.amount
  const note = p.note
  if (typeof date !== 'string') return null
  if (typeof amount !== 'number') return null
  if (note != null && typeof note !== 'string') return null
  if (p.movementType === 'InternalTransfer') {
    if (typeof p.fromAccountId !== 'string' || typeof p.toAccountId !== 'string') return null
    return {
      date,
      movementType: 'InternalTransfer',
      fromAccountId: p.fromAccountId,
      toAccountId: p.toAccountId,
      amount,
      note: note ?? undefined,
    }
  }
  if (p.operation !== 'Inflow' && p.operation !== 'Outflow') return null
  if (p.accountId != null && typeof p.accountId !== 'string') return null
  return { date, operation: p.operation, amount, accountId: p.accountId ?? 'main', note: note ?? undefined }
}

const activeOrExistingAccounts = (accounts: BalanceAccount[], existingAccountIds: Set<string>): BalanceAccount[] =>
  accounts.filter((account) => (!account.archivedAt && !account.closedAt) || existingAccountIds.has(account.accountId))

export function WorkspaceTransfersCreatePage(props: {
  workspaceId: string
  api: AutonomoControlApi
  mode?: 'create' | 'edit'
  eventDate?: string
  recordId?: string
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const mode = props.mode ?? 'create'
  const editing = mode === 'edit'

  const recordQuery = useQuery<RecordResponse, unknown>({
    queryKey:
      editing && props.eventDate && props.recordId
        ? queryKeys.record(props.workspaceId, 'TRANSFER', props.eventDate, props.recordId)
        : ['workspaces', props.workspaceId, 'record', 'TRANSFER', props.eventDate ?? '', props.recordId ?? ''],
    queryFn: () => props.api.getRecord(props.workspaceId, 'TRANSFER', props.eventDate!, props.recordId!),
    enabled: editing && Boolean(props.eventDate && props.recordId),
  })
  const settingsQuery = useQuery({
    queryKey: queryKeys.workspaceSettings(props.workspaceId),
    queryFn: () => props.api.getWorkspaceSettings(props.workspaceId),
  })

  const settings = (settingsQuery.data ?? null) as WorkspaceSettings | null
  const allAccounts = useMemo(() => normalizedBalanceAccounts(settings), [settings])

  const [date, setDate] = useState(todayIso())
  const [movementMode, setMovementMode] = useState<MovementMode>('ExternalInflow')
  const [accountId, setAccountId] = useState('main')
  const [fromAccountId, setFromAccountId] = useState('main')
  const [toAccountId, setToAccountId] = useState('')
  const [amount, setAmount] = useState('150')
  const [note, setNote] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initializedFromRecord, setInitializedFromRecord] = useState(false)
  const [existingAccountIds, setExistingAccountIds] = useState<Set<string>>(new Set())

  const backToPath = `/workspaces/${props.workspaceId}/balance`
  const accountOptions = useMemo(() => activeOrExistingAccounts(allAccounts, existingAccountIds), [allAccounts, existingAccountIds])

  useEffect(() => {
    if (accountOptions.length && !toAccountId) {
      setToAccountId(accountOptions.find((account) => account.accountId !== fromAccountId)?.accountId ?? accountOptions[0].accountId)
    }
  }, [accountOptions, fromAccountId, toAccountId])

  useEffect(() => {
    if (!editing) return
    const record = recordQuery.data ?? null
    if (!record || initializedFromRecord) return
    const payload = asBalancePayload(record.payload)
    if (!payload) {
      setError(t('records.invalidPayload'))
      setInitializedFromRecord(true)
      return
    }
    setDate(payload.date)
    setAmount(String(payload.amount))
    setNote(payload.note ?? '')
    if ('movementType' in payload) {
      setMovementMode('InternalTransfer')
      setFromAccountId(payload.fromAccountId)
      setToAccountId(payload.toAccountId)
      setExistingAccountIds(new Set([payload.fromAccountId, payload.toAccountId]))
    } else {
      setMovementMode(payload.operation === 'Inflow' ? 'ExternalInflow' : 'ExternalOutflow')
      setAccountId(payload.accountId ?? 'main')
      setExistingAccountIds(new Set([payload.accountId ?? 'main']))
    }
    setInitializedFromRecord(true)
  }, [editing, initializedFromRecord, recordQuery.data, t])

  const validationError = useMemo(() => {
    if (editing && !initializedFromRecord) return null
    if (!isIsoDate(date)) return t('transfersCreate.validation.date')
    const a = parseEuroAmount(amount)
    if (a === null) return t('transfersCreate.validation.amountNumber')
    if (a < 0) return t('transfersCreate.validation.amountNonNegative')
    if (movementMode === 'InternalTransfer') {
      if (!fromAccountId || !toAccountId) return t('transfersCreate.validation.accountRequired')
      if (fromAccountId === toAccountId) return t('transfersCreate.validation.sameAccount')
    } else if (!accountId) {
      return t('transfersCreate.validation.accountRequired')
    }
    return null
  }, [accountId, amount, date, editing, fromAccountId, initializedFromRecord, movementMode, t, toAccountId])

  const submit = async () => {
    setError(null)
    if (editing && !initializedFromRecord) return
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    try {
      const a = parseEuroAmount(amount)
      if (a === null) {
        setError(t('transfersCreate.validation.amountNumber'))
        return
      }

      const cleanNote = note.trim() ? note.trim() : undefined
      const payload: BalancePayload =
        movementMode === 'InternalTransfer'
          ? { date, movementType: 'InternalTransfer', fromAccountId, toAccountId, amount: a, note: cleanNote }
          : {
              date,
              operation: (movementMode === 'ExternalInflow' ? 'Inflow' : 'Outflow') as TransferOp,
              accountId: accountId || 'main',
              amount: a,
              note: cleanNote,
            }

      const res = editing
        ? await props.api.updateRecord(props.workspaceId, 'TRANSFER', props.eventDate!, props.recordId!, {
            recordType: 'TRANSFER',
            payload,
          })
        : await props.api.createRecord(props.workspaceId, { recordType: 'TRANSFER', payload })

      queryClient.invalidateQueries({ queryKey: queryKeys.balanceAll(props.workspaceId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.recordsByYearRecordType(props.workspaceId, 'TRANSFER') })

      if (editing) {
        if (props.eventDate && props.recordId) {
          queryClient.removeQueries({ queryKey: queryKeys.record(props.workspaceId, 'TRANSFER', props.eventDate, props.recordId) })
        }
        navigate(backToPath, { replace: true })
      } else {
        navigate(`/workspaces/${props.workspaceId}/balance/created`, { replace: true, state: { record: res } })
      }
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  const inputsDisabled = submitting || (editing && !initializedFromRecord) || recordQuery.isFetching || settingsQuery.isFetching

  return (
    <Stack spacing={2}>
      <PageHeader
        title={editing ? t('transfersEdit.title') : t('transfersCreate.title')}
        description={editing ? t('transfersEdit.description') : t('transfersCreate.description')}
        right={
          <Button component={RouterLink} to={backToPath} variant="text">
            {t('common.cancel')}
          </Button>
        }
      />

      {error ? <ErrorAlert message={error} /> : null}
      {recordQuery.error ? <ErrorAlert message={errorMessage(recordQuery.error)} /> : null}
      {settingsQuery.error ? <ErrorAlert message={errorMessage(settingsQuery.error)} /> : null}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          {(editing && !initializedFromRecord && recordQuery.isFetching) || settingsQuery.isFetching ? <LinearProgress /> : null}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label={
                <FieldLabel label={t('transfersCreate.date')} tooltip={t('transfersCreate.tooltips.date', { defaultValue: '' })} />
              }
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              required
              fullWidth
              error={Boolean(date) && !isIsoDate(date)}
              disabled={inputsDisabled}
              helperText={t('transfersCreate.help.date', { defaultValue: '' }) || undefined}
            />
            <EuroTextField
              label={
                <FieldLabel
                  label={t('transfersCreate.amount')}
                  tooltip={t('transfersCreate.tooltips.amount', { defaultValue: '' })}
                />
              }
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              fullWidth
              disabled={inputsDisabled}
              helperText={t('transfersCreate.help.amount', { defaultValue: '' }) || undefined}
            />
          </Stack>

          <FormControl fullWidth>
            <InputLabel id="transfer-movement-mode-label">{t('transfersCreate.movementMode')}</InputLabel>
            <Select
              labelId="transfer-movement-mode-label"
              label={t('transfersCreate.movementMode')}
              value={movementMode}
              onChange={(e) => setMovementMode(e.target.value as MovementMode)}
              disabled={inputsDisabled}
            >
              <MenuItem value="ExternalInflow">{t('transfersCreate.modes.externalInflow')}</MenuItem>
              <MenuItem value="ExternalOutflow">{t('transfersCreate.modes.externalOutflow')}</MenuItem>
              <MenuItem value="InternalTransfer">{t('transfersCreate.modes.internal')}</MenuItem>
            </Select>
            {t('transfersCreate.help.operation', { defaultValue: '' }) ? (
              <FormHelperText>{t('transfersCreate.help.operation', { defaultValue: '' })}</FormHelperText>
            ) : null}
          </FormControl>

          {movementMode === 'InternalTransfer' ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel id="transfer-from-account-label">{t('balanceAccounts.fromAccount')}</InputLabel>
                <Select
                  labelId="transfer-from-account-label"
                  label={t('balanceAccounts.fromAccount')}
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  disabled={inputsDisabled}
                >
                  {accountOptions.map((account) => (
                    <MenuItem key={account.accountId} value={account.accountId}>
                      {account.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="transfer-to-account-label">{t('balanceAccounts.toAccount')}</InputLabel>
                <Select
                  labelId="transfer-to-account-label"
                  label={t('balanceAccounts.toAccount')}
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  disabled={inputsDisabled}
                >
                  {accountOptions.map((account) => (
                    <MenuItem key={account.accountId} value={account.accountId} disabled={account.accountId === fromAccountId}>
                      {account.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          ) : (
            <FormControl fullWidth>
              <InputLabel id="transfer-account-label">{t('balanceAccounts.targetAccount')}</InputLabel>
              <Select
                labelId="transfer-account-label"
                label={t('balanceAccounts.targetAccount')}
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                disabled={inputsDisabled}
              >
                {accountOptions.map((account) => (
                  <MenuItem key={account.accountId} value={account.accountId}>
                    {account.name}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>{t('balanceAccounts.selectorHelp')}</FormHelperText>
            </FormControl>
          )}

          <TextField
            label={t('transfersCreate.noteOptional')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            disabled={inputsDisabled}
            helperText={t('transfersCreate.help.note', { defaultValue: '' }) || undefined}
          />

          <ResponsiveActionRow>
            <Button component={RouterLink} to={backToPath} variant="outlined" disabled={submitting}>
              {t('common.back')}
            </Button>
            <Button variant="contained" onClick={submit} disabled={inputsDisabled}>
              {editing ? (submitting ? t('common.saving') : t('common.save')) : submitting ? t('common.creating') : t('transfersCreate.create')}
            </Button>
          </ResponsiveActionRow>
        </Stack>
      </Paper>
    </Stack>
  )
}
