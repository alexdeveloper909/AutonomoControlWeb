import { useMemo, useState } from 'react'
import { Alert, Button, FormControl, InputLabel, LinearProgress, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import type { UkrainianFopSummaryRow } from '../../domain/records'
import { isUkrainianFopEntity } from '../../domain/settings'
import { PageHeader } from '../components/PageHeader'
import { ErrorAlert } from '../components/ErrorAlert'
import { currencyFormatter } from '../lib/intl'
import { queryKeys } from '../queries/queryKeys'
import { useTranslation } from 'react-i18next'
import { ResponsiveDataView } from '../components/ResponsiveDataView'
import { MobileRecordCard } from '../components/MobileRecordCard'

const currentYear = (): string => String(new Date().getFullYear())

function SummaryTable(props: { title: string; rows: UkrainianFopSummaryRow[]; keyField: 'monthKey' | 'quarterKey'; empty: string; money: Intl.NumberFormat }) {
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">{props.title}</Typography>
      <ResponsiveDataView
        tableLabel={`${props.title} table`}
        cardsLabel={`${props.title} cards`}
        table={
          <Paper variant="outlined">
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 820 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Period</TableCell>
                    <TableCell align="right">Invoices</TableCell>
                    <TableCell align="right">Taxable revenue</TableCell>
                    <TableCell align="right">Single tax</TableCell>
                    <TableCell align="right">Military levy</TableCell>
                    <TableCell align="right">Social contribution</TableCell>
                    <TableCell align="right">Available estimate</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {props.rows.length ? (
                    props.rows.map((row) => (
                      <TableRow key={row[props.keyField] ?? 'total'}>
                        <TableCell>{row[props.keyField]}</TableCell>
                        <TableCell align="right">{row.invoiceCount}</TableCell>
                        <TableCell align="right">{props.money.format(row.taxableRevenue)}</TableCell>
                        <TableCell align="right">{props.money.format(row.singleTax)}</TableCell>
                        <TableCell align="right">{props.money.format(row.militaryLevy)}</TableCell>
                        <TableCell align="right">{props.money.format(row.socialContribution)}</TableCell>
                        <TableCell align="right">{props.money.format(row.availableEstimate)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <Typography color="text.secondary">{props.empty}</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        }
        cards={
          <Stack spacing={1.5}>
            {props.rows.length ? (
              props.rows.map((row) => (
                <MobileRecordCard
                  key={row[props.keyField] ?? 'total'}
                  title={row[props.keyField] ?? 'Total'}
                  amount={props.money.format(row.availableEstimate)}
                  facts={[
                    { label: 'Invoices', value: row.invoiceCount },
                    { label: 'Taxable revenue', value: props.money.format(row.taxableRevenue) },
                    { label: 'Single tax', value: props.money.format(row.singleTax) },
                    { label: 'Military levy', value: props.money.format(row.militaryLevy) },
                    { label: 'Social contribution', value: props.money.format(row.socialContribution) },
                  ]}
                  expandLabel="Show summary details"
                />
              ))
            ) : (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography color="text.secondary">{props.empty}</Typography>
              </Paper>
            )}
          </Stack>
        }
      />
    </Stack>
  )
}

function KeyValueGrid(props: { items: { label: string; value: string | number }[] }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      useFlexGap
      flexWrap="wrap"
      sx={{ '& > *': { flex: { xs: '1 1 auto', sm: '1 1 180px' }, minWidth: 0 } }}
    >
      {props.items.map((item) => (
        <Paper key={item.label} variant="outlined" sx={{ p: 1.5, bgcolor: 'background.default' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {item.label}
          </Typography>
          <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}>
            {item.value}
          </Typography>
        </Paper>
      ))}
    </Stack>
  )
}

export function WorkspaceBusinessEntitySummaryPage(props: { workspaceId: string; entityId: string; api: AutonomoControlApi }) {
  const { i18n } = useTranslation()
  const [year, setYear] = useState(currentYear())
  const queryClient = useQueryClient()
  const money = useMemo(() => currencyFormatter(i18n.language, 'UAH'), [i18n.language])
  const basePath = `/workspaces/${props.workspaceId}/business-entities/${props.entityId}`

  const entitiesQuery = useQuery({
    queryKey: queryKeys.businessEntities(props.workspaceId, true),
    queryFn: () => props.api.listBusinessEntities(props.workspaceId, true),
  })
  const entity = entitiesQuery.data?.find((item) => item.entityId === props.entityId) ?? null
  const summaryQuery = useQuery({
    queryKey: queryKeys.entitySummary(props.workspaceId, props.entityId, year),
    queryFn: () => props.api.getUkrainianFopSummary(props.workspaceId, props.entityId, year),
    enabled: isUkrainianFopEntity(entity),
  })
  const yearOptions = useMemo(() => {
    const current = Number(currentYear())
    return Array.from({ length: 12 }, (_, i) => String(current + 1 - i))
  }, [])

  if (entitiesQuery.isPending) return <LinearProgress />
  if (entitiesQuery.error) return <ErrorAlert message={entitiesQuery.error instanceof Error ? entitiesQuery.error.message : String(entitiesQuery.error)} />
  if (!entity) return <ErrorAlert message="Business entity not found." />
  if (!isUkrainianFopEntity(entity)) return <ErrorAlert message="This business entity type is not supported by this Web client yet." />

  const summary = summaryQuery.data
  const warningCodes = summary?.warningCodes ?? summary?.warnings?.map((warning) => warning.code) ?? []

  return (
    <Stack spacing={2}>
      <PageHeader
        title={`${entity.name} summary`}
        description="Ukrainian FOP tax liability estimate based on received invoices and persisted entity settings."
        right={<Button component={RouterLink} to={`${basePath}/invoices`} variant="text">Invoices</Button>}
      />

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <FormControl sx={{ minWidth: 160 }}>
            <InputLabel id="fop-summary-year">Year</InputLabel>
            <Select labelId="fop-summary-year" label="Year" value={year} size="small" onChange={(e) => setYear(e.target.value)}>
              {yearOptions.map((option) => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            onClick={() => queryClient.removeQueries({ queryKey: queryKeys.entitySummary(props.workspaceId, props.entityId, year) })}
            disabled={summaryQuery.isFetching}
            sx={{ minHeight: 44, alignSelf: { xs: 'stretch', sm: 'center' } }}
          >
            Refresh
          </Button>
        </Stack>
      </Paper>

      {summaryQuery.isFetching ? <LinearProgress /> : null}
      {summaryQuery.error ? <ErrorAlert message={summaryQuery.error instanceof Error ? summaryQuery.error.message : String(summaryQuery.error)} /> : null}
      {summary && !summary.isComplete ? (
        <Alert severity="warning">
          Summary is incomplete. Configure missing year settings in Workspace Settings.
          <Stack component="span" spacing={0.5} sx={{ display: 'block', mt: 1 }}>
            {warningCodes.map((warningCode, index) => (
              <Typography key={`${warningCode}-${index}`} component="span" variant="body2" sx={{ display: 'block' }}>
                {warningCode}
              </Typography>
            ))}
          </Stack>
        </Alert>
      ) : null}

      {summary?.effectiveYearSettings ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1}>
            <Typography variant="subtitle2">Effective year settings</Typography>
            <KeyValueGrid
              items={[
                { label: 'Single tax', value: summary.effectiveYearSettings.taxRates?.singleTaxRate ?? 'missing' },
                { label: 'Military levy', value: summary.effectiveYearSettings.taxRates?.militaryLevyRate ?? 'missing' },
                { label: 'Social contribution', value: summary.effectiveYearSettings.socialContribution?.enabled === false ? 'disabled' : 'enabled' },
              ]}
            />
          </Stack>
        </Paper>
      ) : null}

      {summary ? (
        <>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1}>
              <Typography variant="subtitle2">Year totals</Typography>
              <KeyValueGrid
                items={[
                  { label: 'Invoices', value: summary.totals.invoiceCount },
                  { label: 'Taxable revenue', value: money.format(summary.totals.taxableRevenue) },
                  { label: 'Single tax', value: money.format(summary.totals.singleTax) },
                  { label: 'Military levy', value: money.format(summary.totals.militaryLevy) },
                  { label: 'Social contribution', value: money.format(summary.totals.socialContribution) },
                  { label: 'Available estimate', value: money.format(summary.totals.availableEstimate) },
                ]}
              />
            </Stack>
          </Paper>
          <SummaryTable title="Months" rows={summary.months} keyField="monthKey" empty="No month rows returned." money={money} />
          <SummaryTable title="Quarters" rows={summary.quarters} keyField="quarterKey" empty="No quarter rows returned." money={money} />
        </>
      ) : null}
    </Stack>
  )
}
