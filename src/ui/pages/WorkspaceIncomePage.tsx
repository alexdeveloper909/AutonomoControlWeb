import { useMemo, useState } from 'react'
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
  Typography,
} from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import type { InvoicePayload, RecordResponse } from '../../domain/records'
import { PageHeader } from '../components/PageHeader'
import { ErrorAlert } from '../components/ErrorAlert'
import { queryKeys } from '../queries/queryKeys'
import { useTranslation } from 'react-i18next'
import { decimalFormatter } from '../lib/intl'
import { MoreActionsMenu } from '../components/MoreActionsMenu'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ResponsiveDataView } from '../components/ResponsiveDataView'
import { MobileRecordCard } from '../components/MobileRecordCard'
import { RecordListControls } from '../components/RecordListControls'

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
  const navigate = useNavigate()
  const [year, setYear] = useState(currentYear())
  const [pageIndex, setPageIndex] = useState(0)
  const queryClient = useQueryClient()
  const queryKey = queryKeys.recordsByYear(props.workspaceId, 'INVOICE', year)
  const [deleteTarget, setDeleteTarget] = useState<{ record: RecordResponse; label: string } | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [expandedRecordKey, setExpandedRecordKey] = useState<string | null>(null)

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

  const colSpan = props.readOnly ? 6 : 7

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    setDeleteSubmitting(true)
    try {
      await props.api.deleteRecord(props.workspaceId, 'INVOICE', deleteTarget.record.eventDate, deleteTarget.record.recordId)
      queryClient.invalidateQueries({ queryKey: queryKeys.recordsByYearRecordType(props.workspaceId, 'INVOICE') })
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
        title={t('income.title')}
        right={
          props.readOnly ? null : (
            <Button variant="contained" component={RouterLink} to={`/workspaces/${props.workspaceId}/income/new`}>
              {t('income.add')}
            </Button>
          )
        }
      />

      <RecordListControls
        labelId="income-year-label"
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
        tableLabel={t('income.title')}
        cardsLabel={t('income.title')}
        table={
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
                    {props.readOnly ? null : <TableCell align="right">{t('records.actions')}</TableCell>}
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
                        {props.readOnly ? null : (
                          <TableCell align="right" padding="checkbox">
                            <MoreActionsMenu
                              onEdit={() =>
                                navigate(`/workspaces/${props.workspaceId}/income/${record.eventDate}/${record.recordId}/edit`)
                              }
                              onDelete={() =>
                                setDeleteTarget({
                                  record,
                                  label: `${t('recordTypes.INVOICE')} ${payload?.number ?? record.recordId}`,
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
                        <Typography color="text.secondary">{t('income.empty', { year })}</Typography>
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
                  subtitle={payload?.client ?? t('common.na')}
                  amount={payload ? money.format(payload.baseExclVat) : t('common.na')}
                  facts={[
                    { label: t('records.invoiceNumber'), value: payload?.number ?? t('common.na') },
                    { label: t('records.invoiceDate'), value: payload?.invoiceDate ?? t('common.na') },
                  ]}
                  details={[
                    { label: t('records.paymentDate'), value: payload?.paymentDate ?? t('common.na') },
                    { label: t('records.client'), value: payload?.client ?? t('common.na') },
                  ]}
                  actions={
                    props.readOnly ? null : (
                      <MoreActionsMenu
                        onEdit={() => navigate(`/workspaces/${props.workspaceId}/income/${record.eventDate}/${record.recordId}/edit`)}
                        onDelete={() =>
                          setDeleteTarget({
                            record,
                            label: `${t('recordTypes.INVOICE')} ${payload?.number ?? record.recordId}`,
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
                <Typography color="text.secondary">{t('income.empty', { year })}</Typography>
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
    </Stack>
  )
}
