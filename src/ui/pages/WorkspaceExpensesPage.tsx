import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { EuroTextField } from '../components/EuroTextField'
import { parseEuroAmount } from '../lib/money'
import { ResponsiveDataView } from '../components/ResponsiveDataView'
import { MobileRecordCard } from '../components/MobileRecordCard'
import { RecordListControls } from '../components/RecordListControls'

const PAGE_SIZE = 20

const currentYear = (): string => {
  const d = new Date()
  return String(d.getFullYear())
}

const isIsoDate = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s)

const addMonthsIsoDate = (isoDate: string, months: number): string | null => {
  if (!isIsoDate(isoDate)) return null
  const [y, m, d] = isoDate.split('-').map((x) => Number(x))
  if (!y || !m || !d) return null

  const totalMonths = (y * 12 + (m - 1)) + months
  const year = Math.floor(totalMonths / 12)
  const monthIndex = totalMonths % 12
  const month = monthIndex + 1

  const daysInMonth = new Date(year, month, 0).getDate()
  const day = Math.min(d, daysInMonth)

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
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
  if (p.paymentDate != null && typeof p.paymentDate !== 'string') return null
  if (p.amountPaidOverride != null && typeof p.amountPaidOverride !== 'number') return null
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
  const [repeatTarget, setRepeatTarget] = useState<{ record: RecordResponse; payload: ExpensePayload } | null>(null)
  const [repeatDate, setRepeatDate] = useState('')
  const [repeatBaseExclVatInput, setRepeatBaseExclVatInput] = useState('')
  const [repeatSubmitting, setRepeatSubmitting] = useState(false)
  const [repeatError, setRepeatError] = useState<string | null>(null)
  const [expandedRecordKey, setExpandedRecordKey] = useState<string | null>(null)

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

  useEffect(() => {
    if (!repeatTarget) return
    setRepeatError(null)
    setRepeatSubmitting(false)
    setRepeatDate(addMonthsIsoDate(repeatTarget.record.eventDate, 1) ?? repeatTarget.record.eventDate)
    setRepeatBaseExclVatInput(String(repeatTarget.payload.baseExclVat))
  }, [repeatTarget])

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    setDeleteSubmitting(true)
    try {
      await props.api.deleteRecord(props.workspaceId, 'EXPENSE', deleteTarget.record.eventDate, deleteTarget.record.recordId)
      queryClient.invalidateQueries({ queryKey: queryKeys.recordsByYearRecordType(props.workspaceId, 'EXPENSE') })
      queryClient.invalidateQueries({ queryKey: queryKeys.summaries(props.workspaceId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.retaSummaries(props.workspaceId) })
      setDeleteTarget(null)
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : String(e))
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const repeatValidationError = useMemo(() => {
    if (!repeatTarget) return null
    if (!isIsoDate(repeatDate)) return t('expensesCreate.validation.documentDate')
    const baseInput = repeatBaseExclVatInput.trim()
    const base = baseInput ? parseEuroAmount(baseInput) : repeatTarget.payload.baseExclVat
    if (base == null) return t('expensesCreate.validation.baseNumber')
    return null
  }, [repeatBaseExclVatInput, repeatDate, repeatTarget, t])

  const confirmRepeat = async () => {
    if (!repeatTarget) return
    setRepeatError(null)
    if (repeatValidationError) {
      setRepeatError(repeatValidationError)
      return
    }

    setRepeatSubmitting(true)
    try {
      const baseInput = repeatBaseExclVatInput.trim()
      const base = baseInput ? parseEuroAmount(baseInput) : repeatTarget.payload.baseExclVat
      if (base == null) throw new Error(t('expensesCreate.validation.baseNumber'))

      const payload: ExpensePayload = {
        ...repeatTarget.payload,
        documentDate: repeatDate,
        paymentDate: repeatDate,
        baseExclVat: base,
      }

      await props.api.createRecord(props.workspaceId, { recordType: 'EXPENSE', payload })
      queryClient.invalidateQueries({ queryKey: queryKeys.recordsByYearRecordType(props.workspaceId, 'EXPENSE') })
      queryClient.invalidateQueries({ queryKey: queryKeys.summaries(props.workspaceId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.retaSummaries(props.workspaceId) })
      setRepeatTarget(null)
    } catch (e) {
      setRepeatError(e instanceof Error ? e.message : String(e))
    } finally {
      setRepeatSubmitting(false)
    }
  }

  return (
    <Stack spacing={2}>
      <PageHeader
        title={t('expenses.title')}
        right={
          props.readOnly ? null : (
            <Button variant="contained" component={RouterLink} to={`/workspaces/${props.workspaceId}/expenses/new`}>
              {t('expenses.add')}
            </Button>
          )
        }
      />

      <RecordListControls
        labelId="expenses-year-label"
        yearLabel={t('common.year')}
        year={year}
        yearOptions={yearOptions}
        pageSummary={t('records.pageSummary', {
          page: pageIndex + 1,
          pageSize: PAGE_SIZE,
        })}
        refreshLabel={t('common.refresh')}
        prevLabel={t('common.prev')}
        nextLabel={t('common.next')}
        isFetching={isFetching}
        isPrevDisabled={pageIndex === 0}
        isNextDisabled={!nextPageLoaded && !nextToken}
        onYearChange={(nextYear) => {
          setYear(nextYear)
          setPageIndex(0)
        }}
        onRefresh={refresh}
        onPrev={() => setPageIndex((p) => Math.max(0, p - 1))}
        onNext={async () => {
          if (nextPageLoaded) {
            setPageIndex((p) => p + 1)
            return
          }
          if (!nextToken) return
          await fetchNextPage()
          setPageIndex((p) => p + 1)
        }}
      />

      {isFetching ? <LinearProgress /> : null}
      {error ? <ErrorAlert message={error instanceof Error ? error.message : String(error)} /> : null}
      {deleteError ? <ErrorAlert message={deleteError} /> : null}

      <ResponsiveDataView
        tableLabel={t('expenses.title')}
        cardsLabel={t('expenses.title')}
        table={
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
                              onRepeat={
                                payload
                                  ? () => {
                                      setRepeatTarget({ record, payload })
                                    }
                                  : undefined
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
        }
        cards={
          <Stack spacing={1}>
            {tableRows?.length ? (
              tableRows.map(({ record, payload }) => (
                <MobileRecordCard
                  key={record.recordKey}
                  title={record.eventDate}
                  subtitle={payload?.vendor ?? t('common.na')}
                  amount={payload ? money.format(payload.baseExclVat) : t('common.na')}
                  facts={[
                    { label: t('records.category'), value: payload?.category ?? t('common.na') },
                    { label: t('records.documentDate'), value: payload?.documentDate ?? t('common.na') },
                  ]}
                  details={[
                    { label: t('records.paymentDate'), value: payload?.paymentDate ?? t('common.na') },
                    {
                      label: t('records.deductiblePercent'),
                      value: payload ? `${Math.round(payload.deductibleShare * 100)}%` : t('common.na'),
                    },
                  ]}
                  actions={
                    props.readOnly ? null : (
                      <MoreActionsMenu
                        onEdit={() => navigate(`/workspaces/${props.workspaceId}/expenses/${record.eventDate}/${record.recordId}/edit`)}
                        onRepeat={
                          payload
                            ? () => {
                                setRepeatTarget({ record, payload })
                              }
                            : undefined
                        }
                        onDelete={() =>
                          setDeleteTarget({
                            record,
                            label: `${t('recordTypes.EXPENSE')} ${payload?.vendor ?? record.recordId}`,
                          })
                        }
                      />
                    )
                  }
                  expanded={expandedRecordKey === record.recordKey}
                  onToggleExpanded={() => setExpandedRecordKey((current) => (current === record.recordKey ? null : record.recordKey))}
                  expandLabel={t('common.more')}
                />
              ))
            ) : currentPageItems ? (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography color="text.secondary">{t('expenses.empty', { year })}</Typography>
              </Paper>
            ) : isPending ? (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography color="text.secondary">{t('common.loading')}</Typography>
              </Paper>
            ) : null}
          </Stack>
        }
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('records.deleteConfirmTitle', { record: deleteTarget?.label ?? '' })}
        description={t('records.deleteConfirmBody')}
        confirmColor="error"
        loading={deleteSubmitting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      <Dialog
        open={Boolean(repeatTarget)}
        onClose={repeatSubmitting ? () => {} : () => setRepeatTarget(null)}
        disableEscapeKeyDown={repeatSubmitting}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t('expenses.repeatDialogTitle')}</DialogTitle>
        <DialogContent>
          {repeatSubmitting ? <LinearProgress /> : null}
          <Stack spacing={2} sx={{ mt: 1 }}>
            {repeatError ? <ErrorAlert message={repeatError} /> : null}

            <TextField
              label={t('records.date')}
              type="date"
              value={repeatDate}
              onChange={(e) => setRepeatDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              required
              fullWidth
              error={Boolean(repeatDate) && !isIsoDate(repeatDate)}
              disabled={repeatSubmitting}
            />

            <EuroTextField
              label={t('records.baseExclVat')}
              value={repeatBaseExclVatInput}
              onChange={(e) => setRepeatBaseExclVatInput(e.target.value)}
              fullWidth
              disabled={repeatSubmitting}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 1, '& > .MuiButton-root': { minHeight: 44, flex: { xs: '1 1 100%', sm: '0 0 auto' } } }}>
          <Button onClick={() => setRepeatTarget(null)} disabled={repeatSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button variant="contained" onClick={confirmRepeat} disabled={repeatSubmitting || Boolean(repeatValidationError)}>
            {t('common.repeat')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
