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

const todayIso = (): string => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const isIsoDate = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s)

export function WorkspaceExpensesCreatePage(props: { workspaceId: string; api: AutonomoControlApi }) {
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
    if (!isIsoDate(documentDate)) return 'Document date must be a valid ISO date (YYYY-MM-DD).'
    if (paymentDate && !isIsoDate(paymentDate)) return 'Payment date must be a valid ISO date (YYYY-MM-DD).'
    if (!vendor.trim()) return 'Vendor is required.'
    if (!category.trim()) return 'Category is required.'
    const base = parseEuroAmount(baseExclVat)
    if (base === null) return 'Base (excl. VAT) must be a number.'
    const share = Number(deductibleShare)
    if (!Number.isFinite(share)) return 'Deductible share must be a number in [0, 1].'
    if (share < 0 || share > 1) return 'Deductible share must be in [0, 1].'
    const override = amountPaidOverride.trim() ? parseEuroAmount(amountPaidOverride) : null
    if (override === null && amountPaidOverride.trim()) return 'Amount paid override must be a number.'
    return null
  }, [amountPaidOverride, baseExclVat, category, deductibleShare, documentDate, paymentDate, vendor])

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
      if (base === null) throw new Error('Base (excl. VAT) must be a number.')
      if (override === null && amountPaidOverride.trim()) throw new Error('Amount paid override must be a number.')

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
        title="Add expense"
        description="Creates an EXPENSE record in this workspace."
        right={
          <Button component={RouterLink} to={backToExpensesPath} variant="text">
            Cancel
          </Button>
        }
      />

      {error ? <ErrorAlert message={error} /> : null}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Alert severity="info">
            <Typography variant="body2">
              This form submits to <code>POST /workspaces/{'{workspaceId}'}/records</code> with <code>recordType=EXPENSE</code>.
            </Typography>
          </Alert>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Document date"
              type="date"
              value={documentDate}
              onChange={(e) => setDocumentDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              required
              fullWidth
              error={Boolean(documentDate) && !isIsoDate(documentDate)}
            />
            <TextField
              label="Payment date (optional)"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              error={Boolean(paymentDate) && !isIsoDate(paymentDate)}
              helperText="Used as eventDate if provided."
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} required fullWidth />
            <TextField label="Category" value={category} onChange={(e) => setCategory(e.target.value)} required fullWidth />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <EuroTextField
              label="Base (excl. VAT)"
              value={baseExclVat}
              onChange={(e) => setBaseExclVat(e.target.value)}
              required
              fullWidth
            />
            <EuroTextField
              label="Amount paid override (optional)"
              value={amountPaidOverride}
              onChange={(e) => setAmountPaidOverride(e.target.value)}
              fullWidth
              helperText="Only when paid differs from computed total."
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel id="iva-rate-label">IVA rate</InputLabel>
              <Select
                labelId="iva-rate-label"
                label="IVA rate"
                value={ivaRate}
                onChange={(e) => setIvaRate(e.target.value as IvaRate)}
              >
                {(['ZERO', 'SUPER_REDUCED', 'REDUCED', 'STANDARD'] as const).map((r) => (
                  <MenuItem key={r} value={r}>
                    {r}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Deductible share (0..1)"
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
            label="VAT recoverable"
          />

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button component={RouterLink} to={backToExpensesPath} variant="outlined" disabled={submitting}>
              Back
            </Button>
            <Button variant="contained" onClick={submit} disabled={submitting}>
              {submitting ? 'Creating…' : 'Create expense'}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  )
}
