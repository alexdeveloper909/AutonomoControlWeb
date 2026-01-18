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
import type { ExpensePayload, RecordResponse } from '../../domain/records'
import { PageHeader } from '../components/PageHeader'
import { ErrorAlert } from '../components/ErrorAlert'

const PAGE_SIZE = 20

const currentYear = (): string => {
  const d = new Date()
  return String(d.getFullYear())
}

const asExpensePayload = (payload: unknown): ExpensePayload | null => {
  if (!payload || typeof payload !== 'object') return null
  const p = payload as Partial<ExpensePayload>
  if (typeof p.documentDate !== 'string') return null
  if (typeof p.vendor !== 'string') return null
  if (typeof p.category !== 'string') return null
  if (typeof p.baseExclVat !== 'number') return null
  if (typeof p.ivaRate !== 'string') return null
  if (typeof p.vatRecoverableFlag !== 'boolean') return null
  if (typeof p.deductibleShare !== 'number') return null
  return p as ExpensePayload
}

const money = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function WorkspaceExpensesPage(props: { workspaceId: string; api: AutonomoControlApi }) {
  const [year, setYear] = useState(currentYear())
  const [pageIndex, setPageIndex] = useState(0)
  const [pageTokens, setPageTokens] = useState<(string | null)[]>([null])
  const [pages, setPages] = useState<RecordResponse[][]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentPageItems = pages[pageIndex] ?? null
  const startToken = pageTokens[pageIndex] ?? null
  const nextToken = pageTokens[pageIndex + 1]

  const refresh = () => {
    setError(null)
    setPageIndex(0)
    setPageTokens([null])
    setPages([])
  }

  useEffect(() => {
    let canceled = false

    const load = async () => {
      if (currentPageItems) return
      setError(null)
      setLoading(true)
      try {
        const res = await props.api.listRecordsByYearPaged(props.workspaceId, year, {
          recordType: 'EXPENSE',
          sort: 'eventDateDesc',
          limit: PAGE_SIZE,
          nextToken: startToken,
        })

        if (canceled) return

        setPages((prev) => {
          const next = prev.slice()
          next[pageIndex] = res.items
          return next
        })
        setPageTokens((prev) => {
          const next = prev.slice()
          while (next.length < pageIndex + 2) next.push(null)
          next[pageIndex + 1] = res.nextToken ?? null
          return next
        })
      } catch (e) {
        if (canceled) return
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!canceled) setLoading(false)
      }
    }

    void load()
    return () => {
      canceled = true
    }
  }, [currentPageItems, pageIndex, props.api, props.workspaceId, startToken, year])

  const yearOptions = useMemo(() => {
    const current = Number(currentYear())
    const years: string[] = []
    for (let y = current + 1; y >= current - 10; y -= 1) years.push(String(y))
    return years
  }, [])

  const tableRows = useMemo(() => {
    if (!currentPageItems) return null
    return currentPageItems
      .filter((r) => r.recordType === 'EXPENSE')
      .map((r) => {
        const payload = asExpensePayload(r.payload)
        return { record: r, payload }
      })
  }, [currentPageItems])

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Expenses"
        description="EXPENSE records for this workspace (year filter)."
        right={
          <Button variant="contained" component={RouterLink} to={`/workspaces/${props.workspaceId}/expenses/new`}>
            Add Expense
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
                setPageIndex(0)
                setPageTokens([null])
                setPages([])
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

          <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end" sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Page {pageIndex + 1} · {PAGE_SIZE} per page · sort: eventDate desc
            </Typography>
            <Button variant="text" onClick={refresh} disabled={loading}>
              Refresh
            </Button>
            <Button variant="outlined" onClick={() => setPageIndex((p) => Math.max(0, p - 1))} disabled={loading || pageIndex === 0}>
              Prev
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                if (nextToken) setPageIndex((p) => p + 1)
              }}
              disabled={loading || !nextToken}
            >
              Next
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {loading ? <LinearProgress /> : null}
      {error ? <ErrorAlert message={error} /> : null}

      <Paper variant="outlined">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Event date</TableCell>
                <TableCell>Document date</TableCell>
                <TableCell>Payment date</TableCell>
                <TableCell>Vendor</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="right">Base (excl. VAT)</TableCell>
                <TableCell align="right">Deductible %</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tableRows?.length ? (
                tableRows.map(({ record, payload }) => (
                  <TableRow key={record.recordKey} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{record.eventDate}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{payload?.documentDate ?? '—'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{payload?.paymentDate ?? '—'}</TableCell>
                    <TableCell sx={{ maxWidth: 240 }} title={payload?.vendor}>
                      {payload?.vendor ?? '—'}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200 }} title={payload?.category}>
                      {payload?.category ?? '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {payload ? money.format(payload.baseExclVat) : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {payload ? `${Math.round(payload.deductibleShare * 100)}%` : '—'}
                    </TableCell>
                  </TableRow>
                ))
              ) : currentPageItems ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography color="text.secondary">No expense records found for {year}.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell colSpan={7}>
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

