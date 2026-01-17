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
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import type { IvaRate, RetencionRate } from '../../domain/records'
import { PageHeader } from '../components/PageHeader'
import { ErrorAlert } from '../components/ErrorAlert'

const todayIso = (): string => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const isIsoDate = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s)

export function WorkspaceIncomeCreatePage(props: { workspaceId: string; api: AutonomoControlApi }) {
  const navigate = useNavigate()

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
    if (!isIsoDate(invoiceDate)) return 'Invoice date must be a valid ISO date (YYYY-MM-DD).'
    if (paymentDate && !isIsoDate(paymentDate)) return 'Payment date must be a valid ISO date (YYYY-MM-DD).'
    const base = Number(baseExclVat)
    if (!Number.isFinite(base)) return 'Base (excl. VAT) must be a number.'
    const override = amountReceivedOverride ? Number(amountReceivedOverride) : null
    if (override !== null && !Number.isFinite(override)) return 'Amount received override must be a number.'
    return null
  }, [amountReceivedOverride, baseExclVat, invoiceDate, paymentDate])

  const submit = async () => {
    setError(null)
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    try {
      const res = await props.api.createRecord(props.workspaceId, {
        recordType: 'INVOICE',
        payload: {
          invoiceDate,
          number: number.trim() ? number.trim() : undefined,
          client: client.trim() ? client.trim() : undefined,
          baseExclVat: Number(baseExclVat),
          ivaRate,
          retencion,
          paymentDate: paymentDate.trim() ? paymentDate.trim() : undefined,
          amountReceivedOverride: amountReceivedOverride.trim() ? Number(amountReceivedOverride) : undefined,
        },
      })

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
        title="Add income"
        description="Creates an INVOICE record in this workspace."
        right={
          <Button component={RouterLink} to={backToIncomePath} variant="text">
            Cancel
          </Button>
        }
      />

      {error ? <ErrorAlert message={error} /> : null}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Alert severity="info">
            <Typography variant="body2">
              This form submits to <code>POST /workspaces/{'{workspaceId}'}/records</code> with <code>recordType=INVOICE</code>.
            </Typography>
          </Alert>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Invoice date"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              required
              fullWidth
              error={Boolean(invoiceDate) && !isIsoDate(invoiceDate)}
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
            <TextField label="Invoice number (optional)" value={number} onChange={(e) => setNumber(e.target.value)} fullWidth />
            <TextField label="Client (optional)" value={client} onChange={(e) => setClient(e.target.value)} fullWidth />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Base (excl. VAT)"
              value={baseExclVat}
              onChange={(e) => setBaseExclVat(e.target.value)}
              required
              fullWidth
              inputMode="decimal"
            />
            <TextField
              label="Amount received override (optional)"
              value={amountReceivedOverride}
              onChange={(e) => setAmountReceivedOverride(e.target.value)}
              fullWidth
              inputMode="decimal"
              helperText="Only when received differs from computed total."
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
            <FormControl fullWidth>
              <InputLabel id="retencion-label">Retención</InputLabel>
              <Select
                labelId="retencion-label"
                label="Retención"
                value={retencion}
                onChange={(e) => setRetencion(e.target.value as RetencionRate)}
              >
                {(['ZERO', 'NEW_PROFESSIONAL', 'STANDARD'] as const).map((r) => (
                  <MenuItem key={r} value={r}>
                    {r}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button component={RouterLink} to={backToIncomePath} variant="outlined" disabled={submitting}>
              Back
            </Button>
            <Button variant="contained" onClick={submit} disabled={submitting}>
              {submitting ? 'Creating…' : 'Create income'}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  )
}

