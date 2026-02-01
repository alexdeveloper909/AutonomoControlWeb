import { useMemo, useState } from 'react'
import { Alert, Button, FormControl, InputLabel, MenuItem, Paper, Select, Stack, TextField, Typography } from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import type { TransferOp } from '../../domain/records'
import { PageHeader } from '../components/PageHeader'
import { ErrorAlert } from '../components/ErrorAlert'
import { EuroTextField } from '../components/EuroTextField'
import { parseEuroAmount } from '../lib/money'
import { queryKeys } from '../queries/queryKeys'
import { useTranslation } from 'react-i18next'

const todayIso = (): string => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const isIsoDate = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s)

export function WorkspaceTransfersCreatePage(props: { workspaceId: string; api: AutonomoControlApi }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [date, setDate] = useState(todayIso())
  const [operation, setOperation] = useState<TransferOp>('Inflow')
  const [amount, setAmount] = useState('150')
  const [note, setNote] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const backToPath = `/workspaces/${props.workspaceId}/transfers`

  const validationError = useMemo(() => {
    if (!isIsoDate(date)) return t('transfersCreate.validation.date')
    const a = parseEuroAmount(amount)
    if (a === null) return t('transfersCreate.validation.amountNumber')
    if (a < 0) return t('transfersCreate.validation.amountNonNegative')
    return null
  }, [amount, date, t])

  const submit = async () => {
    setError(null)
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    try {
      const a = parseEuroAmount(amount)
      if (a === null) throw new Error(t('transfersCreate.validation.amountNumber'))

      const res = await props.api.createRecord(props.workspaceId, {
        recordType: 'TRANSFER',
        payload: {
          date,
          operation,
          amount: a,
          note: note.trim() ? note.trim() : undefined,
        },
      })

      queryClient.invalidateQueries({ queryKey: queryKeys.recordsByYearRecordType(props.workspaceId, 'TRANSFER') })

      navigate(`/workspaces/${props.workspaceId}/transfers/created`, { replace: true, state: { record: res } })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Stack spacing={2}>
      <PageHeader
        title={t('transfersCreate.title')}
        description={t('transfersCreate.description')}
        right={
          <Button component={RouterLink} to={backToPath} variant="text">
            {t('common.cancel')}
          </Button>
        }
      />

      {error ? <ErrorAlert message={error} /> : null}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Alert severity="info">
            <Typography variant="body2">
              {t('transfersCreate.info', {
                path: 'POST /workspaces/{workspaceId}/records',
                recordType: 'recordType=TRANSFER',
              })}
            </Typography>
          </Alert>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label={t('transfersCreate.date')}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              required
              fullWidth
              error={Boolean(date) && !isIsoDate(date)}
            />
            <EuroTextField
              label={t('transfersCreate.amount')}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              fullWidth
            />
          </Stack>

          <FormControl fullWidth>
            <InputLabel id="transfer-operation-label">{t('transfersCreate.operation')}</InputLabel>
            <Select
              labelId="transfer-operation-label"
              label={t('transfersCreate.operation')}
              value={operation}
              onChange={(e) => setOperation(e.target.value as TransferOp)}
            >
              {(['Inflow', 'Outflow'] as const).map((op) => (
                <MenuItem key={op} value={op}>
                  {t(`transfersCreate.operations.${op}`)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField label={t('transfersCreate.noteOptional')} value={note} onChange={(e) => setNote(e.target.value)} fullWidth multiline minRows={2} />

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button component={RouterLink} to={backToPath} variant="outlined" disabled={submitting}>
              {t('common.back')}
            </Button>
            <Button variant="contained" onClick={submit} disabled={submitting}>
              {submitting ? t('common.creating') : t('transfersCreate.create')}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  )
}
