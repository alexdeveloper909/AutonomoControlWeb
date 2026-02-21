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
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import type { RecordResponse, RegularSpendingPayload } from '../../domain/records'
import { PageHeader } from '../components/PageHeader'
import { ErrorAlert } from '../components/ErrorAlert'
import { MoreActionsMenu } from '../components/MoreActionsMenu'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { queryKeys } from '../queries/queryKeys'
import { useTranslation } from 'react-i18next'
import { decimalFormatter } from '../lib/intl'

const asRegularSpendingPayload = (payload: unknown): RegularSpendingPayload | null => {
  if (!payload || typeof payload !== 'object') return null
  const p = payload as Partial<RegularSpendingPayload>
  if (typeof p.name !== 'string') return null
  if (typeof p.startDate !== 'string') return null
  if (typeof p.cadence !== 'string') return null
  if (typeof p.amount !== 'number') return null
  return p as RegularSpendingPayload
}

export function WorkspaceRegularSpendingsListPage(props: {
  workspaceId: string
  api: AutonomoControlApi
  readOnly: boolean
}) {
  const { t, i18n } = useTranslation()
  const money = useMemo(() => decimalFormatter(i18n.language), [i18n.language])
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const basePath = `/workspaces/${props.workspaceId}/regular-spendings`

  const [deleteTarget, setDeleteTarget] = useState<{ record: RecordResponse; label: string } | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { data, error, isPending, isFetching } = useQuery({
    queryKey: queryKeys.regularSpendings(props.workspaceId),
    queryFn: () => props.api.listRegularSpendings(props.workspaceId),
  })

  const tableRows = useMemo(() => {
    if (!data) return null
    return data.items
      .filter((r) => r.recordType === 'REGULAR_SPENDING')
      .map((r) => ({ record: r, payload: asRegularSpendingPayload(r.payload) }))
  }, [data])

  const colSpan = props.readOnly ? 4 : 5

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    setDeleteSubmitting(true)
    try {
      await props.api.deleteRecord(
        props.workspaceId,
        'REGULAR_SPENDING',
        deleteTarget.record.eventDate,
        deleteTarget.record.recordId,
      )
      queryClient.invalidateQueries({ queryKey: queryKeys.regularSpendings(props.workspaceId) })
      setDeleteTarget(null)
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : String(e))
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.regularSpendings(props.workspaceId) })
  }

  return (
    <Stack spacing={2}>
      <PageHeader
        title={t('regularSpendingsList.title')}
        description={t('regularSpendingsList.description')}
        right={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" component={RouterLink} to={basePath}>
              {t('regularSpendingsList.backToDashboard')}
            </Button>
            {props.readOnly ? null : (
              <Button variant="contained" component={RouterLink} to={`${basePath}/new`}>
                {t('regularSpendings.add')}
              </Button>
            )}
          </Stack>
        }
      />

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
          <Button variant="text" onClick={refresh} disabled={isFetching}>
            {t('common.refresh')}
          </Button>
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
                <TableCell>{t('regularSpendingsList.name')}</TableCell>
                <TableCell>{t('regularSpendingsList.cadence')}</TableCell>
                <TableCell>{t('regularSpendingsList.startDate')}</TableCell>
                <TableCell align="right">{t('regularSpendingsList.amount')}</TableCell>
                {props.readOnly ? null : <TableCell align="right">{t('records.actions')}</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {tableRows?.length ? (
                tableRows.map(({ record, payload }) => (
                  <TableRow key={record.recordKey} hover>
                    <TableCell>{payload?.name ?? t('common.na')}</TableCell>
                    <TableCell>
                      {payload ? t(`regularSpendings.cadence.${payload.cadence}`) : t('common.na')}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{payload?.startDate ?? t('common.na')}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {payload ? money.format(payload.amount) : t('common.na')}
                    </TableCell>
                    {props.readOnly ? null : (
                      <TableCell align="right" padding="checkbox">
                        <MoreActionsMenu
                          onEdit={() =>
                            navigate(`${basePath}/${record.eventDate}/${record.recordId}/edit`)
                          }
                          onDelete={() =>
                            setDeleteTarget({
                              record,
                              label: `${t('recordTypes.REGULAR_SPENDING')} ${payload?.name ?? record.recordId}`,
                            })
                          }
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : data ? (
                <TableRow>
                  <TableCell colSpan={colSpan}>
                    <Typography color="text.secondary">{t('regularSpendingsList.empty')}</Typography>
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
