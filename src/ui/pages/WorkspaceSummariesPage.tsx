import { useMemo, useState, type ReactNode } from 'react'
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import { ErrorAlert } from '../components/ErrorAlert'
import { PageHeader } from '../components/PageHeader'
import { queryKeys } from '../queries/queryKeys'
import { useTranslation } from 'react-i18next'
import { decimalFormatter } from '../lib/intl'
import { FieldLabel } from '../components/FieldLabel'

type MonthSummary = {
  monthKey: string
  isActiveFromStart: boolean
  incomeBase: number
  vatOutput: number
  irpfWithheldPlus: number
  expenseDeductibleBase: number
  vatRecoverable: number
  seguridadSocialPaid: number
  profitForIrpf: number
  irpfReserve: number
  ivaSettlementEstimate: number
  recommendedTaxReserve: number
  cashIn: number
  cashOutExpenses: number
  cashOutState: number
  canSpendThisMonth: number
  canSpendIgnoringExpenses: number
}

type QuarterSummary = {
  quarterKey: { year: number; quarter: number }
  start: string
  end: string
  isActiveFromStart: boolean
  incomeBase: number
  expenseDeductibleBase: number
  seguridadSocialPaidInQuarter: number
  profitForIrpf: number
  irpfWithheldPlus: number
  vatOutput: number
  vatRecoverable: number
  irpfReserve: number
  ivaSettlementEstimate: number
  recommendedTaxReserve: number
}

type RentaBreakdownItem = {
  from: number
  to: number | null
  rate: number
  tax: number
  scope: 'STATE' | 'AUTONOMIC'
}

type RentaEstimate = {
  taxYear: number
  residence: string
  basis?: 'ACTUALS' | 'PROJECTED_RUN_RATE'
  monthsObserved?: number | null
  projectionWarning?: string | null
  scalesTaxYearUsed: number
  scalesWarning: string | null
  generalBase: number
  taxableBaseForScale: number
  stateQuota: number
  autonomicQuota: number
  estimatedAnnualIrpf: number
  irpfWithheld: number
  modelo130Paid: number
  estimatedSettlement: number
  monthsLeft: number
  suggestedMonthlyReserve: number
  effectiveRate: number
  breakdown: RentaBreakdownItem[]
}

const asRecord = (v: unknown): Record<string, unknown> | null => {
  if (!v || typeof v !== 'object') return null
  return v as Record<string, unknown>
}

const asNumber = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const asString = (v: unknown): string | null => (typeof v === 'string' ? v : null)
const asBoolean = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null)

const asRentaBreakdownItem = (v: unknown): RentaBreakdownItem | null => {
  const o = asRecord(v)
  if (!o) return null
  const from = asNumber(o.from)
  const to = o.to == null ? null : asNumber(o.to)
  const rate = asNumber(o.rate)
  const tax = asNumber(o.tax)
  const scope = o.scope === 'STATE' || o.scope === 'AUTONOMIC' ? (o.scope as 'STATE' | 'AUTONOMIC') : null
  if (from == null || rate == null || tax == null || scope == null) return null
  return { from, to, rate, tax, scope }
}

