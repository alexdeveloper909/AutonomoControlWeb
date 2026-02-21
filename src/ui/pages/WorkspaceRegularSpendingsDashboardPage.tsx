import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import type { RegularSpendingOccurrence } from '../../domain/records'
import { PageHeader } from '../components/PageHeader'
import { ErrorAlert } from '../components/ErrorAlert'
import { LoadingScreen } from '../components/LoadingScreen'
import { queryKeys } from '../queries/queryKeys'
import { useTranslation } from 'react-i18next'
import { decimalFormatter, resolveLocale } from '../lib/intl'
import { toLocalIsoDate } from '../lib/date'

type RangeDays = 30 | 60 | 90

const addDays = (d: Date, n: number): Date => {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

const maxDate = (a: Date, b: Date): Date => (a.getTime() >= b.getTime() ? a : b)

const startOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), 1)

const startOfNextMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth() + 1, 1)

const endOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth() + 1, 0)

const endOfNextMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth() + 2, 0)

const UPCOMING_CAP = 15

type Bucket = { date: string; total: number; entries: { name: string; amount: number }[] }

function BarChart(props: {
  items: RegularSpendingOccurrence[]
  from: string
  to: string
  money: Intl.NumberFormat
  locale: string
  totalLabel: string
}) {
  const { items, from, to, money, locale, totalLabel } = props
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }),
    [locale],
  )
  const labelDateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }),
    [locale],
  )

  const buckets = useMemo<Bucket[]>(() => {
    const map = new Map<string, { name: string; amount: number }[]>()
    for (const item of items) {
      const list = map.get(item.payoutDate) ?? []
      list.push({ name: item.name, amount: item.amount })
      map.set(item.payoutDate, list)
    }
    const result: Bucket[] = []
    const cursor = new Date(from + 'T00:00:00')
    const end = new Date(to + 'T00:00:00')
    while (cursor <= end) {
      const key = toLocalIsoDate(cursor)
      const dayEntries = map.get(key)
      if (dayEntries) {
        result.push({ date: key, total: dayEntries.reduce((s, e) => s + e.amount, 0), entries: dayEntries })
      }
      cursor.setDate(cursor.getDate() + 1)
    }
    return result
  }, [items, from, to])

  if (buckets.length === 0) return null

  const maxTotal = Math.max(...buckets.map((b) => b.total))
  const barWidth = Math.max(10, Math.min(36, Math.floor(700 / buckets.length) - 4))
  const gap = Math.max(2, Math.min(6, Math.floor(barWidth / 3)))
  const yAxisWidth = 64
  const rightPad = 12
  const topPad = 12
  const bottomPad = 52
  const chartHeight = 180
  const svgWidth = Math.max(yAxisWidth + buckets.length * (barWidth + gap) + rightPad, 240)

  const gridCount = 4
  const step = maxTotal > 0 ? Math.ceil(maxTotal / gridCount) : 1
  const niceMax = step * gridCount
  const gridValues = Array.from({ length: gridCount + 1 }, (_, i) => step * i)

  const labelStep = buckets.length <= 12 ? 1 : buckets.length <= 24 ? 2 : Math.ceil(buckets.length / 10)

  const tooltipContent = (b: Bucket) => (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
        {dateFormatter.format(new Date(b.date + 'T00:00:00'))}
      </Typography>
      {b.entries.map((entry, j) => (
        <Stack key={j} direction="row" justifyContent="space-between" spacing={2} sx={{ mt: 0.25 }}>
          <Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>{entry.name}</Typography>
          <Typography variant="body2" sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{money.format(entry.amount)} €</Typography>
        </Stack>
      ))}
      {b.entries.length > 1 && (
        <>
          <Divider sx={{ my: 0.5 }} />
          <Stack direction="row" justifyContent="space-between" spacing={2}>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>{totalLabel}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{money.format(b.total)} €</Typography>
          </Stack>
        </>
      )}
    </Box>
  )

  return (
    <Box sx={{ overflowX: 'auto', pb: 1 }}>
      <svg width={svgWidth} height={chartHeight + topPad + bottomPad} role="img">
        {gridValues.map((val, i) => {
          const y = topPad + chartHeight - (niceMax > 0 ? (val / niceMax) * chartHeight : 0)
          return (
            <g key={`grid-${i}`}>
              <line
                x1={yAxisWidth}
                x2={svgWidth - rightPad}
                y1={y}
                y2={y}
                stroke="var(--mui-palette-divider, #e0e0e0)"
                strokeWidth={1}
                strokeDasharray={i === 0 ? undefined : '3 3'}
              />
              {i > 0 && (
                <text x={yAxisWidth - 8} y={y + 4} textAnchor="end" fontSize={10} fill="var(--mui-palette-text-secondary, #999)">
                  {money.format(val)}
                </text>
              )}
            </g>
          )
        })}

        {buckets.map((b, i) => {
          const barH = niceMax > 0 ? (b.total / niceMax) * chartHeight : 0
          const x = yAxisWidth + i * (barWidth + gap)
          const y = topPad + chartHeight - barH
          const isHovered = hoveredIdx === i
          return (
            <Tooltip
              key={b.date}
              arrow
              slotProps={{
                tooltip: {
                  sx: {
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    boxShadow: 8,
                    borderRadius: 2,
                    p: 1.5,
                    maxWidth: 300,
                  },
                },
                arrow: { sx: { color: 'background.paper' } },
              }}
              title={tooltipContent(b)}
            >
              <g
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(barH, 2)}
                  rx={3}
                  fill={isHovered ? 'var(--mui-palette-primary-dark, #1565c0)' : 'var(--mui-palette-primary-main, #1976d2)'}
                  opacity={isHovered ? 1 : 0.8}
                  style={{ transition: 'fill 0.15s, opacity 0.15s' }}
                />
                <rect x={x} y={topPad} width={barWidth} height={chartHeight} fill="transparent" />
              </g>
            </Tooltip>
          )
        })}

        {buckets.map((b, i) => {
          if (i % labelStep !== 0) return null
          const x = yAxisWidth + i * (barWidth + gap) + barWidth / 2
          const y = topPad + chartHeight + 14
          const d = new Date(b.date + 'T00:00:00')
          return (
            <text
              key={`label-${b.date}`}
              x={x}
              y={y}
              textAnchor="end"
              fontSize={10}
              fill="var(--mui-palette-text-secondary, #666)"
              transform={`rotate(-45, ${x}, ${y})`}
            >
              {labelDateFormatter.format(d)}
            </text>
          )
        })}
      </svg>
    </Box>
  )
}

