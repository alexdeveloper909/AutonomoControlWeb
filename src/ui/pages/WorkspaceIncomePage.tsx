import { useMemo, useState } from 'react'
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
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import type { InvoicePayload } from '../../domain/records'
import { PageHeader } from '../components/PageHeader'
import { ErrorAlert } from '../components/ErrorAlert'
import { queryKeys } from '../queries/queryKeys'
import { useTranslation } from 'react-i18next'
import { decimalFormatter } from '../lib/intl'

const PAGE_SIZE = 20

const currentYear = (): string => {
  const d = new Date()
  return String(d.getFullYear())
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

export function WorkspaceIncomePage(props: { workspaceId: string; api: AutonomoControlApi; readOnly: boolean }) {
  const { t, i18n } = useTranslation()
  const money = useMemo(() => decimalFormatter(i18n.language), [i18n.language])
  const [year, setYear] = useState(currentYear())
  const [pageIndex, setPageIndex] = useState(0)
  const queryClient = useQueryClient()
  const queryKey = queryKeys.recordsByYear(props.workspaceId, 'INVOICE', year)

  const { data, error, isPending, isFetching, fetchNextPage } = useInfiniteQuery({
    queryKey,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      props.api.listRecordsByYearPaged(props.workspaceId, year, {
        recordType: 'INVOICE',
        sort: 'eventDateDesc',
        limit: PAGE_SIZE,
        nextToken: pageParam,
      }),
    getNextPageParam: (lastPage) => lastPage.nextToken ?? undefined,
  })

  const currentPageItems = data?.pages[pageIndex]?.items ?? null
  const nextToken = data?.pages[pageIndex]?.nextToken ?? null
  const nextPageLoaded = Boolean(data?.pages[pageIndex + 1])

  const refresh = () => {
    setPageIndex(0)
    queryClient.removeQueries({ queryKey })
  }

  const tableRows = useMemo(() => {
    if (!currentPageItems) return null
    return currentPageItems
      .filter((r) => r.recordType === 'INVOICE')
      .map((r) => {
        const payload = asInvoicePayload(r.payload)
        return { record: r, payload }
      })
  }, [currentPageItems])

  const yearOptions = useMemo(() => {
    const current = Number(currentYear())
    const years: string[] = []
    for (let y = current + 1; y >= current - 10; y -= 1) years.push(String(y))
    return years
  }, [])

  return (
    <Stack spacing={2}>
      <PageHeader
        title={t('income.title')}
        description={t('income.description')}
        right={
          props.readOnly ? null : (
            <Button variant="contained" component={RouterLink} to={`/workspaces/${props.workspaceId}/income/new`}>
              {t('income.add')}
            </Button>
          )
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
              {t('records.yearHint', { hint: 'year=YYYY' })}
            </Typography>
          </FormControl>

          <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end" sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('records.pageSummary', {
                page: pageIndex + 1,
                pageSize: PAGE_SIZE,
                sort: t('records.sortEventDateDesc'),
              })}
            </Typography>
            <Button variant="text" onClick={refresh} disabled={isFetching}>
              {t('common.refresh')}
            </Button>
            <Button
              variant="outlined"
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              disabled={isFetching || pageIndex === 0}
            >
              {t('common.prev')}
            </Button>
            <Button
              variant="outlined"
              onClick={async () => {
                if (nextPageLoaded) {
                  setPageIndex((p) => p + 1)
                  return
                }
                if (!nextToken) return
                await fetchNextPage()
                setPageIndex((p) => p + 1)
              }}
              disabled={isFetching || (!nextPageLoaded && !nextToken)}
            >
              {t('common.next')}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {isFetching ? <LinearProgress /> : null}
      {error ? <ErrorAlert message={error instanceof Error ? error.message : String(error)} /> : null}

      <Paper variant="outlined">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('records.eventDate')}</TableCell>
                <TableCell>{t('records.invoiceDate')}</TableCell>
                <TableCell>{t('records.paymentDate')}</TableCell>
                <TableCell>{t('records.invoiceNumber')}</TableCell>
                <TableCell>{t('records.client')}</TableCell>
                <TableCell align="right">{t('records.baseExclVat')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tableRows?.length ? (
                tableRows.map(({ record, payload }) => (
                  <TableRow key={record.recordKey} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{record.eventDate}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{payload?.invoiceDate ?? t('common.na')}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{payload?.paymentDate ?? t('common.na')}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{payload?.number ?? t('common.na')}</TableCell>
                    <TableCell sx={{ maxWidth: 280 }} title={payload?.client}>
                      {payload?.client ?? t('common.na')}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {payload ? money.format(payload.baseExclVat) : t('common.na')}
                    </TableCell>
                  </TableRow>
                ))
              ) : currentPageItems ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography color="text.secondary">{t('income.empty', { year })}</Typography>
                  </TableCell>
                </TableRow>
              ) : isPending ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography color="text.secondary">{t('common.loading')}</Typography>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Stack>
  )
}
