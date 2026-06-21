import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, FormControl, FormHelperText, InputAdornment, InputLabel, LinearProgress, MenuItem, Paper, Select, Stack, TextField, Typography } from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import type { ExchangeRateSource, InvoiceCurrency, UkrainianFopInvoicePayload } from '../../domain/records'
import { isUkrainianFopEntity } from '../../domain/settings'
import { PageHeader } from '../components/PageHeader'
import { ErrorAlert } from '../components/ErrorAlert'
import { multiplyMoneyToCents, parseMoneyAmount } from '../lib/money'
import { currencyFormatter } from '../lib/intl'
import { queryKeys } from '../queries/queryKeys'
import { useTranslation } from 'react-i18next'

const todayIso = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const isIsoDate = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s)

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

export function WorkspaceBusinessEntityInvoiceCreatePage(props: {
  workspaceId: string
  entityId: string
  api: AutonomoControlApi
  mode?: 'create' | 'edit'
  eventDate?: string
  recordId?: string
}) {
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const editing = props.mode === 'edit'
  const basePath = `/workspaces/${props.workspaceId}/business-entities/${props.entityId}`
  const uah = useMemo(() => currencyFormatter(i18n.language, 'UAH'), [i18n.language])

  const entitiesQuery = useQuery({
    queryKey: queryKeys.businessEntities(props.workspaceId, true),
    queryFn: () => props.api.listBusinessEntities(props.workspaceId, true),
  })
  const entity = entitiesQuery.data?.find((item) => item.entityId === props.entityId) ?? null
  const allowedCurrencies = useMemo<InvoiceCurrency[]>(
    () =>
      (entity?.invoiceCurrencies?.filter((currency): currency is InvoiceCurrency => currency === 'USD' || currency === 'UAH') ?? [
        'USD',
        'UAH',
      ]),
    [entity?.invoiceCurrencies],
  )

  const recordQuery = useQuery({
    queryKey:
      editing && props.eventDate && props.recordId
        ? queryKeys.record(props.workspaceId, 'BUSINESS_ENTITY_INVOICE', props.eventDate, props.recordId)
        : ['workspaces', props.workspaceId, 'record', 'BUSINESS_ENTITY_INVOICE', props.eventDate ?? '', props.recordId ?? ''],
    queryFn: () => props.api.getRecord(props.workspaceId, 'BUSINESS_ENTITY_INVOICE', props.eventDate!, props.recordId!),
    enabled: editing && Boolean(props.eventDate && props.recordId),
  })

  const [invoiceDate, setInvoiceDate] = useState(todayIso())
  const [receivedDate, setReceivedDate] = useState(todayIso())
  const [number, setNumber] = useState('')
  const [client, setClient] = useState('')
  const [amount, setAmount] = useState('1000')
  const [currency, setCurrency] = useState<InvoiceCurrency>('USD')
  const [exchangeRate, setExchangeRate] = useState('')
  const [exchangeRateSource, setExchangeRateSource] = useState<ExchangeRateSource>('NBU')
  const [exchangeRateFetchedAt, setExchangeRateFetchedAt] = useState<string | null>(null)
  const [snapshotConfirmed, setSnapshotConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rateError, setRateError] = useState<string | null>(null)
  const [initializedFromRecord, setInitializedFromRecord] = useState(false)
  const [originalSnapshotDrivers, setOriginalSnapshotDrivers] = useState<{ amount: string; currency: InvoiceCurrency; receivedDate: string } | null>(null)

  useEffect(() => {
    if (!editing) return
    const record = recordQuery.data ?? null
    if (!record || initializedFromRecord) return
    const payload = asUkrainianFopInvoice(record.payload)
    if (!payload) {
      setError('Loaded invoice payload is invalid or unsupported.')
      setInitializedFromRecord(true)
      return
    }
    setInvoiceDate(payload.invoiceDate)
    setReceivedDate(payload.receivedDate)
    setNumber(payload.number)
    setClient(payload.client)
    setAmount(String(payload.amount))
    setCurrency(payload.currency)
    setExchangeRate(String(payload.exchangeRateToTaxCurrency))
    setExchangeRateSource(payload.exchangeRateSource)
    setExchangeRateFetchedAt(payload.exchangeRateFetchedAt ?? null)
    setSnapshotConfirmed(true)
    setOriginalSnapshotDrivers({ amount: String(payload.amount), currency: payload.currency, receivedDate: payload.receivedDate })
    setInitializedFromRecord(true)
  }, [editing, initializedFromRecord, recordQuery.data])

  useEffect(() => {
    const fallbackCurrency = allowedCurrencies[0]
    if (fallbackCurrency && !allowedCurrencies.includes(currency)) setCurrency(fallbackCurrency)
  }, [allowedCurrencies, currency])

  const parsedAmount = useMemo(() => parseMoneyAmount(amount), [amount])
  const parsedRate = useMemo(() => parseMoneyAmount(exchangeRate), [exchangeRate])
  const amountTaxCurrency = useMemo(
    () => (parsedAmount != null && parsedRate != null ? multiplyMoneyToCents(amount, exchangeRate) : null),
    [amount, exchangeRate, parsedAmount, parsedRate],
  )
  const snapshotDriversChanged = useMemo(() => {
    if (!editing || !originalSnapshotDrivers) return true
    return originalSnapshotDrivers.amount !== amount || originalSnapshotDrivers.currency !== currency || originalSnapshotDrivers.receivedDate !== receivedDate
  }, [amount, currency, editing, originalSnapshotDrivers, receivedDate])

  useEffect(() => {
    if (currency === 'UAH') {
      setExchangeRate('1')
      setExchangeRateSource('MANUAL')
      setExchangeRateFetchedAt(null)
      setSnapshotConfirmed(true)
      return
    }
    if (!isIsoDate(receivedDate)) return
    if (editing && !snapshotDriversChanged) return
    let cancelled = false
    setRateError(null)
    setSnapshotConfirmed(false)
    const loadRate = async () => {
      try {
        const res = await props.api.getNbuExchangeRate('USD', receivedDate)
        if (cancelled) return
        setExchangeRate(String(res.rate))
        setExchangeRateSource('NBU')
        setExchangeRateFetchedAt(res.fetchedAt ?? null)
        setSnapshotConfirmed(true)
      } catch (e) {
        if (cancelled) return
        setExchangeRateSource('MANUAL')
        setExchangeRateFetchedAt(null)
        setRateError(e instanceof Error ? e.message : String(e))
      }
    }
    void loadRate()
    return () => {
      cancelled = true
    }
  }, [currency, editing, props.api, receivedDate, snapshotDriversChanged])

  const validationError = useMemo(() => {
    if (editing && !initializedFromRecord) return null
    if (!entity) return 'Business entity not found.'
    if (entity.archivedAt) return 'Archived entities are read-only.'
    if (!isUkrainianFopEntity(entity)) return 'This business entity type is not supported by this Web client yet.'
    if (!isIsoDate(invoiceDate)) return 'Invoice date must be a valid ISO date (YYYY-MM-DD).'
    if (!isIsoDate(receivedDate)) return 'Received date must be a valid ISO date (YYYY-MM-DD).'
    if (!number.trim()) return 'Invoice number is required.'
    if (!client.trim()) return 'Client is required.'
    if (parsedAmount == null || parsedAmount < 0) return 'Amount must be a non-negative number.'
    if (parsedRate == null || parsedRate < 0) return 'Exchange rate must be a non-negative number.'
    if (!snapshotConfirmed) return 'Confirm or refresh the exchange-rate snapshot before saving.'
    return null
  }, [client, editing, entity, initializedFromRecord, invoiceDate, number, parsedAmount, parsedRate, receivedDate, snapshotConfirmed])

  const markManual = () => {
    setExchangeRateSource('MANUAL')
    setExchangeRateFetchedAt(null)
    setSnapshotConfirmed(true)
  }

  const submit = async () => {
    setError(null)
    if (validationError) {
      setError(validationError)
      return
    }
    if (parsedAmount == null || parsedRate == null || amountTaxCurrency == null) return
    setSubmitting(true)
    try {
      const payload: UkrainianFopInvoicePayload = {
        entityId: props.entityId,
        invoiceType: 'UKRAINIAN_FOP',
        invoiceDate,
        receivedDate,
        number: number.trim(),
        client: client.trim(),
        amount: parsedAmount,
        currency,
        taxCurrency: 'UAH',
        exchangeRateToTaxCurrency: parsedRate,
        exchangeRateSource,
        exchangeRateDate: receivedDate,
        exchangeRateFetchedAt: exchangeRateSource === 'NBU' ? exchangeRateFetchedAt : null,
        amountTaxCurrency,
      }
      if (editing) {
        await props.api.updateRecord(props.workspaceId, 'BUSINESS_ENTITY_INVOICE', props.eventDate!, props.recordId!, {
          recordType: 'BUSINESS_ENTITY_INVOICE',
          payload,
        })
      } else {
        await props.api.createRecord(props.workspaceId, { recordType: 'BUSINESS_ENTITY_INVOICE', payload })
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.entityInvoiceRecordsAll(props.workspaceId, props.entityId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.entitySummariesAll(props.workspaceId, props.entityId) })
      if (editing && props.eventDate && props.recordId) {
        queryClient.removeQueries({ queryKey: queryKeys.record(props.workspaceId, 'BUSINESS_ENTITY_INVOICE', props.eventDate, props.recordId) })
      }
      navigate(`${basePath}/invoices`, { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  const inputsDisabled = submitting || entitiesQuery.isFetching || recordQuery.isFetching || (editing && !initializedFromRecord)

  return (
    <Stack spacing={2}>
      <PageHeader
        title={editing ? 'Edit Ukrainian FOP invoice' : 'Add Ukrainian FOP invoice'}
        description="Received date controls tax reporting, exchange-rate date, and invoice-number uniqueness year."
        right={<Button component={RouterLink} to={`${basePath}/invoices`} variant="text">Cancel</Button>}
      />
      {entitiesQuery.error ? <ErrorAlert message={entitiesQuery.error instanceof Error ? entitiesQuery.error.message : String(entitiesQuery.error)} /> : null}
      {recordQuery.error ? <ErrorAlert message={recordQuery.error instanceof Error ? recordQuery.error.message : String(recordQuery.error)} /> : null}
      {error ? <ErrorAlert message={error} /> : null}
      {rateError ? <Alert severity="warning">Could not auto-fill the NBU rate. Enter the exchange rate manually. {rateError}</Alert> : null}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          {inputsDisabled && editing ? <LinearProgress /> : null}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Invoice date" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} InputLabelProps={{ shrink: true }} required fullWidth disabled={inputsDisabled} />
            <TextField label="Received date" type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} InputLabelProps={{ shrink: true }} required fullWidth disabled={inputsDisabled} helperText="Used for Ukrainian FOP tax reporting." />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Invoice number" value={number} onChange={(e) => setNumber(e.target.value)} required fullWidth disabled={inputsDisabled} />
            <TextField label="Client" value={client} onChange={(e) => setClient(e.target.value)} required fullWidth disabled={inputsDisabled} />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Amount" value={amount} onChange={(e) => { setAmount(e.target.value); setSnapshotConfirmed(false) }} required fullWidth disabled={inputsDisabled} InputProps={{ endAdornment: <InputAdornment position="end">{currency}</InputAdornment> }} />
            <FormControl fullWidth>
              <InputLabel id="fop-currency">Currency</InputLabel>
              <Select labelId="fop-currency" label="Currency" value={currency} onChange={(e) => { setCurrency(e.target.value as InvoiceCurrency); setSnapshotConfirmed(false) }} disabled={inputsDisabled}>
                {allowedCurrencies.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
              </Select>
              <FormHelperText>UAH uses rate 1. USD auto-fills through the backend NBU proxy.</FormHelperText>
            </FormControl>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Exchange rate to UAH" value={exchangeRate} onChange={(e) => { setExchangeRate(e.target.value); markManual() }} required fullWidth disabled={inputsDisabled || currency === 'UAH'} />
            <TextField label="Exchange-rate source" value={exchangeRateSource} fullWidth disabled />
          </Stack>
          {exchangeRateFetchedAt && exchangeRateSource === 'NBU' ? (
            <Typography variant="body2" color="text.secondary">NBU rate fetched at {exchangeRateFetchedAt}</Typography>
          ) : null}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1}>
              <Typography variant="subtitle2">Computed UAH tax base</Typography>
              <Typography>{amountTaxCurrency == null ? 'Enter amount and exchange rate.' : uah.format(amountTaxCurrency)}</Typography>
            </Stack>
          </Paper>
          {snapshotDriversChanged && currency === 'USD' ? (
            <Alert severity={snapshotConfirmed ? 'success' : 'info'}>
              {snapshotConfirmed ? 'Exchange-rate snapshot is confirmed.' : 'Changing amount, currency, or received date requires a fresh or manually confirmed snapshot.'}
            </Alert>
          ) : null}
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button component={RouterLink} to={`${basePath}/invoices`} variant="outlined" disabled={submitting}>Back</Button>
            <Button variant="contained" onClick={submit} disabled={inputsDisabled}>{submitting ? 'Saving...' : editing ? 'Save' : 'Create invoice'}</Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  )
}
