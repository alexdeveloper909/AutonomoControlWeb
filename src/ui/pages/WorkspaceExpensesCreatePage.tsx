import { useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
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
import type { IvaRate } from '../../domain/records'
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

export function WorkspaceExpensesCreatePage(props: { workspaceId: string; api: AutonomoControlApi }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [documentDate, setDocumentDate] = useState(todayIso())
  const [paymentDate, setPaymentDate] = useState('')
  const [vendor, setVendor] = useState('')
  const [category, setCategory] = useState('')

  const [baseExclVat, setBaseExclVat] = useState('200')
  const [ivaRate, setIvaRate] = useState<IvaRate>('STANDARD')
  const [vatRecoverableFlag, setVatRecoverableFlag] = useState(true)
  const [deductibleShare, setDeductibleShare] = useState('1')
  const [amountPaidOverride, setAmountPaidOverride] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const backToExpensesPath = `/workspaces/${props.workspaceId}/expenses`

  const validationError = useMemo(() => {
    if (!isIsoDate(documentDate)) return t('expensesCreate.validation.documentDate')
    if (paymentDate && !isIsoDate(paymentDate)) return t('expensesCreate.validation.paymentDate')
    if (!vendor.trim()) return t('expensesCreate.validation.vendorRequired')
    if (!category.trim()) return t('expensesCreate.validation.categoryRequired')
    const base = parseEuroAmount(baseExclVat)
    if (base === null) return t('expensesCreate.validation.baseNumber')
    const share = Number(deductibleShare)
    if (!Number.isFinite(share)) return t('expensesCreate.validation.deductibleShareNumber')
    if (share < 0 || share > 1) return t('expensesCreate.validation.deductibleShareRange')
    const override = amountPaidOverride.trim() ? parseEuroAmount(amountPaidOverride) : null
    if (override === null && amountPaidOverride.trim()) return t('expensesCreate.validation.amountPaidOverrideNumber')
    return null
  }, [amountPaidOverride, baseExclVat, category, deductibleShare, documentDate, paymentDate, t, vendor])

  const submit = async () => {
    setError(null)
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    try {
      const base = parseEuroAmount(baseExclVat)
      const override = amountPaidOverride.trim() ? parseEuroAmount(amountPaidOverride) : null
      if (base === null) throw new Error(t('expensesCreate.validation.baseNumber'))
      if (override === null && amountPaidOverride.trim()) throw new Error(t('expensesCreate.validation.amountPaidOverrideNumber'))

      const res = await props.api.createRecord(props.workspaceId, {
        recordType: 'EXPENSE',
        payload: {
          documentDate,
          vendor: vendor.trim(),
          category: category.trim(),
          baseExclVat: base,
          ivaRate,
          vatRecoverableFlag,
          deductibleShare: Number(deductibleShare),
          paymentDate: paymentDate.trim() ? paymentDate.trim() : undefined,
          amountPaidOverride: override ?? undefined,
        },
      })

      queryClient.invalidateQueries({ queryKey: queryKeys.recordsByYearRecordType(props.workspaceId, 'EXPENSE') })
      queryClient.invalidateQueries({ queryKey: queryKeys.summaries(props.workspaceId) })

      navigate(`/workspaces/${props.workspaceId}/expenses/created`, { replace: true, state: { record: res } })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Stack spacing={2}>
      <PageHeader
        title={t('expensesCreate.title')}
        description={t('expensesCreate.description')}
        right={
          <Button component={RouterLink} to={backToExpensesPath} variant="text">
            {t('common.cancel')}
          </Button>
        }
      />

      {error ? <ErrorAlert message={error} /> : null}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Alert severity="info">
            <Typography variant="body2">
              {t('expensesCreate.info', {
                path: 'POST /workspaces/{workspaceId}/records',
                recordType: 'recordType=EXPENSE',
              })}
            </Typography>
          </Alert>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label={t('expensesCreate.documentDate')}
              type="date"
              value={documentDate}
              onChange={(e) => setDocumentDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              required
              fullWidth
              error={Boolean(documentDate) && !isIsoDate(documentDate)}
            />
            <TextField
              label={t('expensesCreate.paymentDateOptional')}
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              error={Boolean(paymentDate) && !isIsoDate(paymentDate)}
              helperText={t('expensesCreate.eventDateHint')}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label={t('expensesCreate.vendor')} value={vendor} onChange={(e) => setVendor(e.target.value)} required fullWidth />
            <TextField label={t('expensesCreate.category')} value={category} onChange={(e) => setCategory(e.target.value)} required fullWidth />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <EuroTextField
              label={t('expensesCreate.baseExclVat')}
              value={baseExclVat}
              onChange={(e) => setBaseExclVat(e.target.value)}
              required
              fullWidth
            />
            <EuroTextField
              label={t('expensesCreate.amountPaidOverrideOptional')}
              value={amountPaidOverride}
              onChange={(e) => setAmountPaidOverride(e.target.value)}
              fullWidth
              helperText={t('expensesCreate.amountPaidOverrideHint')}
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
            <TextField
              label={t('expensesCreate.deductibleShare')}
              value={deductibleShare}
              onChange={(e) => setDeductibleShare(e.target.value)}
              required
              fullWidth
              inputMode="decimal"
              error={Boolean(deductibleShare) && !(Number.isFinite(Number(deductibleShare)) && Number(deductibleShare) >= 0 && Number(deductibleShare) <= 1)}
            />
          </Stack>

          <FormControlLabel
            control={<Checkbox checked={vatRecoverableFlag} onChange={(e) => setVatRecoverableFlag(e.target.checked)} />}
            label={t('expensesCreate.vatRecoverable')}
          />

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button component={RouterLink} to={backToExpensesPath} variant="outlined" disabled={submitting}>
              {t('common.back')}
            </Button>
            <Button variant="contained" onClick={submit} disabled={submitting}>
              {submitting ? t('common.creating') : t('expensesCreate.create')}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  )
}
