import { useMemo, useState } from 'react'
import {
  Alert,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import type { StatePaymentType } from '../../domain/records'
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

export function WorkspaceStatePaymentsCreatePage(props: { workspaceId: string; api: AutonomoControlApi }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [paymentDate, setPaymentDate] = useState(todayIso())
  const [type, setType] = useState<StatePaymentType>('Modelo303')
  const [amount, setAmount] = useState('300')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const backToPath = `/workspaces/${props.workspaceId}/state-payments`

  const validationError = useMemo(() => {
    if (!isIsoDate(paymentDate)) return t('statePaymentsCreate.validation.paymentDate')
    const a = parseEuroAmount(amount)
    if (a === null) return t('statePaymentsCreate.validation.amountNumber')
    if (a < 0) return t('statePaymentsCreate.validation.amountNonNegative')
    return null
  }, [amount, paymentDate, t])

  const submit = async () => {
    setError(null)
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    try {
      const a = parseEuroAmount(amount)
      if (a === null) throw new Error(t('statePaymentsCreate.validation.amountNumber'))

      const res = await props.api.createRecord(props.workspaceId, {
        recordType: 'STATE_PAYMENT',
        payload: {
          paymentDate,
          type,
          amount: a,
        },
      })

      queryClient.invalidateQueries({ queryKey: queryKeys.recordsByYearRecordType(props.workspaceId, 'STATE_PAYMENT') })
      queryClient.invalidateQueries({ queryKey: queryKeys.summaries(props.workspaceId) })

      navigate(`/workspaces/${props.workspaceId}/state-payments/created`, { replace: true, state: { record: res } })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Stack spacing={2}>
      <PageHeader
        title={t('statePaymentsCreate.title')}
        description={t('statePaymentsCreate.description')}
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
              {t('statePaymentsCreate.info', {
                path: 'POST /workspaces/{workspaceId}/records',
                recordType: 'recordType=STATE_PAYMENT',
              })}
            </Typography>
          </Alert>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label={t('statePaymentsCreate.paymentDate')}
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              required
              fullWidth
              error={Boolean(paymentDate) && !isIsoDate(paymentDate)}
            />
            <EuroTextField
              label={t('statePaymentsCreate.amount')}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              fullWidth
            />
          </Stack>

          <FormControl fullWidth>
            <InputLabel id="state-payment-type-label">{t('statePaymentsCreate.type')}</InputLabel>
            <Select
              labelId="state-payment-type-label"
              label={t('statePaymentsCreate.type')}
              value={type}
              onChange={(e) => setType(e.target.value as StatePaymentType)}
            >
              {(['Modelo303', 'Modelo130', 'SeguridadSocial', 'RentaAnual', 'Other'] as const).map((typeOpt) => (
                <MenuItem key={typeOpt} value={typeOpt}>
                  {t(`statePaymentsCreate.types.${typeOpt}`)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button component={RouterLink} to={backToPath} variant="outlined" disabled={submitting}>
              {t('common.back')}
            </Button>
            <Button variant="contained" onClick={submit} disabled={submitting}>
              {submitting ? t('common.creating') : t('statePaymentsCreate.create')}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  )
}