const asRentaEstimate = (v: unknown): RentaEstimate | null => {
  const o = asRecord(v)
  if (!o) return null

  const taxYear = asNumber(o.taxYear)
  const residence = asString(o.residence)
  const basis = o.basis === 'ACTUALS' || o.basis === 'PROJECTED_RUN_RATE' ? (o.basis as 'ACTUALS' | 'PROJECTED_RUN_RATE') : undefined
  const monthsObserved = asNumber(o.monthsObserved)
  const projectionWarning = o.projectionWarning == null ? null : asString(o.projectionWarning)
  const scalesTaxYearUsed = asNumber(o.scalesTaxYearUsed)
  const scalesWarning = o.scalesWarning == null ? null : asString(o.scalesWarning)

  const generalBase = asNumber(o.generalBase)
  const taxableBaseForScale = asNumber(o.taxableBaseForScale)
  const stateQuota = asNumber(o.stateQuota)
  const autonomicQuota = asNumber(o.autonomicQuota)
  const estimatedAnnualIrpf = asNumber(o.estimatedAnnualIrpf)
  const irpfWithheld = asNumber(o.irpfWithheld)
  const modelo130Paid = asNumber(o.modelo130Paid)
  const estimatedSettlement = asNumber(o.estimatedSettlement)
  const monthsLeft = asNumber(o.monthsLeft)
  const suggestedMonthlyReserve = asNumber(o.suggestedMonthlyReserve)
  const effectiveRate = asNumber(o.effectiveRate)

  const breakdownRaw = Array.isArray(o.breakdown) ? o.breakdown : null
  const breakdown = breakdownRaw ? breakdownRaw.map(asRentaBreakdownItem).filter(Boolean) : []

  if (
    taxYear == null ||
    !residence ||
    scalesTaxYearUsed == null ||
    generalBase == null ||
    taxableBaseForScale == null ||
    stateQuota == null ||
    autonomicQuota == null ||
    estimatedAnnualIrpf == null ||
    irpfWithheld == null ||
    modelo130Paid == null ||
    estimatedSettlement == null ||
    monthsLeft == null ||
    suggestedMonthlyReserve == null ||
    effectiveRate == null
  ) {
    return null
  }

  return {
    taxYear,
    residence,
    basis,
    monthsObserved,
    projectionWarning,
    scalesTaxYearUsed,
    scalesWarning,
    generalBase,
    taxableBaseForScale,
    stateQuota,
    autonomicQuota,
    estimatedAnnualIrpf,
    irpfWithheld,
    modelo130Paid,
    estimatedSettlement,
    monthsLeft,
    suggestedMonthlyReserve,
    effectiveRate,
    breakdown: breakdown as RentaBreakdownItem[],
  }
}

const asMonthSummary = (v: unknown): MonthSummary | null => {
  const o = asRecord(v)
  if (!o) return null

  const monthKey = asString(o.monthKey)
  const isActiveFromStart = asBoolean(o.isActiveFromStart)
  const incomeBase = asNumber(o.incomeBase)
  const vatOutput = asNumber(o.vatOutput)
  const irpfWithheldPlus = asNumber(o.irpfWithheldPlus)
  const expenseDeductibleBase = asNumber(o.expenseDeductibleBase)
  const vatRecoverable = asNumber(o.vatRecoverable)
  const seguridadSocialPaid = asNumber(o.seguridadSocialPaid)
  const profitForIrpf = asNumber(o.profitForIrpf)
  const irpfReserve = asNumber(o.irpfReserve)
  const ivaSettlementEstimate = asNumber(o.ivaSettlementEstimate)
  const recommendedTaxReserve = asNumber(o.recommendedTaxReserve)
  const cashIn = asNumber(o.cashIn)
  const cashOutExpenses = asNumber(o.cashOutExpenses)
  const cashOutState = asNumber(o.cashOutState)
  const canSpendThisMonth = asNumber(o.canSpendThisMonth)
  const canSpendIgnoringExpenses = asNumber(o.canSpendIgnoringExpenses)

  if (
    !monthKey ||
    isActiveFromStart == null ||
    incomeBase == null ||
    vatOutput == null ||
    irpfWithheldPlus == null ||
    expenseDeductibleBase == null ||
    vatRecoverable == null ||
    seguridadSocialPaid == null ||
    profitForIrpf == null ||
    irpfReserve == null ||
    ivaSettlementEstimate == null ||
    recommendedTaxReserve == null ||
    cashIn == null ||
    cashOutExpenses == null ||
    cashOutState == null ||
    canSpendThisMonth == null ||
    canSpendIgnoringExpenses == null
  ) {
    return null
  }

  return {
    monthKey,
    isActiveFromStart,
    incomeBase,
    vatOutput,
    irpfWithheldPlus,
    expenseDeductibleBase,
    vatRecoverable,
    seguridadSocialPaid,
    profitForIrpf,
    irpfReserve,
    ivaSettlementEstimate,
    recommendedTaxReserve,
    cashIn,
    cashOutExpenses,
    cashOutState,
    canSpendThisMonth,
    canSpendIgnoringExpenses,
  }
}

