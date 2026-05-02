import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import type { BudgetEntryPayload, RecordResponse } from '../../domain/records'
import { asBudgetEntryPayload } from '../../domain/records'
import { PageHeader } from '../components/PageHeader'
import { ErrorAlert } from '../components/ErrorAlert'
import { queryKeys } from '../queries/queryKeys'
import { useTranslation } from 'react-i18next'
import { decimalFormatter } from '../lib/intl'
import { MoreActionsMenu } from '../components/MoreActionsMenu'
import { ConfirmDialog } from '../components/ConfirmDialog'

const PAGE_SIZE = 100

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1)

const currentYear = (): string => {
  const d = new Date()
  return String(d.getFullYear())
}

const monthKeyFor = (year: string, month: number): string => `${year}-${String(month).padStart(2, '0')}`

const parseTarget = (payload: BudgetEntryPayload): number | null => {
  if (typeof payload.targetSpend === 'number') return payload.targetSpend
  if (!payload.budgetGoal) return null
  const normalized = payload.budgetGoal.trim().replace(/€|\s/g, '').replace(',', '.')
  if (!normalized) return null
  const value = Number(normalized)
  return Number.isFinite(value) && value >= 0 ? value : null
}

const average = (values: number[]): number | null => {
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

const formatSigned = (money: Intl.NumberFormat, value: number | null): string => {
  if (value === null) return 'N/A'
  if (value === 0) return money.format(0)
  return `${value > 0 ? '+' : '-'}${money.format(Math.abs(value))}`
}

type BudgetRecord = {
  record: RecordResponse
  payload: BudgetEntryPayload
  targetSpend: number | null
  baselineSpend: number
  saved: number
  savingsRate: number | null
  overUnderTarget: number | null
}

type MonthRow = {
  month: number
  monthKey: string
  budget: BudgetRecord | null
  duplicates: BudgetRecord[]
}

const fetchAllBudgetRecords = async (api: AutonomoControlApi, workspaceId: string, year: string): Promise<RecordResponse[]> => {
  const items: RecordResponse[] = []
  let nextToken: string | null = null
  do {
    const page = await api.listRecordsByYearPaged(workspaceId, year, {
      recordType: 'BUDGET',
      sort: 'eventDateDesc',
      limit: PAGE_SIZE,
      nextToken,
    })
    items.push(...page.items)
    nextToken = page.nextToken ?? null
  } while (nextToken)
  return items
}

function BudgetTrendChart(props: {
  rows: MonthRow[]
  money: Intl.NumberFormat
  labels: { title: string; spent: string; baseline: string; target: string; aria: string }
}) {
  const theme = useTheme()
  const chartRows = props.rows.map((row) => row.budget)
  const hasTarget = chartRows.some((row) => row?.targetSpend != null)
  const hasBaseline = chartRows.some((row) => row && row.baselineSpend !== row.payload.spent)
  const values = chartRows.flatMap((row) => {
    if (!row) return []
    return [row.payload.spent, row.targetSpend, hasBaseline ? row.baselineSpend : null].filter((value): value is number => value != null)
  })
  const max = Math.max(...values, 1)
  const width = 720
  const height = 220
  const padding = { top: 18, right: 16, bottom: 34, left: 54 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom
  const step = plotWidth / 12
  const barWidth = Math.max(14, step * 0.5)
  const y = (value: number): number => padding.top + plotHeight - (value / max) * plotHeight
  const x = (index: number): number => padding.left + index * step + step / 2
  const points = (valueFor: (row: BudgetRecord) => number | null): string =>
    chartRows
      .map((row, index) => (row ? [x(index), valueFor(row)] : null))
      .filter((point): point is [number, number] => Boolean(point && point[1] != null))
      .map(([px, value]) => `${px},${y(value)}`)
      .join(' ')

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography variant="subtitle1">{props.labels.title}</Typography>
          <Chip size="small" label={props.labels.spent} sx={{ bgcolor: theme.palette.primary.main, color: theme.palette.primary.contrastText }} />
          {hasBaseline ? <Chip size="small" label={props.labels.baseline} variant="outlined" /> : null}
          {hasTarget ? <Chip size="small" label={props.labels.target} color="success" variant="outlined" /> : null}
        </Stack>
        <Box sx={{ overflowX: 'auto' }}>
          <Box
            component="svg"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={props.labels.aria}
            sx={{ display: 'block', width: '100%', minWidth: 560, height: 'auto' }}
          >
            <line x1={padding.left} y1={padding.top + plotHeight} x2={width - padding.right} y2={padding.top + plotHeight} stroke={theme.palette.divider} />
            <text x={8} y={y(max)} fontSize="11" fill={theme.palette.text.secondary}>
              {props.money.format(max)}
            </text>
            <text x={8} y={padding.top + plotHeight} fontSize="11" fill={theme.palette.text.secondary}>
              {props.money.format(0)}
            </text>
            {chartRows.map((row, index) => {
              const center = x(index)
              return (
                <g key={props.rows[index].monthKey}>
                  {row ? (
                    <rect
                      x={center - barWidth / 2}
                      y={y(row.payload.spent)}
                      width={barWidth}
                      height={padding.top + plotHeight - y(row.payload.spent)}
                      rx={3}
                      fill={theme.palette.primary.main}
                    >
                      <title>{`${props.rows[index].monthKey}: ${props.money.format(row.payload.spent)}`}</title>
                    </rect>
                  ) : null}
                  <text x={center} y={height - 10} fontSize="11" textAnchor="middle" fill={theme.palette.text.secondary}>
                    {String(index + 1).padStart(2, '0')}
                  </text>
                </g>
              )
            })}
            {hasBaseline ? (
              <polyline fill="none" stroke={theme.palette.text.primary} strokeWidth="2" strokeDasharray="4 4" points={points((row) => row.baselineSpend)} />
            ) : null}
            {hasTarget ? (
              <polyline fill="none" stroke={theme.palette.success.main} strokeWidth="2" points={points((row) => row.targetSpend)} />
            ) : null}
          </Box>
        </Box>
      </Stack>
    </Paper>
  )
}

export function WorkspaceBudgetEntriesPage(props: { workspaceId: string; api: AutonomoControlApi; readOnly: boolean }) {
  const { t, i18n } = useTranslation()
  const money = useMemo(() => decimalFormatter(i18n.language), [i18n.language])
  const percent = useMemo(() => decimalFormatter(i18n.language, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }), [i18n.language])
  const navigate = useNavigate()
  const [year, setYear] = useState(currentYear())
  const queryClient = useQueryClient()
  const queryKey = queryKeys.recordsByYear(props.workspaceId, 'BUDGET', year)
  const [deleteTarget, setDeleteTarget] = useState<{ record: RecordResponse; label: string } | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { data, error, isPending, isFetching } = useQuery({
    queryKey,
    queryFn: () => fetchAllBudgetRecords(props.api, props.workspaceId, year),
  })

  const refresh = () => {
    queryClient.removeQueries({ queryKey })
  }

  const yearOptions = useMemo(() => {
    const current = Number(currentYear())
    const years: string[] = []
    for (let y = current + 1; y >= current - 10; y -= 1) years.push(String(y))
    return years
  }, [])

  const rows = useMemo<MonthRow[]>(() => {
    const byMonth = new Map<string, BudgetRecord[]>()
    for (const record of data ?? []) {
      if (record.recordType !== 'BUDGET') continue
      const payload = asBudgetEntryPayload(record.payload)
      if (!payload || !payload.monthKey.startsWith(`${year}-`)) continue
      const exceptionalSpend = Math.max(payload.exceptionalSpend ?? 0, 0)
      const targetSpend = parseTarget(payload)
      const baselineSpend = Math.max(payload.spent - exceptionalSpend, 0)
      const saved = payload.earned - payload.spent
      const budget: BudgetRecord = {
        record,
        payload,
        targetSpend,
        baselineSpend,
        saved,
        savingsRate: payload.earned > 0 ? saved / payload.earned : null,
        overUnderTarget: targetSpend === null ? null : payload.spent - targetSpend,
      }
      byMonth.set(payload.monthKey, [...(byMonth.get(payload.monthKey) ?? []), budget])
    }

    return MONTHS.map((month) => {
      const monthKey = monthKeyFor(year, month)
      const budgets = [...(byMonth.get(monthKey) ?? [])].sort((a, b) => b.record.updatedAt.localeCompare(a.record.updatedAt))
      return {
        month,
        monthKey,
        budget: budgets[0] ?? null,
        duplicates: budgets.slice(1),
      }
    })
  }, [data, year])

  const filledRows = rows.map((row) => row.budget).filter((row): row is BudgetRecord => Boolean(row))
  const hasExceptionalSpend = filledRows.some((row) => (row.payload.exceptionalSpend ?? 0) > 0)
  const summary = {
    averageSpent: average(filledRows.map((row) => row.payload.spent)),
    averageBaseline: hasExceptionalSpend ? average(filledRows.map((row) => row.baselineSpend)) : null,
    averageEarned: average(filledRows.map((row) => row.payload.earned)),
    averageSaved: average(filledRows.map((row) => row.saved)),
    monthsOverTarget: filledRows.filter((row) => row.overUnderTarget != null && row.overUnderTarget > 0).length,
    bestSavingsMonth: filledRows.length ? filledRows.reduce((best, row) => (row.saved > best.saved ? row : best), filledRows[0]) : null,
    worstOverspendMonth: filledRows
      .filter((row) => row.overUnderTarget != null && row.overUnderTarget > 0)
      .reduce<BudgetRecord | null>((worst, row) => (!worst || row.overUnderTarget! > worst.overUnderTarget! ? row : worst), null),
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    setDeleteSubmitting(true)
    try {
      await props.api.deleteRecord(props.workspaceId, 'BUDGET', deleteTarget.record.eventDate, deleteTarget.record.recordId)
      queryClient.invalidateQueries({ queryKey: queryKeys.recordsByYearRecordType(props.workspaceId, 'BUDGET') })
      setDeleteTarget(null)
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : String(e))
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const addPath = (monthKey?: string): string => {
    const base = `/workspaces/${props.workspaceId}/budget/new`
    return monthKey ? `${base}?monthKey=${encodeURIComponent(monthKey)}` : base
  }

  return (
    <Stack spacing={2}>
      <PageHeader
        title={t('budget.title')}
        description={t('budget.description')}
        right={
          props.readOnly ? null : (
            <Button variant="contained" component={RouterLink} to={addPath()}>
              {t('budget.add')}
            </Button>
          )
        }
      />

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <FormControl sx={{ minWidth: 160 }}>
            <InputLabel id="budget-year-label">{t('common.year')}</InputLabel>
            <Select
              labelId="budget-year-label"
              label={t('common.year')}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              size="small"
            >
              {yearOptions.map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end" sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('budget.monthsReviewed', { count: filledRows.length })}
            </Typography>
            <Button variant="text" onClick={refresh} disabled={isFetching}>
              {t('common.refresh')}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {isFetching ? <LinearProgress /> : null}
      {error ? <ErrorAlert message={error instanceof Error ? error.message : String(error)} /> : null}
      {deleteError ? <ErrorAlert message={deleteError} /> : null}
      {rows.some((row) => row.duplicates.length) ? <ErrorAlert message={t('budget.duplicateWarning')} /> : null}

      <Grid container spacing={2}>
        {[
          [t('budget.summary.averageSpent'), summary.averageSpent === null ? t('common.na') : money.format(summary.averageSpent)],
          [t('budget.summary.averageBaseline'), summary.averageBaseline === null ? t('common.na') : money.format(summary.averageBaseline)],
          [t('budget.summary.averageEarned'), summary.averageEarned === null ? t('common.na') : money.format(summary.averageEarned)],
          [t('budget.summary.averageSaved'), summary.averageSaved === null ? t('common.na') : money.format(summary.averageSaved)],
          [t('budget.summary.monthsOverTarget'), String(summary.monthsOverTarget)],
          [t('budget.summary.bestSavingsMonth'), summary.bestSavingsMonth ? `${summary.bestSavingsMonth.payload.monthKey} (${money.format(summary.bestSavingsMonth.saved)})` : t('common.na')],
          [
            t('budget.summary.worstOverspendMonth'),
            summary.worstOverspendMonth
              ? `${summary.worstOverspendMonth.payload.monthKey} (${formatSigned(money, summary.worstOverspendMonth.overUnderTarget)})`
              : t('common.na'),
          ],
        ].map(([label, value]) => (
          <Grid key={label} size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Typography variant="body2" color="text.secondary">
                {label}
              </Typography>
              <Typography variant="h6" sx={{ mt: 0.5 }}>
                {value}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <BudgetTrendChart
        rows={rows}
        money={money}
        labels={{
          title: t('budget.trend'),
          spent: t('records.spent'),
          baseline: t('budget.baseline'),
          target: t('budget.target'),
          aria: t('budget.trendAria'),
        }}
      />

      <Paper variant="outlined">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('records.month')}</TableCell>
                <TableCell>{t('budget.status')}</TableCell>
                <TableCell align="right">{t('records.spent')}</TableCell>
                <TableCell align="right">{t('budget.baseline')}</TableCell>
                <TableCell align="right">{t('budget.target')}</TableCell>
                <TableCell align="right">{t('budget.overUnder')}</TableCell>
                <TableCell align="right">{t('records.earned')}</TableCell>
                <TableCell align="right">{t('budget.saved')}</TableCell>
                <TableCell align="right">{t('budget.savingsRate')}</TableCell>
                <TableCell>{t('budget.notes')}</TableCell>
                {props.readOnly ? null : <TableCell align="right">{t('records.actions')}</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const budget = row.budget
                const status =
                  !budget ? t('budget.rowStatus.missing') : budget.targetSpend === null ? t('budget.rowStatus.noTarget') : budget.overUnderTarget! > 0 ? t('budget.rowStatus.over') : t('budget.rowStatus.under')
                return (
                  <TableRow key={row.monthKey} hover selected={!budget}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.monthKey}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Chip
                          size="small"
                          color={!budget ? 'default' : budget.targetSpend === null ? 'warning' : budget.overUnderTarget! > 0 ? 'warning' : 'success'}
                          variant={!budget ? 'outlined' : 'filled'}
                          label={status}
                        />
                        {row.duplicates.length ? <Chip size="small" color="warning" variant="outlined" label={t('budget.duplicateChip', { count: row.duplicates.length })} /> : null}
                        {budget && (budget.payload.exceptionalSpend ?? 0) > 0 ? (
                          <Chip size="small" variant="outlined" label={t('budget.exceptionalChip', { amount: money.format(budget.payload.exceptionalSpend ?? 0) })} />
                        ) : null}
                      </Stack>
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {budget ? money.format(budget.payload.spent) : t('common.na')}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {budget ? money.format(budget.baselineSpend) : t('common.na')}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {budget?.targetSpend == null ? t('common.na') : money.format(budget.targetSpend)}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {budget ? formatSigned(money, budget.overUnderTarget) : t('common.na')}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {budget ? money.format(budget.payload.earned) : t('common.na')}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {budget ? formatSigned(money, budget.saved) : t('common.na')}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {budget?.savingsRate == null ? t('common.na') : percent.format(budget.savingsRate)}
                    </TableCell>
                    <TableCell sx={{ minWidth: 220, maxWidth: 320 }} title={budget?.payload.exceptionalNotes ?? budget?.payload.notes ?? budget?.payload.description}>
                      {budget ? budget.payload.notes ?? budget.payload.description ?? t('common.na') : t('budget.missingHint')}
                      {budget?.payload.exceptionalNotes ? (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {budget.payload.exceptionalNotes}
                        </Typography>
                      ) : null}
                    </TableCell>
                    {props.readOnly ? null : (
                      <TableCell align="right" padding="checkbox">
                        {budget ? (
                          <MoreActionsMenu
                            onEdit={() =>
                              navigate(`/workspaces/${props.workspaceId}/budget/${budget.record.eventDate}/${budget.record.recordId}/edit`)
                            }
                            onDelete={() =>
                              setDeleteTarget({
                                record: budget.record,
                                label: `${t('recordTypes.BUDGET')} ${budget.payload.monthKey}`,
                              })
                            }
                          />
                        ) : (
                          <Button size="small" component={RouterLink} to={addPath(row.monthKey)}>
                            {t('budget.addMissing')}
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
              {isPending ? (
                <TableRow>
                  <TableCell colSpan={props.readOnly ? 10 : 11}>
                    <Typography color="text.secondary">{t('common.loading')}</Typography>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('records.deleteConfirmTitle', { record: deleteTarget?.label ?? '' })}
        description={t('records.deleteConfirmBody')}
        confirmColor="error"
        loading={deleteSubmitting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </Stack>
  )
}
