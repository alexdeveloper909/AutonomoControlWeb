import { useMemo, useState } from 'react'
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

const asRecord = (v: unknown): Record<string, unknown> | null => {
  if (!v || typeof v !== 'object') return null
  return v as Record<string, unknown>
}

const asNumber = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const asString = (v: unknown): string | null => (typeof v === 'string' ? v : null)
const asBoolean = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null)

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
  raw: unknown
  onClose: () => void
  fields: { label: string; value: string }[]
}) {
  const { t } = useTranslation()
  const [showRaw, setShowRaw] = useState(false)

  return (
    <Dialog open={props.open} onClose={props.onClose} maxWidth="md" fullWidth>
      <DialogTitle>{props.title}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          {props.fields.map((f) => (
            <Grid key={f.label} size={{ xs: 12, sm: 6 }}>
              <TextField label={f.label} value={f.value} size="small" fullWidth InputProps={{ readOnly: true }} />
            </Grid>
          ))}
        </Grid>

        <FormControlLabel
          sx={{ mt: 2 }}
          control={<Switch checked={showRaw} onChange={(e) => setShowRaw(e.target.checked)} />}
          label={t('summaries.showRawJson')}
        />
        {showRaw ? (
          <TextField
            value={JSON.stringify(props.raw, null, 2)}
            multiline
            minRows={10}
            fullWidth
            InputProps={{ readOnly: true }}
          />
        ) : null}
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
  const [tab, setTab] = useState<'month' | 'quarter'>('month')

  const [showRaw, setShowRaw] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<MonthSummary | null>(null)
  const [selectedQuarter, setSelectedQuarter] = useState<QuarterSummary | null>(null)

  const { data, error, isFetching, refetch } = useQuery({
    queryKey: queryKeys.summaries(props.workspaceId),
    queryFn: async () => {
      const settings = await props.api.getWorkspaceSettings(props.workspaceId)
      const [m, q] = await Promise.all([
        props.api.monthSummaries(props.workspaceId, settings),
        props.api.quarterSummaries(props.workspaceId, settings),
      ])
      return { month: m.items, quarter: q.items }
    },
  })

  const monthSummaries = data?.month ?? null
  const quarterSummaries = data?.quarter ?? null

  const monthParsed = useMemo(() => parseList(monthSummaries, asMonthSummary), [monthSummaries])
  const quarterParsed = useMemo(() => parseList(quarterSummaries, asQuarterSummary), [quarterSummaries])

  const refresh = async () => {
    setSelectedMonth(null)
    setSelectedQuarter(null)
    await refetch()
  }

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

      <Paper variant="outlined" sx={{ px: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v as 'month' | 'quarter')} sx={{ flex: 1 }}>
            <Tab label={t('summaries.monthTab')} value="month" />
            <Tab label={t('summaries.quarterTab')} value="quarter" />
          </Tabs>
          <FormControlLabel
            sx={{ pr: 1 }}
            control={<Switch checked={showRaw} onChange={(e) => setShowRaw(e.target.checked)} />}
            label={t('summaries.showRawJson')}
          />
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
              <Table size="small" sx={{ minWidth: 950 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('summaries.table.month')}</TableCell>
                    <TableCell>{t('summaries.status')}</TableCell>
                    <TableCell align="right">{t('summaries.fields.incomeBase')}</TableCell>
                    <TableCell align="right">{t('summaries.fields.expenseDeductibleBase')}</TableCell>
                    <TableCell align="right">{t('summaries.fields.seguridadSocialPaid')}</TableCell>
                    <TableCell align="right">{t('summaries.fields.profitForIrpf')}</TableCell>
                    <TableCell align="right">{t('summaries.fields.recommendedTaxReserve')}</TableCell>
                    <TableCell align="right">{t('summaries.fields.canSpendThisMonth')}</TableCell>
                    <TableCell align="right">{t('summaries.fields.canSpendIgnoringExpenses')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {monthParsed.items.length === 0 && monthSummaries ? (
                    <TableRow>
                      <TableCell colSpan={9}>
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
                      <TableCell align="right">{money.format(m.canSpendThisMonth)}</TableCell>
                      <TableCell align="right">{money.format(m.canSpendIgnoringExpenses)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {showRaw ? (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <TextField
                value={monthSummaries ? JSON.stringify(monthSummaries, null, 2) : ''}
                multiline
                minRows={12}
                fullWidth
                InputProps={{ readOnly: true }}
              />
            </Paper>
          ) : null}
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

          {showRaw ? (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <TextField
                value={quarterSummaries ? JSON.stringify(quarterSummaries, null, 2) : ''}
                multiline
                minRows={12}
                fullWidth
                InputProps={{ readOnly: true }}
              />
            </Paper>
          ) : null}
        </Stack>
      )}

      <SummaryDetailsDialog
        key={selectedMonth ? selectedMonth.monthKey : 'month-none'}
        open={Boolean(selectedMonth)}
        title={selectedMonth ? t('summaries.monthDetails', { monthKey: selectedMonth.monthKey }) : t('summaries.monthDetailsFallback')}
        raw={selectedMonth}
        onClose={() => setSelectedMonth(null)}
        fields={
          selectedMonth
            ? [
                { label: t('summaries.table.month'), value: selectedMonth.monthKey },
                { label: t('summaries.fields.isActiveFromStart'), value: selectedMonth.isActiveFromStart ? t('summaries.yes') : t('summaries.no') },
                { label: t('summaries.fields.incomeBase'), value: money.format(selectedMonth.incomeBase) },
                { label: t('summaries.fields.vatOutput'), value: money.format(selectedMonth.vatOutput) },
                { label: t('summaries.fields.irpfWithheldPlus'), value: money.format(selectedMonth.irpfWithheldPlus) },
                { label: t('summaries.fields.expenseDeductibleBase'), value: money.format(selectedMonth.expenseDeductibleBase) },
                { label: t('summaries.fields.vatRecoverable'), value: money.format(selectedMonth.vatRecoverable) },
                { label: t('summaries.fields.seguridadSocialPaid'), value: money.format(selectedMonth.seguridadSocialPaid) },
                { label: t('summaries.fields.profitForIrpf'), value: money.format(selectedMonth.profitForIrpf) },
                { label: t('summaries.fields.irpfReserve'), value: money.format(selectedMonth.irpfReserve) },
                { label: t('summaries.fields.ivaSettlementEstimate'), value: money.format(selectedMonth.ivaSettlementEstimate) },
                { label: t('summaries.fields.recommendedTaxReserve'), value: money.format(selectedMonth.recommendedTaxReserve) },
                { label: t('summaries.fields.cashIn'), value: money.format(selectedMonth.cashIn) },
                { label: t('summaries.fields.cashOutExpenses'), value: money.format(selectedMonth.cashOutExpenses) },
                { label: t('summaries.fields.cashOutState'), value: money.format(selectedMonth.cashOutState) },
                { label: t('summaries.fields.canSpendThisMonth'), value: money.format(selectedMonth.canSpendThisMonth) },
                { label: t('summaries.fields.canSpendIgnoringExpenses'), value: money.format(selectedMonth.canSpendIgnoringExpenses) },
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
        raw={selectedQuarter}
        onClose={() => setSelectedQuarter(null)}
        fields={
          selectedQuarter
            ? [
                { label: t('summaries.table.quarter'), value: `${selectedQuarter.quarterKey.year}-Q${selectedQuarter.quarterKey.quarter}` },
                { label: t('summaries.fields.start'), value: selectedQuarter.start },
                { label: t('summaries.fields.end'), value: selectedQuarter.end },
                { label: t('summaries.fields.isActiveFromStart'), value: selectedQuarter.isActiveFromStart ? t('summaries.yes') : t('summaries.no') },
                { label: t('summaries.fields.incomeBase'), value: money.format(selectedQuarter.incomeBase) },
                { label: t('summaries.fields.expenseDeductibleBase'), value: money.format(selectedQuarter.expenseDeductibleBase) },
                { label: t('summaries.fields.seguridadSocialPaidInQuarter'), value: money.format(selectedQuarter.seguridadSocialPaidInQuarter) },
                { label: t('summaries.fields.profitForIrpf'), value: money.format(selectedQuarter.profitForIrpf) },
                { label: t('summaries.fields.irpfWithheldPlus'), value: money.format(selectedQuarter.irpfWithheldPlus) },
                { label: t('summaries.fields.vatOutput'), value: money.format(selectedQuarter.vatOutput) },
                { label: t('summaries.fields.vatRecoverable'), value: money.format(selectedQuarter.vatRecoverable) },
                { label: t('summaries.fields.irpfReserve'), value: money.format(selectedQuarter.irpfReserve) },
                { label: t('summaries.fields.ivaSettlementEstimate'), value: money.format(selectedQuarter.ivaSettlementEstimate) },
                { label: t('summaries.fields.recommendedTaxReserve'), value: money.format(selectedQuarter.recommendedTaxReserve) },
              ]
            : []
        }
      />
    </Stack>
  )
}
