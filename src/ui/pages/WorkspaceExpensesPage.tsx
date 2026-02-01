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
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import type { ExpensePayload, RecordResponse } from '../../domain/records'
import { PageHeader } from '../components/PageHeader'
import { ErrorAlert } from '../components/ErrorAlert'
import { queryKeys } from '../queries/queryKeys'
import { useTranslation } from 'react-i18next'
import { decimalFormatter } from '../lib/intl'
import { MoreActionsMenu } from '../components/MoreActionsMenu'
import { ConfirmDialog } from '../components/ConfirmDialog'

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

export function WorkspaceExpensesPage(props: { workspaceId: string; api: AutonomoControlApi; readOnly: boolean }) {
  const { t, i18n } = useTranslation()
  const money = useMemo(() => decimalFormatter(i18n.language), [i18n.language])
  const navigate = useNavigate()
  const [year, setYear] = useState(currentYear())
  const [pageIndex, setPageIndex] = useState(0)
  const queryClient = useQueryClient()
  const queryKey = queryKeys.recordsByYear(props.workspaceId, 'EXPENSE', year)
  const [deleteTarget, setDeleteTarget] = useState<{ record: RecordResponse; label: string } | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { data, error, isPending, isFetching, fetchNextPage } = useInfiniteQuery({
    queryKey,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      props.api.listRecordsByYearPaged(props.workspaceId, year, {
        recordType: 'EXPENSE',
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

  const colSpan = props.readOnly ? 7 : 8

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    setDeleteSubmitting(true)
    try {
      await props.api.deleteRecord(props.workspaceId, 'EXPENSE', deleteTarget.record.eventDate, deleteTarget.record.recordId)
      queryClient.invalidateQueries({ queryKey: queryKeys.recordsByYearRecordType(props.workspaceId, 'EXPENSE') })
      queryClient.invalidateQueries({ queryKey: queryKeys.summaries(props.workspaceId) })
      setDeleteTarget(null)
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : String(e))
    } finally {
      setDeleteSubmitting(false)
    }
  }

  return (
    <Stack spacing={2}>
      <PageHeader
        title={t('expenses.title')}
        description={t('expenses.description')}
        right={
          props.readOnly ? null : (
            <Button variant="contained" component={RouterLink} to={`/workspaces/${props.workspaceId}/expenses/new`}>
              {t('expenses.add')}
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
      {deleteError ? <ErrorAlert message={deleteError} /> : null}

      <Paper variant="outlined">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('records.eventDate')}</TableCell>
                <TableCell>{t('records.documentDate')}</TableCell>
                <TableCell>{t('records.paymentDate')}</TableCell>
                <TableCell>{t('records.vendor')}</TableCell>
                <TableCell>{t('records.category')}</TableCell>
                <TableCell align="right">{t('records.baseExclVat')}</TableCell>
                <TableCell align="right">{t('records.deductiblePercent')}</TableCell>
                {props.readOnly ? null : <TableCell align="right">{t('records.actions')}</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {tableRows?.length ? (
                tableRows.map(({ record, payload }) => (
                  <TableRow key={record.recordKey} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{record.eventDate}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{payload?.documentDate ?? t('common.na')}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{payload?.paymentDate ?? t('common.na')}</TableCell>
                    <TableCell sx={{ maxWidth: 240 }} title={payload?.vendor}>
                      {payload?.vendor ?? t('common.na')}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200 }} title={payload?.category}>
                      {payload?.category ?? t('common.na')}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {payload ? money.format(payload.baseExclVat) : t('common.na')}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {payload ? `${Math.round(payload.deductibleShare * 100)}%` : t('common.na')}
                    </TableCell>
                    {props.readOnly ? null : (
                      <TableCell align="right" padding="checkbox">
                        <MoreActionsMenu
                          onEdit={() =>
                            navigate(`/workspaces/${props.workspaceId}/expenses/${record.eventDate}/${record.recordId}/edit`)
                          }
                          onDelete={() =>
                            setDeleteTarget({
                              record,
                              label: `${t('recordTypes.EXPENSE')} ${payload?.vendor ?? record.recordId}`,
                            })
                          }
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : currentPageItems ? (
                <TableRow>
                  <TableCell colSpan={colSpan}>
                    <Typography color="text.secondary">{t('expenses.empty', { year })}</Typography>
                  </TableCell>
                </TableRow>
              ) : isPending ? (
                <TableRow>
                  <TableCell colSpan={colSpan}>
                    <Typography color="text.secondary">{t('common.loading')}</Typography>
                  </TableCell>
                </TableRow>
              ) : null}
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
