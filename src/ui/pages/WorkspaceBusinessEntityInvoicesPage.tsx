import { useMemo, useState } from 'react'
import { Button, FormControl, InputLabel, LinearProgress, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import type { RecordResponse, UkrainianFopInvoicePayload } from '../../domain/records'
import { isUkrainianFopEntity } from '../../domain/settings'
import { PageHeader } from '../components/PageHeader'
import { ErrorAlert } from '../components/ErrorAlert'
import { MoreActionsMenu } from '../components/MoreActionsMenu'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ResponsiveDataView } from '../components/ResponsiveDataView'
import { MobileRecordCard } from '../components/MobileRecordCard'
import { currencyFormatter, decimalFormatter } from '../lib/intl'
import { queryKeys } from '../queries/queryKeys'
import { useTranslation } from 'react-i18next'

const PAGE_SIZE = 20
const currentYear = (): string => String(new Date().getFullYear())

const asUkrainianFopInvoice = (payload: unknown): UkrainianFopInvoicePayload | null => {
  if (!payload || typeof payload !== 'object') return null
  const p = payload as Partial<UkrainianFopInvoicePayload>
  if (p.invoiceType !== 'UKRAINIAN_FOP') return null
  if (typeof p.entityId !== 'string' || typeof p.invoiceDate !== 'string' || typeof p.receivedDate !== 'string') return null
  if (typeof p.number !== 'string' || typeof p.client !== 'string' || typeof p.amount !== 'number') return null
  if (p.currency !== 'USD' && p.currency !== 'UAH') return null
  if (p.taxCurrency !== 'UAH' || typeof p.exchangeRateToTaxCurrency !== 'number' || typeof p.amountTaxCurrency !== 'number') return null
  return p as UkrainianFopInvoicePayload
}