export function WorkspaceRegularSpendingsDashboardPage(props: {
  workspaceId: string
  api: AutonomoControlApi
  readOnly: boolean
}) {
  const { t, i18n } = useTranslation()
  const money = useMemo(() => decimalFormatter(i18n.language), [i18n.language])
  const [range, setRange] = useState<RangeDays>(30)

  const today = useMemo(() => new Date(), [])

  // Chart/list range (user-selectable).
  const from = useMemo(() => toLocalIsoDate(today), [today])
  const to = useMemo(() => toLocalIsoDate(addDays(today, range)), [today, range])

  // Occurrences query range (supports full month totals regardless of chart range).
  const occFrom = useMemo(() => toLocalIsoDate(startOfMonth(today)), [today])
  const occTo = useMemo(
    () => toLocalIsoDate(maxDate(endOfNextMonth(today), addDays(today, range))),
    [today, range],
  )

  const occQuery = useQuery({
    queryKey: queryKeys.regularSpendingOccurrences(props.workspaceId, occFrom, occTo),
    queryFn: () => props.api.listRegularSpendingOccurrences(props.workspaceId, { from: occFrom, to: occTo }),
  })

  const defsQuery = useQuery({
    queryKey: queryKeys.regularSpendings(props.workspaceId),
    queryFn: () => props.api.listRegularSpendings(props.workspaceId),
  })

  const occurrences = useMemo(() => occQuery.data?.items ?? [], [occQuery.data])
  const hasDefs = (defsQuery.data?.items.length ?? 0) > 0

  const occurrencesInRange = useMemo(
    () => occurrences.filter((o) => o.payoutDate >= from && o.payoutDate <= to),
    [occurrences, from, to],
  )

  const upcomingItems = useMemo(
    () => [...occurrencesInRange].sort((a, b) => a.payoutDate.localeCompare(b.payoutDate)).slice(0, UPCOMING_CAP),
    [occurrencesInRange],
  )

  const totalThisMonth = useMemo(() => {
    const mStart = toLocalIsoDate(startOfMonth(today))
    const mEnd = toLocalIsoDate(endOfMonth(today))
    return occurrences.filter((o) => o.payoutDate >= mStart && o.payoutDate <= mEnd).reduce((s, o) => s + o.amount, 0)
  }, [occurrences, today])

  const totalNextMonth = useMemo(() => {
    const mStart = toLocalIsoDate(startOfNextMonth(today))
    const mEnd = toLocalIsoDate(endOfNextMonth(today))
    return occurrences.filter((o) => o.payoutDate >= mStart && o.payoutDate <= mEnd).reduce((s, o) => s + o.amount, 0)
  }, [occurrences, today])

  const basePath = `/workspaces/${props.workspaceId}/regular-spendings`

  if (defsQuery.isPending) return <LoadingScreen />

  const isEmpty = !hasDefs

  return (
    <Stack spacing={2}>
      <PageHeader
        title={t('regularSpendings.title')}
        right={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" component={RouterLink} to={`${basePath}/list`}>
              {t('regularSpendings.listButton')}
            </Button>
            {props.readOnly ? null : (
              <Button variant="contained" component={RouterLink} to={`${basePath}/new`}>
                {t('regularSpendings.add')}
              </Button>
            )}
          </Stack>
        }
      />

      {defsQuery.error ? (
        <ErrorAlert message={defsQuery.error instanceof Error ? defsQuery.error.message : String(defsQuery.error)} />
      ) : null}
      {occQuery.error ? (
        <ErrorAlert message={occQuery.error instanceof Error ? occQuery.error.message : String(occQuery.error)} />
      ) : null}

      {isEmpty ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            {t('regularSpendings.empty')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('regularSpendings.emptyHint')}
          </Typography>
          {props.readOnly ? null : (
            <Button variant="contained" component={RouterLink} to={`${basePath}/new`}>
              {t('regularSpendings.add')}
            </Button>
          )}
        </Paper>
      ) : (
        <>
          {/* Totals */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {t('regularSpendings.totalThisMonth')}
              </Typography>
              <Typography variant="h5">{money.format(totalThisMonth)} €</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {t('regularSpendings.totalNextMonth')}
              </Typography>
              <Typography variant="h5">{money.format(totalNextMonth)} €</Typography>
            </Paper>
          </Stack>

          {/* Chart */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="subtitle2">{t('regularSpendings.chart')}</Typography>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={range}
                onChange={(_, v) => { if (v !== null) setRange(v as RangeDays) }}
              >
                <ToggleButton value={30}>{t('regularSpendings.range30')}</ToggleButton>
                <ToggleButton value={60}>{t('regularSpendings.range60')}</ToggleButton>
                <ToggleButton value={90}>{t('regularSpendings.range90')}</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
            {occQuery.isPending ? (
              <Typography color="text.secondary">{t('common.loading')}</Typography>
            ) : occurrencesInRange.length === 0 ? (
              <Alert severity="info">{t('regularSpendings.upcomingEmpty')}</Alert>
            ) : (
              <BarChart
                items={occurrencesInRange}
                from={from}
                to={to}
                money={money}
                locale={resolveLocale(i18n.language)}
                totalLabel={t('regularSpendings.tooltipTotal')}
              />
            )}
          </Paper>

          {/* Upcoming list */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="subtitle2">{t('regularSpendings.upcoming')}</Typography>
              {occurrencesInRange.length > UPCOMING_CAP ? (
                <Button size="small" component={RouterLink} to={`${basePath}/list`}>
                  {t('regularSpendings.viewAll')}
                </Button>
              ) : null}
            </Stack>
            {upcomingItems.length === 0 ? (
              <Typography color="text.secondary" variant="body2">
                {t('regularSpendings.upcomingEmpty')}
              </Typography>
            ) : (
              <List dense disablePadding>
                {upcomingItems.map((item, idx) => (
                  <ListItem key={`${item.recordId}-${item.payoutDate}-${idx}`} disablePadding sx={{ py: 0.25 }}>
                    <ListItemText
                      primary={item.name}
                      secondary={item.payoutDate}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                    <Chip label={`${money.format(item.amount)} €`} size="small" variant="outlined" />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </>
      )}
    </Stack>
  )
}