const asQuarterSummary = (v: unknown): QuarterSummary | null => {
  const o = asRecord(v)
  if (!o) return null

  const quarterKeyRecord = asRecord(o.quarterKey)
  const year = quarterKeyRecord ? asNumber(quarterKeyRecord.year) : null
  const quarter = quarterKeyRecord ? asNumber(quarterKeyRecord.quarter) : null
  const start = asString(o.start)
  const end = asString(o.end)
  const isActiveFromStart = asBoolean(o.isActiveFromStart)
  const incomeBase = asNumber(o.incomeBase)
  const expenseDeductibleBase = asNumber(o.expenseDeductibleBase)
  const seguridadSocialPaidInQuarter = asNumber(o.seguridadSocialPaidInQuarter)
  const profitForIrpf = asNumber(o.profitForIrpf)
  const irpfWithheldPlus = asNumber(o.irpfWithheldPlus)
  const vatOutput = asNumber(o.vatOutput)
  const vatRecoverable = asNumber(o.vatRecoverable)
  const irpfReserve = asNumber(o.irpfReserve)
  const ivaSettlementEstimate = asNumber(o.ivaSettlementEstimate)
  const recommendedTaxReserve = asNumber(o.recommendedTaxReserve)

  if (
    year == null ||
    quarter == null ||
    !start ||
    !end ||
    isActiveFromStart == null ||
    incomeBase == null ||
    expenseDeductibleBase == null ||
    seguridadSocialPaidInQuarter == null ||
    profitForIrpf == null ||
    irpfWithheldPlus == null ||
    vatOutput == null ||
    vatRecoverable == null ||
    irpfReserve == null ||
    ivaSettlementEstimate == null ||
    recommendedTaxReserve == null
  ) {
    return null
  }

  return {
    quarterKey: { year, quarter },
    start,
    end,
    isActiveFromStart,
    incomeBase,
    expenseDeductibleBase,
    seguridadSocialPaidInQuarter,
    profitForIrpf,
    irpfWithheldPlus,
    vatOutput,
    vatRecoverable,
    irpfReserve,
    ivaSettlementEstimate,
    recommendedTaxReserve,
  }
}

const parseList = <T,>(list: unknown[] | null, parser: (v: unknown) => T | null): { items: T[]; invalidCount: number } => {
  if (!list) return { items: [], invalidCount: 0 }
  const items: T[] = []
  let invalidCount = 0
  for (const v of list) {
    const parsed = parser(v)
    if (parsed) items.push(parsed)
    else invalidCount += 1
  }
  return { items, invalidCount }
}

