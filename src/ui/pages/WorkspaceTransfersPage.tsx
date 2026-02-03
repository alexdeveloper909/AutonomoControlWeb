import { useMemo, useState } from 'react'
import {
  Button,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import type { RecordResponse, TransferPayload } from '../../domain/records'
import type { WorkspaceSettings } from '../../domain/settings'
import { PageHeader } from '../components/PageHeader'
import { ErrorAlert } from '../components/ErrorAlert'
import { queryKeys } from '../queries/queryKeys'
import { useTranslation } from 'react-i18next'
import { decimalFormatter, euroCurrencyFormatter } from '../lib/intl'
import { MoreActionsMenu } from '../components/MoreActionsMenu'
import { ConfirmDialog } from '../components/ConfirmDialog'

const currentYear = (): string => {
  const d = new Date()
  return String(d.getFullYear())
}

const asTransferPayload = (payload: unknown): TransferPayload | null => {
  if (!payload || typeof payload !== 'object') return null
  const p = payload as Partial<TransferPayload>
  if (typeof p.date !== 'string') return null
  if (typeof p.operation !== 'string') return null
  if (typeof p.amount !== 'number') return null
  return p as TransferPayload
}

const signedAmount = (p: TransferPayload): number => (p.operation === 'Inflow' ? p.amount : -p.amount)

const sortAsc = (a: RecordResponse, b: RecordResponse): number => {
  if (a.eventDate !== b.eventDate) return a.eventDate < b.eventDate ? -1 : 1
  return a.recordKey < b.recordKey ? -1 : a.recordKey > b.recordKey ? 1 : 0
}

const sortDesc = (a: RecordResponse, b: RecordResponse): number => {
  if (a.eventDate !== b.eventDate) return a.eventDate > b.eventDate ? -1 : 1
  return a.recordKey > b.recordKey ? -1 : a.recordKey < b.recordKey ? 1 : 0
}

export function WorkspaceTransfersPage(props: { workspaceId: string; api: AutonomoControlApi; readOnly: boolean }) {
  const { t, i18n } = useTranslation()
  const money = useMemo(() => decimalFormatter(i18n.language), [i18n.language])
  const currency = useMemo(() => euroCurrencyFormatter(i18n.language), [i18n.language])
  const navigate = useNavigate()
  const [year, setYear] = useState(currentYear())
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<{ record: RecordResponse; label: string } | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const settingsQuery = useQuery({
    queryKey: queryKeys.workspaceSettings(props.workspaceId),
    queryFn: () => props.api.getWorkspaceSettings(props.workspaceId),
  })

  const transfersQueryKey = queryKeys.recordsByYear(props.workspaceId, 'TRANSFER', year)
  const transfersQuery = useQuery({
    queryKey: transfersQueryKey,
    queryFn: async () => {
      const loaded: RecordResponse[] = []
      let nextToken: string | null = null
      do {
        const res = await props.api.listRecordsByYearPaged(props.workspaceId, year, {
          recordType: 'TRANSFER',
          sort: 'eventDateDesc',
          limit: 200,
          nextToken,
        })
        loaded.push(...res.items)
        nextToken = res.nextToken ?? null
      } while (nextToken)
      return loaded
    },
  })

  const settings = (settingsQuery.data ?? null) as WorkspaceSettings | null
  const items = transfersQuery.data ?? null
  const loading = settingsQuery.isFetching || transfersQuery.isFetching
  const error =
    settingsQuery.error instanceof Error
      ? settingsQuery.error.message
      : transfersQuery.error instanceof Error
        ? transfersQuery.error.message
        : settingsQuery.error
          ? String(settingsQuery.error)
          : transfersQuery.error
            ? String(transfersQuery.error)
            : null

  const refresh = () => {
    queryClient.removeQueries({ queryKey: transfersQueryKey })
  }

  const colSpan = props.readOnly ? 6 : 7

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    setDeleteSubmitting(true)
    try {
      await props.api.deleteRecord(props.workspaceId, 'TRANSFER', deleteTarget.record.eventDate, deleteTarget.record.recordId)
      queryClient.invalidateQueries({ queryKey: queryKeys.recordsByYearRecordType(props.workspaceId, 'TRANSFER') })
      setDeleteTarget(null)
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : String(e))
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const yearOptions = useMemo(() => {
    const current = Number(currentYear())
    const years: string[] = []
    for (let y = current + 1; y >= current - 10; y -= 1) years.push(String(y))
    return years
  }, [])

  const openingBalance = useMemo(() => {
    if (!settings) return null
    return String(settings.year) === year ? settings.openingBalance : 0
  }, [settings, year])

  const balanceByRecordKey = useMemo(() => {
    if (!items || openingBalance == null) return null

    const transfers = items
      .filter((r) => r.recordType === 'TRANSFER')
      .map((r) => ({ record: r, payload: asTransferPayload(r.payload) }))
      .filter((x) => x.payload)
      .map((x) => ({ record: x.record, payload: x.payload! }))
      .sort((a, b) => sortAsc(a.record, b.record))

    let running = openingBalance
    const m = new Map<string, number>()
    for (const t of transfers) {
      running += signedAmount(t.payload)
      m.set(t.record.recordKey, running)
    }
    return m
  }, [items, openingBalance])

  const currentBalance = useMemo(() => {
    if (!items || openingBalance == null) return null
    const asc = items.slice().sort(sortAsc)
    let running = openingBalance
    for (const r of asc) {
      if (r.recordType !== 'TRANSFER') continue
      const payload = asTransferPayload(r.payload)
      if (!payload) continue
      running += signedAmount(payload)
    }
    return running
  }, [items, openingBalance])

  const tableRows = useMemo(() => {
    if (!items) return null
    return items
      .slice()
      .sort(sortDesc)
      .filter((r) => r.recordType === 'TRANSFER')
      .map((r) => {
        const payload = asTransferPayload(r.payload)
        const balance = balanceByRecordKey?.get(r.recordKey) ?? null
        return { record: r, payload, balance }
      })
  }, [balanceByRecordKey, items])

  return (
    <Stack spacing={2}>
      <PageHeader
        title={t('transfers.title')}
        right={
          props.readOnly ? null : (
            <Button variant="contained" component={RouterLink} to={`/workspaces/${props.workspaceId}/transfers/new`}>
              {t('transfers.add')}
            </Button>
          )
        }
      />

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <FormControl sx={{ minWidth: 160 }}>
            <InputLabel id="transfers-year-label">{t('common.year')}</InputLabel>
            <Select
              labelId="transfers-year-label"
              label={t('common.year')}
              value={year}
              onChange={(e) => {
                setYear(e.target.value)
              }}
              size="small"
            >
              {yearOptions.map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Stack sx={{ flex: 1, textAlign: { xs: 'left', sm: 'center' } }} spacing={0.25}>
            <Typography variant="caption" color="text.secondary">
              {t('transfers.currentBalance')}
            </Typography>
            <Typography
              variant="h5"
              sx={{
                lineHeight: 1.2,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {currentBalance == null ? t('common.na') : currency.format(currentBalance)}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
            <Button variant="text" onClick={refresh} disabled={loading}>
              {t('common.refresh')}
            </Button>
          </Stack>
        </Stack>

        {settings && String(settings.year) !== year ? (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {t('transfers.noteYearMismatch', {
              settingsYear: settings.year,
              year,
              zero: currency.format(0),
            })}
          </Typography>
        ) : openingBalance != null ? (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {t('transfers.openingBalance', { value: currency.format(openingBalance) })}
          </Typography>
        ) : null}
      </Paper>

      {loading ? <LinearProgress /> : null}
      {error ? <ErrorAlert message={error} /> : null}
      {deleteError ? <ErrorAlert message={deleteError} /> : null}

      <Paper variant="outlined">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('records.eventDate')}</TableCell>
                <TableCell>{t('records.date')}</TableCell>
                <TableCell>{t('records.operation')}</TableCell>
                <TableCell align="right">{t('records.amount')}</TableCell>
                <TableCell>{t('records.note')}</TableCell>
                <TableCell align="right">{t('records.balance')}</TableCell>
                {props.readOnly ? null : <TableCell align="right">{t('records.actions')}</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {tableRows?.length ? (
                tableRows.map(({ record, payload, balance }) => (
                  <TableRow key={record.recordKey} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{record.eventDate}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{payload?.date ?? t('common.na')}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {payload?.operation ? t(`transfersCreate.operations.${payload.operation}`) : t('common.na')}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {payload ? money.format(payload.amount) : t('common.na')}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 320 }} title={payload?.note}>
                      {payload?.note ?? t('common.na')}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {balance == null ? t('common.na') : money.format(balance)}
                    </TableCell>
                    {props.readOnly ? null : (
                      <TableCell align="right" padding="checkbox">
                        <MoreActionsMenu
                          onEdit={() =>
                            navigate(`/workspaces/${props.workspaceId}/transfers/${record.eventDate}/${record.recordId}/edit`)
                          }
                          onDelete={() =>
                            setDeleteTarget({
                              record,
                              label: `${t('recordTypes.TRANSFER')} ${payload?.date ?? record.recordId}`,
                            })
                          }
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : items ? (
                <TableRow>
                  <TableCell colSpan={colSpan}>
                    <Typography color="text.secondary">{t('transfers.empty', { year })}</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell colSpan={colSpan}>
                    <Typography color="text.secondary">{t('common.loading')}</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('records.deleteConfirmTitle', { record: deleteTarget?.label ?? '' })}
        description={t('records.deleteConfirmBody')}
        confirmColor="error"
        loading={deleteSubmitting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </Stack>
  )
}
