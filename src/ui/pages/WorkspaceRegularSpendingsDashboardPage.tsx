import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
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
import { decimalFormatter } from '../lib/intl'

type RangeDays = 30 | 60 | 90

const toIsoDate = (d: Date): string => d.toISOString().slice(0, 10)

const addDays = (d: Date, n: number): Date => {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

const startOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), 1)

const startOfNextMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth() + 1, 1)

const endOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth() + 1, 0)

const endOfNextMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth() + 2, 0)

const UPCOMING_CAP = 15

function BarChart(props: { items: RegularSpendingOccurrence[]; from: string; to: string; money: Intl.NumberFormat }) {
  const { items, from, to, money } = props
  const buckets = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of items) {
      map.set(item.payoutDate, (map.get(item.payoutDate) ?? 0) + item.amount)
    }
    const result: { date: string; total: number }[] = []
    const cursor = new Date(from + 'T00:00:00')
    const end = new Date(to + 'T00:00:00')
    while (cursor <= end) {
      const key = toIsoDate(cursor)
      const total = map.get(key) ?? 0
      if (total > 0) result.push({ date: key, total })
      cursor.setDate(cursor.getDate() + 1)
    }
    return result
  }, [items, from, to])

  if (buckets.length === 0) return null

  const maxTotal = Math.max(...buckets.map((b) => b.total))
  const barWidth = Math.max(6, Math.min(24, Math.floor(600 / buckets.length) - 2))
  const chartWidth = buckets.length * (barWidth + 2) + 40
  const chartHeight = 140
  const topPad = 10
  const bottomPad = 40

  return (
    <Box sx={{ overflowX: 'auto', pb: 1 }}>
      <svg width={Math.max(chartWidth, 200)} height={chartHeight + topPad + bottomPad} role="img">
        {buckets.map((b, i) => {
          const barHeight = maxTotal > 0 ? (b.total / maxTotal) * chartHeight : 0
          const x = 20 + i * (barWidth + 2)
          const y = topPad + chartHeight - barHeight
          return (
            <Tooltip key={b.date} title={`${b.date}: ${money.format(b.total)}`} arrow>
              <g>
                <rect x={x} y={y} width={barWidth} height={barHeight} rx={2} fill="var(--mui-palette-primary-main, #1976d2)" opacity={0.85} />
              </g>
            </Tooltip>
          )
        })}
        {buckets.map((b, i) => {
          if (buckets.length > 20 && i % Math.ceil(buckets.length / 10) !== 0) return null
          const x = 20 + i * (barWidth + 2) + barWidth / 2
          return (
            <text
              key={`label-${b.date}`}
              x={x}
              y={topPad + chartHeight + 14}
              textAnchor="middle"
              fontSize={9}
              fill="var(--mui-palette-text-secondary, #666)"
            >
              {b.date.slice(5)}
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
  const from = useMemo(() => toIsoDate(today), [today])
  const to = useMemo(() => toIsoDate(addDays(today, range)), [today, range])

  const occQuery = useQuery({
    queryKey: queryKeys.regularSpendingOccurrences(props.workspaceId, from, to),
    queryFn: () => props.api.listRegularSpendingOccurrences(props.workspaceId, { from, to }),
  })

  const defsQuery = useQuery({
    queryKey: queryKeys.regularSpendings(props.workspaceId),
    queryFn: () => props.api.listRegularSpendings(props.workspaceId),
  })

  const occurrences = occQuery.data?.items ?? []
  const hasDefs = (defsQuery.data?.items.length ?? 0) > 0

  const upcomingItems = useMemo(
    () => [...occurrences].sort((a, b) => a.payoutDate.localeCompare(b.payoutDate)).slice(0, UPCOMING_CAP),
    [occurrences],
  )

  const totalThisMonth = useMemo(() => {
    const mStart = toIsoDate(startOfMonth(today))
    const mEnd = toIsoDate(endOfMonth(today))
    return occurrences.filter((o) => o.payoutDate >= mStart && o.payoutDate <= mEnd).reduce((s, o) => s + o.amount, 0)
  }, [occurrences, today])

  const totalNextMonth = useMemo(() => {
    const mStart = toIsoDate(startOfNextMonth(today))
    const mEnd = toIsoDate(endOfNextMonth(today))
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
            ) : occurrences.length === 0 ? (
              <Alert severity="info">{t('regularSpendings.upcomingEmpty')}</Alert>
            ) : (
              <BarChart items={occurrences} from={from} to={to} money={money} />
            )}
          </Paper>

          {/* Upcoming list */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="subtitle2">{t('regularSpendings.upcoming')}</Typography>
              {occurrences.length > UPCOMING_CAP ? (
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