function SummaryDetailsDialog(props: {
  open: boolean
  title: string
  onClose: () => void
  fields: { key: string; label: ReactNode; value: string; helperText?: string }[]
}) {
  const { t } = useTranslation()

  return (
    <Dialog open={props.open} onClose={props.onClose} maxWidth="md" fullWidth>
      <DialogTitle>{props.title}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          {props.fields.map((f) => (
            <Grid key={f.key} size={{ xs: 12, sm: 6 }}>
              <TextField
                label={f.label}
                value={f.value}
                helperText={f.helperText}
                size="small"
                fullWidth
                InputProps={{ readOnly: true }}
              />
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  )
}

export function WorkspaceSummariesPage(props: { workspaceId: string; api: AutonomoControlApi }) {
  const { t, i18n } = useTranslation()
  const money = useMemo(() => decimalFormatter(i18n.language), [i18n.language])
  const pct = useMemo(() => new Intl.NumberFormat(i18n.language, { style: 'percent', maximumFractionDigits: 2 }), [i18n.language])
  const [tab, setTab] = useState<'month' | 'quarter'>('month')

  const [selectedMonth, setSelectedMonth] = useState<MonthSummary | null>(null)
  const [selectedQuarter, setSelectedQuarter] = useState<QuarterSummary | null>(null)
  const [rentaDetailsOpen, setRentaDetailsOpen] = useState(false)
  const [useRentaProjection, setUseRentaProjection] = useState(true)

  const { data, error, isFetching, refetch } = useQuery({
    queryKey: queryKeys.summaries(props.workspaceId),
    queryFn: async () => {
      const settings = await props.api.getWorkspaceSettings(props.workspaceId)
      const [m, q, r] = await Promise.all([
        props.api.monthSummaries(props.workspaceId, settings),
        props.api.quarterSummaries(props.workspaceId, settings),
        props.api.rentaSummary(props.workspaceId, settings),
      ])
      return { settings, month: m.items, quarter: q.items, renta: r.renta, rentaProjected: r.rentaProjected ?? null }
    },
  })

  const settings = data?.settings ?? null
  const monthSummaries = data?.month ?? null
  const quarterSummaries = data?.quarter ?? null
  const rentaRaw = data?.renta ?? null
  const rentaProjectedRaw = (data as { rentaProjected?: unknown | null } | null)?.rentaProjected ?? null

  const monthParsed = useMemo(() => parseList(monthSummaries, asMonthSummary), [monthSummaries])
  const quarterParsed = useMemo(() => parseList(quarterSummaries, asQuarterSummary), [quarterSummaries])
  const rentaParsed = useMemo(() => (rentaRaw ? asRentaEstimate(rentaRaw) : null), [rentaRaw])
  const rentaProjectedParsed = useMemo(() => (rentaProjectedRaw ? asRentaEstimate(rentaProjectedRaw) : null), [rentaProjectedRaw])
  const showRentaSaveColumn = settings?.rentaPlanning?.enabled === true
  const rentaSelected = useMemo(() => {
    if (!useRentaProjection) return rentaParsed
    return rentaProjectedParsed ?? rentaParsed
  }, [rentaParsed, rentaProjectedParsed, useRentaProjection])

  const helper = (key: string): string | undefined => {
    const v = t(key, { defaultValue: '' }).trim()
    return v ? v : undefined
  }

  const refresh = async () => {
    setSelectedMonth(null)
    setSelectedQuarter(null)
    await refetch()
  }

  const summaryLabel = (key: string): ReactNode => (
    <FieldLabel label={t(`summaries.fields.${key}`)} tooltip={t(`summaries.tooltips.${key}`, { defaultValue: '' })} />
  )

  return (
    <Stack spacing={2}>
      <PageHeader
        title={t('summaries.title')}
        description={t('summaries.description')}
        right={
          <Button variant="outlined" onClick={refresh}>
            {t('common.refresh')}
          </Button>
        }
      />

      {error ? <ErrorAlert message={error instanceof Error ? error.message : String(error)} /> : null}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1}>
          <Typography variant="subtitle2">{t('summaries.renta.title')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('summaries.renta.disclaimer')}
          </Typography>

          {settings?.rentaPlanning?.enabled !== true ? (
            <Alert severity="info">{t('summaries.renta.disabledHint')}</Alert>
          ) : rentaRaw && !rentaParsed ? (
            <Alert severity="warning">{t('summaries.renta.invalidEstimate')}</Alert>
          ) : settings?.rentaPlanning?.enabled === true && !rentaParsed ? (
            <Alert severity="warning">{t('summaries.renta.unavailable')}</Alert>
          ) : rentaParsed ? (
            <>
              {rentaProjectedParsed ? (
                <FormControlLabel
                  control={<Switch checked={useRentaProjection} onChange={(e) => setUseRentaProjection(e.target.checked)} />}
                  label={
                    <FieldLabel
                      label={t('summaries.renta.useProjection')}
                      tooltip={t('summaries.renta.tooltips.useProjection', { defaultValue: '' })}
                    />
                  }
                />
              ) : null}

              {useRentaProjection && rentaProjectedParsed?.monthsObserved != null ? (
                <Typography variant="body2" color="text.secondary">
                  {t('summaries.renta.projectedBasedOnMonths', { count: rentaProjectedParsed.monthsObserved })}
                </Typography>
              ) : null}

              {useRentaProjection && rentaProjectedParsed?.monthsObserved != null && rentaProjectedParsed.monthsObserved <= 2 ? (
                <Alert severity="warning">{t('summaries.renta.lowConfidence', { count: rentaProjectedParsed.monthsObserved })}</Alert>
              ) : null}

              {rentaSelected?.scalesWarning ? <Alert severity="warning">{rentaSelected.scalesWarning}</Alert> : null}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label={
                    <FieldLabel
                      label={t('summaries.renta.estimatedAnnualIrpf')}
                      tooltip={t('summaries.renta.tooltips.estimatedAnnualIrpf', { defaultValue: '' })}
                    />
                  }
                  value={rentaSelected ? money.format(rentaSelected.estimatedAnnualIrpf) : '—'}
                  size="small"
                  fullWidth
                  InputProps={{ readOnly: true }}
                />
                <TextField
                  label={
                    <FieldLabel
                      label={t('summaries.renta.alreadyCovered')}
                      tooltip={t('summaries.renta.tooltips.alreadyCovered', { defaultValue: '' })}
                    />
                  }
                  value={rentaSelected ? money.format(rentaSelected.irpfWithheld + rentaSelected.modelo130Paid) : '—'}
                  helperText={helper('summaries.renta.help.alreadyCovered')}
                  size="small"
                  fullWidth
                  InputProps={{ readOnly: true }}
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label={
                    <FieldLabel
                      label={t('summaries.renta.settlement')}
                      tooltip={t('summaries.renta.tooltips.settlement', { defaultValue: '' })}
                    />
                  }
                  value={rentaSelected ? money.format(rentaSelected.estimatedSettlement) : '—'}
                  helperText={helper('summaries.renta.help.settlement')}
                  size="small"
                  fullWidth
                  InputProps={{ readOnly: true }}
                />
                <TextField
                  label={
                    <FieldLabel
                      label={t('summaries.renta.monthly')}
                      tooltip={t('summaries.renta.tooltips.monthly', { defaultValue: '' })}
                    />
                  }
                  value={
                    rentaSelected
                      ? `${money.format(rentaSelected.suggestedMonthlyReserve)} (${t('summaries.renta.monthsLeft', { count: rentaSelected.monthsLeft })})`
                      : '—'
                  }
                  helperText={helper('summaries.renta.help.monthly')}
                  size="small"
                  fullWidth
                  InputProps={{ readOnly: true }}
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label={
                    <FieldLabel
                      label={t('summaries.renta.stateQuota')}
                      tooltip={t('summaries.renta.tooltips.stateQuota', { defaultValue: '' })}
                    />
                  }
                  value={rentaSelected ? money.format(rentaSelected.stateQuota) : '—'}
                  size="small"
                  fullWidth
                  InputProps={{ readOnly: true }}
                />
                <TextField
                  label={
                    <FieldLabel
                      label={t('summaries.renta.autonomicQuota')}
                      tooltip={t('summaries.renta.tooltips.autonomicQuota', { defaultValue: '' })}
                    />
                  }
                  value={rentaSelected ? money.format(rentaSelected.autonomicQuota) : '—'}
                  size="small"
                  fullWidth
                  InputProps={{ readOnly: true }}
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                  <FieldLabel
                    label={t('summaries.renta.effectiveRate')}
                    tooltip={t('summaries.renta.tooltips.effectiveRate', { defaultValue: '' })}
                  />
                  : {rentaSelected ? pct.format(rentaSelected.effectiveRate) : '—'}
                </Typography>
                <Button size="small" onClick={() => setRentaDetailsOpen(true)}>
                  <FieldLabel
                    label={t('summaries.renta.breakdown')}
                    tooltip={t('summaries.renta.tooltips.breakdown', { defaultValue: '' })}
                  />
                </Button>
              </Stack>
            </>
          ) : null}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ px: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v as 'month' | 'quarter')} sx={{ flex: 1 }}>
            <Tab label={t('summaries.monthTab')} value="month" />
            <Tab label={t('summaries.quarterTab')} value="quarter" />
          </Tabs>
        </Stack>
      </Paper>

      {isFetching ? <LinearProgress /> : null}

      {tab === 'month' ? (
        <Stack spacing={2}>
          {monthParsed.invalidCount > 0 ? (
            <Alert severity="warning">{t('summaries.invalidItems', { count: monthParsed.invalidCount })}</Alert>
          ) : null}

          <Paper variant="outlined">
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: showRentaSaveColumn ? 1100 : 950 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('summaries.table.month')}</TableCell>
                    <TableCell>{t('summaries.status')}</TableCell>
                    <TableCell align="right">{t('summaries.fields.incomeBase')}</TableCell>
                    <TableCell align="right">{t('summaries.fields.expenseDeductibleBase')}</TableCell>
                    <TableCell align="right">{t('summaries.fields.seguridadSocialPaid')}</TableCell>
                    <TableCell align="right">{t('summaries.fields.profitForIrpf')}</TableCell>
                    <TableCell align="right">{t('summaries.fields.recommendedTaxReserve')}</TableCell>
                    <TableCell align="right">{t('summaries.fields.canSpendIgnoringExpenses')}</TableCell>
                    <TableCell align="right">{t('summaries.fields.canSpendThisMonth')}</TableCell>
                    {showRentaSaveColumn ? (
                      <TableCell align="right">
                        <FieldLabel
                          label={t('summaries.fields.canSpendWithRentaSave')}
                          tooltip={t('summaries.tooltips.canSpendWithRentaSave', { defaultValue: '' })}
                        />
                      </TableCell>
                    ) : null}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {monthParsed.items.length === 0 && monthSummaries ? (
                    <TableRow>
                      <TableCell colSpan={showRentaSaveColumn ? 10 : 9}>
                        <Typography variant="body2" color="text.secondary">
                          {t('summaries.emptyMonth')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : null}

                  {monthParsed.items.map((m) => (
                    <TableRow
                      key={m.monthKey}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setSelectedMonth(m)}
                    >
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{m.monthKey}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={m.isActiveFromStart ? t('summaries.statusActive') : t('summaries.statusInactive')}
                          color={m.isActiveFromStart ? 'success' : 'default'}
                          variant={m.isActiveFromStart ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell align="right">{money.format(m.incomeBase)}</TableCell>
                      <TableCell align="right">{money.format(m.expenseDeductibleBase)}</TableCell>
                      <TableCell align="right">{money.format(m.seguridadSocialPaid)}</TableCell>
                      <TableCell align="right">{money.format(m.profitForIrpf)}</TableCell>
                      <TableCell align="right">{money.format(m.recommendedTaxReserve)}</TableCell>
                      <TableCell align="right">{money.format(m.canSpendIgnoringExpenses)}</TableCell>
                      <TableCell align="right">{money.format(m.canSpendThisMonth)}</TableCell>
                      {showRentaSaveColumn ? (
                        <TableCell align="right">
                          {(() => {
                            if (!rentaSelected) return '-'
                            const monthYear = Number(m.monthKey.slice(0, 4))
                            if (!Number.isFinite(monthYear) || monthYear !== rentaSelected.taxYear) return '-'
                            if (rentaSelected.monthsLeft <= 0) return '-'
                            if (rentaSelected.estimatedSettlement <= 0) return '-'
                            return money.format(m.canSpendIgnoringExpenses - rentaSelected.suggestedMonthlyReserve)
                          })()}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Stack>
      ) : (
        <Stack spacing={2}>
          {quarterParsed.invalidCount > 0 ? (
            <Alert severity="warning">{t('summaries.invalidItems', { count: quarterParsed.invalidCount })}</Alert>
          ) : null}

          <Paper variant="outlined">
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('summaries.table.quarter')}</TableCell>
                    <TableCell>{t('summaries.period')}</TableCell>
                    <TableCell>{t('summaries.status')}</TableCell>
                    <TableCell align="right">{t('summaries.fields.incomeBase')}</TableCell>
                    <TableCell align="right">{t('summaries.fields.expenseDeductibleBase')}</TableCell>
                    <TableCell align="right">{t('summaries.fields.seguridadSocialPaidInQuarter')}</TableCell>
                    <TableCell align="right">{t('summaries.fields.profitForIrpf')}</TableCell>
                    <TableCell align="right">{t('summaries.fields.recommendedTaxReserve')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {quarterParsed.items.length === 0 && quarterSummaries ? (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <Typography variant="body2" color="text.secondary">
                          {t('summaries.emptyQuarter')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : null}

                  {quarterParsed.items.map((q) => (
                    <TableRow
                      key={`${q.quarterKey.year}-Q${q.quarterKey.quarter}`}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setSelectedQuarter(q)}
                    >
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {q.quarterKey.year}-Q{q.quarterKey.quarter}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {q.start} → {q.end}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={q.isActiveFromStart ? t('summaries.statusActive') : t('summaries.statusInactive')}
                          color={q.isActiveFromStart ? 'success' : 'default'}
                          variant={q.isActiveFromStart ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell align="right">{money.format(q.incomeBase)}</TableCell>
                      <TableCell align="right">{money.format(q.expenseDeductibleBase)}</TableCell>
                      <TableCell align="right">{money.format(q.seguridadSocialPaidInQuarter)}</TableCell>
                      <TableCell align="right">{money.format(q.profitForIrpf)}</TableCell>
                      <TableCell align="right">{money.format(q.recommendedTaxReserve)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Stack>
      )}

      <SummaryDetailsDialog
        key={selectedMonth ? selectedMonth.monthKey : 'month-none'}
        open={Boolean(selectedMonth)}
        title={selectedMonth ? t('summaries.monthDetails', { monthKey: selectedMonth.monthKey }) : t('summaries.monthDetailsFallback')}
        onClose={() => setSelectedMonth(null)}
        fields={
          selectedMonth
            ? [
                { key: 'monthKey', label: t('summaries.table.month'), value: selectedMonth.monthKey },
                {
                  key: 'isActiveFromStart',
                  label: summaryLabel('isActiveFromStart'),
                  value: selectedMonth.isActiveFromStart ? t('summaries.yes') : t('summaries.no'),
                },
                { key: 'incomeBase', label: summaryLabel('incomeBase'), value: money.format(selectedMonth.incomeBase) },
                { key: 'vatOutput', label: summaryLabel('vatOutput'), value: money.format(selectedMonth.vatOutput) },
                { key: 'irpfWithheldPlus', label: summaryLabel('irpfWithheldPlus'), value: money.format(selectedMonth.irpfWithheldPlus) },
                { key: 'expenseDeductibleBase', label: summaryLabel('expenseDeductibleBase'), value: money.format(selectedMonth.expenseDeductibleBase) },
                { key: 'vatRecoverable', label: summaryLabel('vatRecoverable'), value: money.format(selectedMonth.vatRecoverable) },
                { key: 'seguridadSocialPaid', label: summaryLabel('seguridadSocialPaid'), value: money.format(selectedMonth.seguridadSocialPaid) },
                { key: 'profitForIrpf', label: summaryLabel('profitForIrpf'), value: money.format(selectedMonth.profitForIrpf) },
                { key: 'irpfReserve', label: summaryLabel('irpfReserve'), value: money.format(selectedMonth.irpfReserve) },
                { key: 'ivaSettlementEstimate', label: summaryLabel('ivaSettlementEstimate'), value: money.format(selectedMonth.ivaSettlementEstimate) },
                { key: 'recommendedTaxReserve', label: summaryLabel('recommendedTaxReserve'), value: money.format(selectedMonth.recommendedTaxReserve) },
                { key: 'cashIn', label: summaryLabel('cashIn'), value: money.format(selectedMonth.cashIn) },
                { key: 'cashOutExpenses', label: summaryLabel('cashOutExpenses'), value: money.format(selectedMonth.cashOutExpenses) },
                { key: 'cashOutState', label: summaryLabel('cashOutState'), value: money.format(selectedMonth.cashOutState) },
                { key: 'canSpendThisMonth', label: summaryLabel('canSpendThisMonth'), value: money.format(selectedMonth.canSpendThisMonth) },
                { key: 'canSpendIgnoringExpenses', label: summaryLabel('canSpendIgnoringExpenses'), value: money.format(selectedMonth.canSpendIgnoringExpenses) },
              ]
            : []
        }
      />

      <SummaryDetailsDialog
        key={selectedQuarter ? `${selectedQuarter.quarterKey.year}-Q${selectedQuarter.quarterKey.quarter}` : 'quarter-none'}
        open={Boolean(selectedQuarter)}
        title={
          selectedQuarter
            ? t('summaries.quarterDetails', { quarterKey: `${selectedQuarter.quarterKey.year}-Q${selectedQuarter.quarterKey.quarter}` })
            : t('summaries.quarterDetailsFallback')
        }
        onClose={() => setSelectedQuarter(null)}
        fields={
          selectedQuarter
            ? [
                { key: 'quarterKey', label: t('summaries.table.quarter'), value: `${selectedQuarter.quarterKey.year}-Q${selectedQuarter.quarterKey.quarter}` },
                { key: 'start', label: t('summaries.fields.start'), value: selectedQuarter.start },
                { key: 'end', label: t('summaries.fields.end'), value: selectedQuarter.end },
                { key: 'isActiveFromStart', label: summaryLabel('isActiveFromStart'), value: selectedQuarter.isActiveFromStart ? t('summaries.yes') : t('summaries.no') },
                { key: 'incomeBase', label: summaryLabel('incomeBase'), value: money.format(selectedQuarter.incomeBase) },
                { key: 'expenseDeductibleBase', label: summaryLabel('expenseDeductibleBase'), value: money.format(selectedQuarter.expenseDeductibleBase) },
                { key: 'seguridadSocialPaidInQuarter', label: summaryLabel('seguridadSocialPaidInQuarter'), value: money.format(selectedQuarter.seguridadSocialPaidInQuarter) },
                { key: 'profitForIrpf', label: summaryLabel('profitForIrpf'), value: money.format(selectedQuarter.profitForIrpf) },
                { key: 'irpfWithheldPlus', label: summaryLabel('irpfWithheldPlus'), value: money.format(selectedQuarter.irpfWithheldPlus) },
                { key: 'vatOutput', label: summaryLabel('vatOutput'), value: money.format(selectedQuarter.vatOutput) },
                { key: 'vatRecoverable', label: summaryLabel('vatRecoverable'), value: money.format(selectedQuarter.vatRecoverable) },
                { key: 'irpfReserve', label: summaryLabel('irpfReserve'), value: money.format(selectedQuarter.irpfReserve) },
                { key: 'ivaSettlementEstimate', label: summaryLabel('ivaSettlementEstimate'), value: money.format(selectedQuarter.ivaSettlementEstimate) },
                { key: 'recommendedTaxReserve', label: summaryLabel('recommendedTaxReserve'), value: money.format(selectedQuarter.recommendedTaxReserve) },
              ]
            : []
        }
      />

      <Dialog open={rentaDetailsOpen} onClose={() => setRentaDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{t('summaries.renta.breakdownTitle')}</DialogTitle>
        <DialogContent dividers>
          {rentaSelected ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('summaries.renta.scope')}</TableCell>
                  <TableCell align="right">{t('summaries.renta.from')}</TableCell>
                  <TableCell align="right">{t('summaries.renta.to')}</TableCell>
                  <TableCell align="right">{t('summaries.renta.rate')}</TableCell>
                  <TableCell align="right">{t('summaries.renta.tax')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rentaSelected.breakdown.map((b, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{b.scope === 'STATE' ? t('summaries.renta.scopeState') : t('summaries.renta.scopeAutonomic')}</TableCell>
                    <TableCell align="right">{money.format(b.from)}</TableCell>
                    <TableCell align="right">{b.to == null ? '∞' : money.format(b.to)}</TableCell>
                    <TableCell align="right">{pct.format(b.rate)}</TableCell>
                    <TableCell align="right">{money.format(b.tax)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {t('summaries.renta.unavailable')}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRentaDetailsOpen(false)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
