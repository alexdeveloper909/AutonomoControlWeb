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
import { EuroTextField } from '../components/EuroTextField'
import { parseEuroAmount } from '../lib/money'

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
    if (!number.trim()) return 'Invoice number is required.'
    if (!client.trim()) return 'Client is required.'
    const base = parseEuroAmount(baseExclVat)
    if (base === null) return 'Base (excl. VAT) must be a number.'
    const override = amountReceivedOverride.trim() ? parseEuroAmount(amountReceivedOverride) : null
    if (override === null && amountReceivedOverride.trim()) return 'Amount received override must be a number.'
    return null
  }, [amountReceivedOverride, baseExclVat, client, invoiceDate, number, paymentDate])

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
      if (base === null) throw new Error('Base (excl. VAT) must be a number.')
      if (override === null && amountReceivedOverride.trim()) throw new Error('Amount received override must be a number.')

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
            <TextField label="Invoice number" value={number} onChange={(e) => setNumber(e.target.value)} required fullWidth />
            <TextField label="Client" value={client} onChange={(e) => setClient(e.target.value)} required fullWidth />
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
              label="Amount received override (optional)"
              value={amountReceivedOverride}
              onChange={(e) => setAmountReceivedOverride(e.target.value)}
              fullWidth
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
