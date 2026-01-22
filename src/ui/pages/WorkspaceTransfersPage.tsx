import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  FormControl,
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
import { Link as RouterLink } from 'react-router-dom'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import type { RecordResponse, TransferPayload } from '../../domain/records'
import type { WorkspaceSettings } from '../../domain/settings'
import { PageHeader } from '../components/PageHeader'
import { ErrorAlert } from '../components/ErrorAlert'

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

const money = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const signedAmount = (p: TransferPayload): number => (p.operation === 'Inflow' ? p.amount : -p.amount)

const sortAsc = (a: RecordResponse, b: RecordResponse): number => {
  if (a.eventDate !== b.eventDate) return a.eventDate < b.eventDate ? -1 : 1
  return a.recordKey < b.recordKey ? -1 : a.recordKey > b.recordKey ? 1 : 0
}

const sortDesc = (a: RecordResponse, b: RecordResponse): number => {
  if (a.eventDate !== b.eventDate) return a.eventDate > b.eventDate ? -1 : 1
  return a.recordKey > b.recordKey ? -1 : a.recordKey < b.recordKey ? 1 : 0
}

export function WorkspaceTransfersPage(props: { workspaceId: string; api: AutonomoControlApi }) {
  const [year, setYear] = useState(currentYear())
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null)
  const [items, setItems] = useState<RecordResponse[] | null>(null)

  const [loadingSettings, setLoadingSettings] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loading = loadingSettings || loadingItems

  const refresh = () => {
    setError(null)
    setItems(null)
  }

  useEffect(() => {
    let canceled = false

    const load = async () => {
      setLoadingSettings(true)
      setError(null)
      try {
        const res = await props.api.getWorkspaceSettings(props.workspaceId)

        if (canceled) return

        setSettings(res)
      } catch (e) {
        if (canceled) return
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!canceled) setLoadingSettings(false)
      }
    }

    void load()
    return () => {
      canceled = true
    }
  }, [props.api, props.workspaceId])

  useEffect(() => {
    let canceled = false

    const load = async () => {
      if (items) return
      setLoadingItems(true)
      setError(null)
      try {
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

        if (canceled) return
        setItems(loaded)
      } catch (e) {
        if (canceled) return
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!canceled) setLoadingItems(false)
      }
    }

    void load()
    return () => {
      canceled = true
    }
  }, [items, props.api, props.workspaceId, year])

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
        title="Transfers"
        description="TRANSFER records for this workspace (year filter)."
        right={
          <Button variant="contained" component={RouterLink} to={`/workspaces/${props.workspaceId}/transfers/new`}>
            Add Transfer
          </Button>
        }
      />

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <FormControl sx={{ minWidth: 160 }}>
            <Select
              value={year}
              onChange={(e) => {
                setYear(e.target.value)
                setItems(null)
              }}
              size="small"
            >
              {yearOptions.map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              Year (uses <code>year=YYYY</code>)
            </Typography>
          </FormControl>

          <Stack sx={{ flex: 1, textAlign: { xs: 'left', sm: 'center' } }} spacing={0.25}>
            <Typography variant="caption" color="text.secondary">
              Current balance
            </Typography>
            <Typography
              variant="h5"
              sx={{
                lineHeight: 1.2,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {currentBalance == null ? '—' : `€${money.format(currentBalance)}`}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
            <Button variant="text" onClick={refresh} disabled={loading}>
              Refresh
            </Button>
          </Stack>
        </Stack>

        {settings && String(settings.year) !== year ? (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Note: this workspace is configured for {settings.year}; the running balance uses an opening balance of €{money.format(0)} for {year}.
          </Typography>
        ) : openingBalance != null ? (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Opening balance: €{money.format(openingBalance)}
          </Typography>
        ) : null}
      </Paper>

      {loading ? <LinearProgress /> : null}
      {error ? <ErrorAlert message={error} /> : null}

      <Paper variant="outlined">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Event date</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Operation</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Note</TableCell>
                <TableCell align="right">Balance</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tableRows?.length ? (
                tableRows.map(({ record, payload, balance }) => (
                  <TableRow key={record.recordKey} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{record.eventDate}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{payload?.date ?? '—'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{payload?.operation ?? '—'}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {payload ? money.format(payload.amount) : '—'}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 320 }} title={payload?.note}>
                      {payload?.note ?? '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {balance == null ? '—' : money.format(balance)}
                    </TableCell>
                  </TableRow>
                ))
              ) : items ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography color="text.secondary">No transfer records found for {year}.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography color="text.secondary">Loading…</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Stack>
  )
}
