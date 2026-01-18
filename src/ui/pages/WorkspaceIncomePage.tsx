import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import type { InvoicePayload, RecordResponse } from '../../domain/records'
import { PageHeader } from '../components/PageHeader'
import { ErrorAlert } from '../components/ErrorAlert'

const PAGE_SIZE = 20

const monthKeyToday = (): string => {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${d.getFullYear()}-${m}`
}

const asInvoicePayload = (payload: unknown): InvoicePayload | null => {
  if (!payload || typeof payload !== 'object') return null
  const p = payload as Partial<InvoicePayload>
  if (typeof p.invoiceDate !== 'string') return null
  if (typeof p.number !== 'string') return null
  if (typeof p.client !== 'string') return null
  if (typeof p.baseExclVat !== 'number') return null
  if (typeof p.ivaRate !== 'string') return null
  if (typeof p.retencion !== 'string') return null
  return p as InvoicePayload
}

const money = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function WorkspaceIncomePage(props: { workspaceId: string; api: AutonomoControlApi }) {
  const [monthKey, setMonthKey] = useState(monthKeyToday())
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
        const res = await props.api.listRecordsByMonthPaged(props.workspaceId, monthKey, {
          recordType: 'INVOICE',
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
  }, [currentPageItems, monthKey, pageIndex, props.api, props.workspaceId, startToken])

  const tableRows = useMemo(() => {
    if (!currentPageItems) return null
    return currentPageItems
      .filter((r) => r.recordType === 'INVOICE')
      .map((r) => {
        const payload = asInvoicePayload(r.payload)
        return { record: r, payload }
      })
  }, [currentPageItems])

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Income"
        description="INVOICE records for this workspace (month filter)."
        right={
          <Button variant="contained" component={RouterLink} to={`/workspaces/${props.workspaceId}/income/new`}>
            Add Income
          </Button>
        }
      />

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <TextField
            label="Month"
            type="month"
            value={monthKey}
            onChange={(e) => {
              setMonthKey(e.target.value)
              setPageIndex(0)
              setPageTokens([null])
              setPages([])
            }}
            InputLabelProps={{ shrink: true }}
            helperText="Uses GET /workspaces/{workspaceId}/records?month=YYYY-MM&recordType=INVOICE"
          />

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
                <TableCell>Invoice date</TableCell>
                <TableCell>Payment date</TableCell>
                <TableCell>Invoice #</TableCell>
                <TableCell>Client</TableCell>
                <TableCell align="right">Base (excl. VAT)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tableRows?.length ? (
                tableRows.map(({ record, payload }) => (
                  <TableRow key={record.recordKey} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{record.eventDate}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{payload?.invoiceDate ?? '—'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{payload?.paymentDate ?? '—'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{payload?.number ?? '—'}</TableCell>
                    <TableCell sx={{ maxWidth: 280 }} title={payload?.client}>
                      {payload?.client ?? '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {payload ? money.format(payload.baseExclVat) : '—'}
                    </TableCell>
                  </TableRow>
                ))
              ) : currentPageItems ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography color="text.secondary">No income records found for {monthKey}.</Typography>
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
