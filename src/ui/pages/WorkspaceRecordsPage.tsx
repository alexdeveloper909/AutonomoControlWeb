import { useEffect, useMemo, useState } from 'react'
import { Button, Divider, Paper, Stack, TextField, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import type { RecordResponse, RecordType } from '../../domain/records'
import { ErrorAlert } from '../components/ErrorAlert'
import { useTranslation } from 'react-i18next'

const monthKeyToday = (): string => {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${d.getFullYear()}-${m}`
}

export function WorkspaceRecordsPage(props: {
  workspaceId: string
  api: AutonomoControlApi
}) {
  const { t } = useTranslation()
  const [monthKey, setMonthKey] = useState(monthKeyToday())
  const [recordType, setRecordType] = useState<RecordType>('INVOICE')
  const [items, setItems] = useState<RecordResponse[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [payloadJson, setPayloadJson] = useState<string>(() =>
    JSON.stringify(
      {
        invoiceDate: `${new Date().getFullYear()}-01-01`,
        baseExclVat: 1000.0,
        ivaRate: 'STANDARD',
        retencion: 'STANDARD',
      },
      null,
      2,
    ),
  )

  const refresh = async () => {
    setError(null)
    setItems(null)
    try {
      const res = await props.api.listRecordsByMonth(props.workspaceId, monthKey, recordType)
      setItems(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey, recordType])

  const createRecord = async () => {
    setError(null)
    try {
      const payload = JSON.parse(payloadJson) as unknown
      await props.api.createRecord(props.workspaceId, { recordType, payload: payload as never })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const itemsText = useMemo(() => (items ? JSON.stringify(items, null, 2) : ''), [items])

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            label={t('debug.monthKey')}
            value={monthKey}
            onChange={(e) => setMonthKey(e.target.value)}
            placeholder="2025-01"
          />
          <TextField
            label={t('debug.recordType')}
            value={recordType}
            onChange={(e) => setRecordType(e.target.value as RecordType)}
            select
            SelectProps={{ native: true }}
          >
            {(['INVOICE', 'EXPENSE', 'TRANSFER', 'STATE_PAYMENT', 'BUDGET'] as const).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </TextField>
          <Button variant="outlined" onClick={refresh}>
            {t('common.refresh')}
          </Button>
          <Button variant="text" component={RouterLink} to={`/workspaces/${props.workspaceId}/budget`}>
            {t('budget.title')}
          </Button>
        </Stack>
      </Paper>

      {error ? <ErrorAlert message={error} /> : null}

      <Paper sx={{ p: 2 }}>
        <Stack spacing={1}>
          <Typography variant="subtitle1">{t('debug.createRecordTitle')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('debug.schemasHint')}
          </Typography>
          <TextField
            value={payloadJson}
            onChange={(e) => setPayloadJson(e.target.value)}
            minRows={8}
            multiline
            fullWidth
            sx={{ '& textarea': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' } }}
          />
          <Button variant="contained" onClick={createRecord}>
            {t('common.create')}
          </Button>
        </Stack>
      </Paper>

      <Divider />

      <Paper sx={{ p: 2 }}>
        <Stack spacing={1}>
          <Typography variant="subtitle1">{t('debug.recordsMonthFilter')}</Typography>
          <TextField value={itemsText} multiline minRows={10} fullWidth InputProps={{ readOnly: true }} />
        </Stack>
      </Paper>
    </Stack>
  )
}
