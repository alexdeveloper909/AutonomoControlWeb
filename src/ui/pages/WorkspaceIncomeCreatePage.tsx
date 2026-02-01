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
import type { IvaRate, RetencionRate } from '../../domain/records'
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

export function WorkspaceIncomeCreatePage(props: { workspaceId: string; api: AutonomoControlApi }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [invoiceDate, setInvoiceDate] = useState(todayIso())
  const [number, setNumber] = useState('')
  const [client, setClient] = useState('')
  const [baseExclVat, setBaseExclVat] = useState('1000')
  const [ivaRate, setIvaRate] = useState<IvaRate>('STANDARD')
  const [retencion, setRetencion] = useState<RetencionRate>('STANDARD')
  const [paymentDate, setPaymentDate] = useState('')
  const [amountReceivedOverride, setAmountReceivedOverride] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const backToIncomePath = `/workspaces/${props.workspaceId}/income`

  const validationError = useMemo(() => {
    if (!isIsoDate(invoiceDate)) return t('incomeCreate.validation.invoiceDate')
    if (paymentDate && !isIsoDate(paymentDate)) return t('incomeCreate.validation.paymentDate')
    if (!number.trim()) return t('incomeCreate.validation.invoiceNumberRequired')
    if (!client.trim()) return t('incomeCreate.validation.clientRequired')
    const base = parseEuroAmount(baseExclVat)
    if (base === null) return t('incomeCreate.validation.baseNumber')
    const override = amountReceivedOverride.trim() ? parseEuroAmount(amountReceivedOverride) : null
    if (override === null && amountReceivedOverride.trim()) return t('incomeCreate.validation.amountReceivedOverrideNumber')
    return null
  }, [amountReceivedOverride, baseExclVat, client, invoiceDate, number, paymentDate, t])

  const submit = async () => {
    setError(null)
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    try {
      const base = parseEuroAmount(baseExclVat)
      const override = amountReceivedOverride.trim() ? parseEuroAmount(amountReceivedOverride) : null
      if (base === null) throw new Error(t('incomeCreate.validation.baseNumber'))
      if (override === null && amountReceivedOverride.trim()) throw new Error(t('incomeCreate.validation.amountReceivedOverrideNumber'))

      const res = await props.api.createRecord(props.workspaceId, {
        recordType: 'INVOICE',
        payload: {
          invoiceDate,
          number: number.trim(),
          client: client.trim(),
          baseExclVat: base,
          ivaRate,
          retencion,
          paymentDate: paymentDate.trim() ? paymentDate.trim() : undefined,
          amountReceivedOverride: override ?? undefined,
        },
      })

      queryClient.invalidateQueries({ queryKey: queryKeys.recordsByYearRecordType(props.workspaceId, 'INVOICE') })
      queryClient.invalidateQueries({ queryKey: queryKeys.summaries(props.workspaceId) })

      navigate(`/workspaces/${props.workspaceId}/income/created`, { replace: true, state: { record: res } })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Stack spacing={2}>
      <PageHeader
        title={t('incomeCreate.title')}
        description={t('incomeCreate.description')}
        right={
          <Button component={RouterLink} to={backToIncomePath} variant="text">
            {t('common.cancel')}
          </Button>
        }
      />

      {error ? <ErrorAlert message={error} /> : null}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Alert severity="info">
            <Typography variant="body2">
              {t('incomeCreate.info', {
                path: 'POST /workspaces/{workspaceId}/records',
                recordType: 'recordType=INVOICE',
              })}
            </Typography>
          </Alert>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label={t('incomeCreate.invoiceDate')}
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              required
              fullWidth
              error={Boolean(invoiceDate) && !isIsoDate(invoiceDate)}
            />
            <TextField
              label={t('incomeCreate.paymentDateOptional')}
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              error={Boolean(paymentDate) && !isIsoDate(paymentDate)}
              helperText={t('incomeCreate.eventDateHint')}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label={t('incomeCreate.invoiceNumber')} value={number} onChange={(e) => setNumber(e.target.value)} required fullWidth />
            <TextField label={t('incomeCreate.client')} value={client} onChange={(e) => setClient(e.target.value)} required fullWidth />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <EuroTextField
              label={t('incomeCreate.baseExclVat')}
              value={baseExclVat}
              onChange={(e) => setBaseExclVat(e.target.value)}
              required
              fullWidth
            />
            <EuroTextField
              label={t('incomeCreate.amountReceivedOverrideOptional')}
              value={amountReceivedOverride}
              onChange={(e) => setAmountReceivedOverride(e.target.value)}
              fullWidth
              helperText={t('incomeCreate.amountReceivedOverrideHint')}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel id="iva-rate-label">{t('rates.iva.label')}</InputLabel>
              <Select
                labelId="iva-rate-label"
                label={t('rates.iva.label')}
                value={ivaRate}
                onChange={(e) => setIvaRate(e.target.value as IvaRate)}
              >
                {(['ZERO', 'SUPER_REDUCED', 'REDUCED', 'STANDARD'] as const).map((r) => (
                  <MenuItem key={r} value={r}>
                    {t(`rates.iva.${r}`)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="retencion-label">{t('rates.retencion.label')}</InputLabel>
              <Select
                labelId="retencion-label"
                label={t('rates.retencion.label')}
                value={retencion}
                onChange={(e) => setRetencion(e.target.value as RetencionRate)}
              >
                {(['ZERO', 'NEW_PROFESSIONAL', 'STANDARD'] as const).map((r) => (
                  <MenuItem key={r} value={r}>
                    {t(`rates.retencion.${r}`)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button component={RouterLink} to={backToIncomePath} variant="outlined" disabled={submitting}>
              {t('common.back')}
            </Button>
            <Button variant="contained" onClick={submit} disabled={submitting}>
              {submitting ? t('common.creating') : t('incomeCreate.create')}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  )
}