export function WorkspaceBusinessEntityInvoicesPage(props: {
  workspaceId: string
  entityId: string
  api: AutonomoControlApi
  readOnly: boolean
}) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [year, setYear] = useState(currentYear())
  const [pageIndex, setPageIndex] = useState(0)
  const [expandedRecordKey, setExpandedRecordKey] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ record: RecordResponse; label: string } | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const uah = useMemo(() => currencyFormatter(i18n.language, 'UAH'), [i18n.language])
  const decimal = useMemo(() => decimalFormatter(i18n.language), [i18n.language])
  const basePath = `/workspaces/${props.workspaceId}/business-entities/${props.entityId}`
  const queryKey = queryKeys.entityInvoiceRecordsByYear(props.workspaceId, props.entityId, year)

  const entitiesQuery = useQuery({
    queryKey: queryKeys.businessEntities(props.workspaceId, true),
    queryFn: () => props.api.listBusinessEntities(props.workspaceId, true),
  })
  const entity = entitiesQuery.data?.find((item) => item.entityId === props.entityId) ?? null
  const archived = Boolean(entity?.archivedAt)

  const recordsQuery = useInfiniteQuery({
    queryKey,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      props.api.listInvoiceRecordsByEntityYear(props.workspaceId, props.entityId, year, {
        sort: 'eventDateDesc',
        limit: PAGE_SIZE,
        nextToken: pageParam,
      }),
    getNextPageParam: (lastPage) => lastPage.nextToken ?? undefined,
    enabled: isUkrainianFopEntity(entity),
  })

  const currentPageItems = recordsQuery.data?.pages[pageIndex]?.items ?? null
  const nextToken = recordsQuery.data?.pages[pageIndex]?.nextToken ?? null
  const nextPageLoaded = Boolean(recordsQuery.data?.pages[pageIndex + 1])
  const rows = useMemo(
    () => currentPageItems?.map((record) => ({ record, payload: asUkrainianFopInvoice(record.payload) })) ?? null,
    [currentPageItems],
  )
  const yearOptions = useMemo(() => {
    const current = Number(currentYear())
    return Array.from({ length: 12 }, (_, i) => String(current + 1 - i))
  }, [])

  const refresh = () => {
    setPageIndex(0)
    queryClient.removeQueries({ queryKey })
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    setDeleteSubmitting(true)
    try {
      await props.api.deleteRecord(props.workspaceId, 'BUSINESS_ENTITY_INVOICE', deleteTarget.record.eventDate, deleteTarget.record.recordId)
      queryClient.invalidateQueries({ queryKey: queryKeys.entityInvoiceRecordsAll(props.workspaceId, props.entityId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.entitySummariesAll(props.workspaceId, props.entityId) })
      setDeleteTarget(null)
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : String(e))
    } finally {
      setDeleteSubmitting(false)
    }
  }

  if (entitiesQuery.isPending) return <LinearProgress />
  if (entitiesQuery.error) return <ErrorAlert message={entitiesQuery.error instanceof Error ? entitiesQuery.error.message : String(entitiesQuery.error)} />
  if (!entity) return <ErrorAlert message="Business entity not found." />
  if (!isUkrainianFopEntity(entity)) return <ErrorAlert message="This business entity type is not supported by this Web client yet." />

  return (
    <Stack spacing={2}>
      <PageHeader
        title={`${entity.name} invoices`}
        description="Received-date year filter. Received date controls Ukrainian FOP tax reporting."
        right={
          props.readOnly || archived ? null : (
            <Button variant="contained" component={RouterLink} to={`${basePath}/invoices/new`}>
              Add invoice
            </Button>
          )
        }
      />
      {archived ? <ErrorAlert message="This entity is archived. Invoices are read-only history." /> : null}
      {deleteError ? <ErrorAlert message={deleteError} /> : null}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <FormControl sx={{ minWidth: 160 }}>
            <InputLabel id="fop-invoices-year">Year</InputLabel>
            <Select labelId="fop-invoices-year" label="Year" value={year} size="small" onChange={(e) => { setYear(e.target.value); setPageIndex(0) }}>
              {yearOptions.map((option) => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
            flexWrap="wrap"
            useFlexGap
            sx={{ flex: 1, '& > .MuiButton-root': { minHeight: 44 } }}
          >
            <Typography variant="body2" color="text.secondary">{t('records.pageSummary', { page: pageIndex + 1, pageSize: PAGE_SIZE })}</Typography>
            <Button variant="text" onClick={refresh} disabled={recordsQuery.isFetching}>Refresh</Button>
            <Button variant="outlined" onClick={() => setPageIndex((p) => Math.max(0, p - 1))} disabled={recordsQuery.isFetching || pageIndex === 0}>Prev</Button>
            <Button
              variant="outlined"
              onClick={async () => {
                if (nextPageLoaded) {
                  setPageIndex((p) => p + 1)
                  return
                }
                if (!nextToken) return
                await recordsQuery.fetchNextPage()
                setPageIndex((p) => p + 1)
              }}
              disabled={recordsQuery.isFetching || (!nextPageLoaded && !nextToken)}
            >
              Next
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {recordsQuery.isFetching ? <LinearProgress /> : null}
      {recordsQuery.error ? <ErrorAlert message={recordsQuery.error instanceof Error ? recordsQuery.error.message : String(recordsQuery.error)} /> : null}

      <ResponsiveDataView
        tableLabel="Business entity invoices table"
        cardsLabel="Business entity invoices cards"
        table={
          <Paper variant="outlined">
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 780 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Received date</TableCell>
                    <TableCell>Invoice date</TableCell>
                    <TableCell>Invoice #</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">Tax base (UAH)</TableCell>
                    {props.readOnly || archived ? null : <TableCell align="right">Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows?.length ? (
                    rows.map(({ record, payload }) => (
                      <TableRow key={record.recordKey} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{payload?.receivedDate ?? record.eventDate}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{payload?.invoiceDate ?? t('common.na')}</TableCell>
                        <TableCell>{payload?.number ?? t('common.na')}</TableCell>
                        <TableCell sx={{ maxWidth: 280 }} title={payload?.client}>{payload?.client ?? t('common.na')}</TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          {payload ? `${decimal.format(payload.amount)} ${payload.currency}` : t('common.na')}
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{payload ? uah.format(payload.amountTaxCurrency) : t('common.na')}</TableCell>
                        {props.readOnly || archived ? null : (
                          <TableCell align="right" padding="checkbox">
                            <MoreActionsMenu
                              onEdit={() => navigate(`${basePath}/invoices/${record.eventDate}/${record.recordId}/edit`)}
                              onDelete={() => setDeleteTarget({ record, label: payload?.number ?? record.recordId })}
                            />
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : currentPageItems ? (
                    <TableRow>
                      <TableCell colSpan={props.readOnly || archived ? 6 : 7}>
                        <Typography color="text.secondary">No Ukrainian FOP invoices found for {year}.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : recordsQuery.isPending ? (
                    <TableRow>
                      <TableCell colSpan={props.readOnly || archived ? 6 : 7}>
                        <Typography color="text.secondary">Loading...</Typography>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        }
        cards={
          <Stack spacing={1.5}>
            {rows?.length ? (
              rows.map(({ record, payload }) => (
                <MobileRecordCard
                  key={record.recordKey}
                  title={payload?.receivedDate ?? record.eventDate}
                  subtitle={payload?.number ?? t('common.na')}
                  amount={payload ? `${decimal.format(payload.amount)} ${payload.currency}` : t('common.na')}
                  facts={[
                    { label: 'Tax base', value: payload ? uah.format(payload.amountTaxCurrency) : t('common.na') },
                  ]}
                  details={[
                    { label: 'Invoice date', value: payload?.invoiceDate ?? t('common.na') },
                    { label: 'Client', value: payload?.client ?? t('common.na') },
                  ]}
                  actions={
                    props.readOnly || archived ? null : (
                      <MoreActionsMenu
                        onEdit={() => navigate(`${basePath}/invoices/${record.eventDate}/${record.recordId}/edit`)}
                        onDelete={() => setDeleteTarget({ record, label: payload?.number ?? record.recordId })}
                      />
                    )
                  }
                  expanded={expandedRecordKey === record.recordKey}
                  onToggleExpanded={() => setExpandedRecordKey((current) => (current === record.recordKey ? null : record.recordKey))}
                  expandLabel="Show invoice details"
                />
              ))
            ) : currentPageItems ? (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography color="text.secondary">No Ukrainian FOP invoices found for {year}.</Typography>
              </Paper>
            ) : recordsQuery.isPending ? (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography color="text.secondary">Loading...</Typography>
              </Paper>
            ) : null}
          </Stack>
        }
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete invoice ${deleteTarget?.label ?? ''}?`}
        description="This can't be undone."
        confirmColor="error"
        loading={deleteSubmitting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </Stack>
  )
}
