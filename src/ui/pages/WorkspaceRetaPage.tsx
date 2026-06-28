import { useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Link,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import { defaultRetaPlanningSettings, type RetaCuotaScenarioKind, type RetaProjectionMode, type RetaScenarioSettings } from '../../domain/reta'
import { ErrorAlert } from '../components/ErrorAlert'
import { PageHeader } from '../components/PageHeader'
import { euroCurrencyFormatter } from '../lib/intl'
import { queryKeys } from '../queries/queryKeys'
import { useTranslation } from 'react-i18next'

const formatMonthKey = (monthKey: string): string => monthKey

const scenarioKindLabel = (kind: RetaCuotaScenarioKind): string => {
  switch (kind) {
    case 'MINIMUM_BASE':
      return 'Minimum base'
    case 'SELECTED_BASE':
      return 'Selected base'
    case 'MAXIMUM_BASE':
      return 'Maximum base'
    case 'TARIFA_PLANA':
      return 'Tarifa plana'
  }
}

const projectionModeLabel = (mode: RetaProjectionMode): string =>
  mode === 'SAME_AS_CURRENT_RUN_RATE' ? 'Same income pattern' : 'Different future income'

const warningCopy = (code: string): string => {
  switch (code) {
    case 'MISSING_YEAR_CONFIGURATION':
      return 'No RETA table is configured for this workspace year. Verify the year or update reference data.'
    case 'CONTRIBUTION_RATE_COMPONENTS_DO_NOT_SUM_TO_TOTAL':
      return 'Official contribution-rate components do not sum to the configured total rate. Verify the final cuota in the Importass simulator.'
    case 'NO_COMPLETED_MONTHS_FOR_RUN_RATE':
      return 'There are no completed active months yet, so same-income projection cannot infer a run rate.'
    case 'MANUAL_FUTURE_MONTHLY_ACTIVITY_NET_REQUIRED':
      return 'Enter expected monthly activity net to use the different-future-income projection.'
    case 'SELECTED_BASE_BELOW_ALLOWED_RANGE':
      return 'Selected contribution base is below the allowed range for the matched tramo.'
    case 'SELECTED_BASE_ABOVE_ALLOWED_RANGE':
      return 'Selected contribution base is above the allowed range for the matched tramo.'
    case 'VERY_LOW_OR_NEGATIVE_EARNINGS_VERIFY_MINIMUM_CONTRIBUTION':
      return 'Very low or negative earnings may still require a minimum RETA contribution. Verify in Importass.'
    case 'TARIFA_PLANA_VERIFY_ELIGIBILITY_AND_AMOUNT':
      return 'Tarifa plana is a special estimate. Verify eligibility, dates, and amount in Importass.'
    default:
      return code
  }
}

function Metric(props: { label: string; value: string; helper?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
      <Typography variant="caption" color="text.secondary">
        {props.label}
      </Typography>
      <Typography variant="h6" sx={{ mt: 0.5, overflowWrap: 'anywhere' }}>
        {props.value}
      </Typography>
      {props.helper ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {props.helper}
        </Typography>
      ) : null}
    </Paper>
  )
}

export function WorkspaceRetaPage(props: { workspaceId: string; api: AutonomoControlApi; readOnly: boolean }) {
  const { i18n, t } = useTranslation()
  const money = useMemo(() => euroCurrencyFormatter(i18n.language), [i18n.language])
  const [projectionMode, setProjectionMode] = useState<RetaProjectionMode>('MANUAL_FUTURE_MONTHLY_INCOME')
  const [manualFutureMonthlyActivityNet, setManualFutureMonthlyActivityNet] = useState('')
  const [customContributionBase, setCustomContributionBase] = useState('')

  const settingsQuery = useQuery({
    queryKey: queryKeys.workspaceSettings(props.workspaceId),
    queryFn: () => props.api.getWorkspaceSettings(props.workspaceId),
  })

  const settings = settingsQuery.data
  const planning = settings?.retaPlanning ?? defaultRetaPlanningSettings()
  const customBaseNumber = customContributionBase.trim() === '' ? null : Number(customContributionBase)
  const manualMonthlyNumber = manualFutureMonthlyActivityNet.trim() === '' ? null : Number(manualFutureMonthlyActivityNet)
  const scenario: RetaScenarioSettings = {
    projectionMode,
    manualFutureMonthlyActivityNet:
      projectionMode === 'MANUAL_FUTURE_MONTHLY_INCOME' && Number.isFinite(manualMonthlyNumber) ? manualMonthlyNumber : null,
    baseSelectionPolicy: Number.isFinite(customBaseNumber) ? 'CUSTOM' : planning.defaultBaseSelectionPolicy,
    customContributionBase: Number.isFinite(customBaseNumber) ? customBaseNumber : null,
  }
  const scenarioKey = JSON.stringify(scenario)

  const retaQuery = useQuery({
    queryKey: settings ? queryKeys.retaSummary(props.workspaceId, settings.year, scenarioKey) : ['workspaces', props.workspaceId, 'summaries', 'reta', 'pending'],
    queryFn: () => props.api.retaSummary(props.workspaceId, settings!, scenario),
    enabled: Boolean(settings),
  })

  const estimate = retaQuery.data?.reta ?? null
  const suggestedMonthly = estimate?.projectionBreakdown.observedCompletedMonths
    ? (estimate.projectionBreakdown.actualIncomeBase - estimate.projectionBreakdown.actualDeductibleExpenses) /
      estimate.projectionBreakdown.observedCompletedMonths
    : null
  const noRecords =
    estimate != null &&
    estimate.projectionBreakdown.observedCompletedMonths === 0 &&
    estimate.projectionBreakdown.actualIncomeBase === 0 &&
    estimate.projectionBreakdown.actualDeductibleExpenses === 0 &&
    estimate.projectionBreakdown.actualSeguridadSocialPaid === 0

  return (
    <Stack spacing={2}>
      <PageHeader
        title={t('reta.title', { defaultValue: 'Seguridad Social / RETA' })}
        description={t('reta.description', {
          defaultValue:
            'Planning calculator for average monthly RETA earnings, contribution base, and estimated cuota. It does not create payment records.',
        })}
        right={
          <Button component={RouterLink} to={`/workspaces/${props.workspaceId}/state-payments`} variant="outlined">
            {t('reta.recordActualPayments', { defaultValue: 'Record actual payments' })}
          </Button>
        }
      />

      {settingsQuery.isLoading ? <LinearProgress /> : null}
      {settingsQuery.error ? <ErrorAlert message={settingsQuery.error instanceof Error ? settingsQuery.error.message : String(settingsQuery.error)} /> : null}
      {retaQuery.error ? <ErrorAlert message={retaQuery.error instanceof Error ? retaQuery.error.message : String(retaQuery.error)} /> : null}

      {settings && !planning.enabled ? (
        <Alert severity="info">
          {t('reta.disabled', {
            defaultValue: 'RETA planning is disabled in workspace settings. Enable it there to use the calculator.',
          })}
        </Alert>
      ) : null}

      {props.readOnly ? (
        <Alert severity="info">
          {t('reta.readOnly', {
            defaultValue: 'You have read-only access. Scenario controls on this page are local and can still be changed; defaults cannot be saved.',
          })}
        </Alert>
      ) : null}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography variant="subtitle1">{t('reta.scenario', { defaultValue: 'Scenario' })}</Typography>
          <ToggleButtonGroup
            exclusive
            value={projectionMode}
            onChange={(_, next) => {
              if (next) setProjectionMode(next)
            }}
            size="small"
            sx={{ flexWrap: 'wrap', gap: 1, '& .MuiToggleButtonGroup-grouped': { borderRadius: 1, border: 1, borderColor: 'divider' } }}
          >
            <ToggleButton value="SAME_AS_CURRENT_RUN_RATE">{projectionModeLabel('SAME_AS_CURRENT_RUN_RATE')}</ToggleButton>
            <ToggleButton value="MANUAL_FUTURE_MONTHLY_INCOME">{projectionModeLabel('MANUAL_FUTURE_MONTHLY_INCOME')}</ToggleButton>
          </ToggleButtonGroup>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label={t('reta.manualFutureMonthlyActivityNet', {
                  defaultValue: 'Expected monthly income minus deductible business expenses',
                })}
                type="number"
                inputProps={{ step: '0.01' }}
                value={manualFutureMonthlyActivityNet}
                onChange={(e) => setManualFutureMonthlyActivityNet(e.target.value)}
                disabled={projectionMode !== 'MANUAL_FUTURE_MONTHLY_INCOME'}
                helperText={t('reta.manualFutureHelp', {
                  defaultValue: 'Before Social Security and before RETA generic deductions. This is a local scenario input.',
                })}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label={t('reta.customContributionBase', { defaultValue: 'Custom contribution base' })}
                type="number"
                inputProps={{ step: '0.01' }}
                value={customContributionBase}
                onChange={(e) => setCustomContributionBase(e.target.value)}
                helperText={t('reta.customContributionBaseHelp', {
                  defaultValue: 'Leave empty to use the minimum allowed base for the matched tramo.',
                })}
                fullWidth
              />
            </Grid>
          </Grid>

          {suggestedMonthly != null ? (
            <Alert
              severity="info"
              action={
                <Button color="inherit" size="small" onClick={() => setManualFutureMonthlyActivityNet(String(Math.round(suggestedMonthly * 100) / 100))}>
                  {t('reta.applySuggestion', { defaultValue: 'Apply' })}
                </Button>
              }
            >
              {t('reta.suggestedMonthly', {
                defaultValue: 'Suggested completed-month run rate: {{amount}}',
                amount: money.format(suggestedMonthly),
              })}
            </Alert>
          ) : null}
        </Stack>
      </Paper>

      {retaQuery.isFetching ? <LinearProgress /> : null}

      {estimate ? (
        <>
          {noRecords ? (
            <Alert severity="info">
              {t('reta.noRecords', { defaultValue: 'No completed-month records are available yet. Manual projection can still be used.' })}
            </Alert>
          ) : null}

          {estimate.warningCodes.length ? (
            <Stack spacing={1}>
              {estimate.warningCodes.map((code) => (
                <Alert key={code} severity={code.includes('SELECTED_BASE') || code === 'MISSING_YEAR_CONFIGURATION' ? 'warning' : 'info'}>
                  {warningCopy(code)}
                </Alert>
              ))}
            </Stack>
          ) : null}

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Metric
                label={t('reta.averageMonthlyEarnings', { defaultValue: 'Average monthly RETA earnings to report' })}
                value={money.format(estimate.retaAverageMonthlyEarnings)}
                helper={t('reta.reportableHelper', { defaultValue: 'Use this as the planning value to verify in Importass.' })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Metric
                label={t('reta.tramo', { defaultValue: 'Matched tramo' })}
                value={estimate.tramo ? `${estimate.tramo.table} ${estimate.tramo.tramo}` : t('common.na')}
                helper={
                  estimate.baseRange
                    ? `${money.format(estimate.baseRange.minimumBase)} - ${money.format(estimate.baseRange.maximumBase)}`
                    : t('reta.noBaseRange', { defaultValue: 'No base range available.' })
                }
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Metric
                label={t('reta.selectedBase', { defaultValue: 'Selected contribution base' })}
                value={estimate.selectedContributionBase == null ? t('common.na') : money.format(estimate.selectedContributionBase)}
                helper={t('reta.selectedBaseHelper', { defaultValue: 'Minimum base is used unless a local custom base is entered.' })}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle1">{t('reta.breakdown', { defaultValue: 'Calculation breakdown' })}</Typography>
                <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                  {[
                    ['IRPF activity net', estimate.irpfActivityNetAnnual],
                    ['Actual Seguridad Social paid', estimate.seguridadSocialPaidAnnual],
                    ['Before RETA generic deduction', estimate.retaBeforeGenericDeduction],
                    ['RETA generic deduction', -estimate.retaGenericDeductionAmount],
                    ['RETA computable annual earnings', estimate.retaComputableAnnualEarnings],
                  ].map(([label, value]) => (
                    <Stack key={label} direction="row" justifyContent="space-between" gap={2}>
                      <Typography variant="body2" color="text.secondary">
                        {label}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {money.format(value as number)}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle1">{t('reta.changeWindow', { defaultValue: 'Next change window' })}</Typography>
                <Stack spacing={1} sx={{ mt: 1.5 }}>
                  <Typography variant="h6">
                    {estimate.nextChangeWindow.requestStart} - {estimate.nextChangeWindow.requestEnd}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('reta.effectiveDate', { defaultValue: 'Effective date' })}: {estimate.nextChangeWindow.effectiveDate}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('reta.changeWindowHelp', {
                      defaultValue: 'Use this only as planning context. Submit actual changes manually in Importass.',
                    })}
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1">{t('reta.cuotaScenarios', { defaultValue: 'Cuota scenarios' })}</Typography>
            <TableContainer sx={{ mt: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('common.type', { defaultValue: 'Type' })}</TableCell>
                    <TableCell align="right">{t('reta.contributionBase', { defaultValue: 'Base' })}</TableCell>
                    <TableCell align="right">{t('reta.monthlyCuota', { defaultValue: 'Monthly cuota' })}</TableCell>
                    <TableCell align="right">{t('reta.annualizedCuota', { defaultValue: 'Annualized cuota' })}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {estimate.cuotaScenarios.map((scenario) => (
                    <TableRow key={scenario.kind}>
                      <TableCell>{scenarioKindLabel(scenario.kind)}</TableCell>
                      <TableCell align="right">{scenario.contributionBase == null ? t('common.na') : money.format(scenario.contributionBase)}</TableCell>
                      <TableCell align="right">{money.format(scenario.monthlyCuota)}</TableCell>
                      <TableCell align="right">{money.format(scenario.annualizedCuota)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1.5}>
              <Typography variant="subtitle1">{t('reta.actualComparison', { defaultValue: 'Actual payments comparison' })}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('reta.actualComparisonHelp', {
                  defaultValue:
                    'Recorded Seguridad Social payments are shown as context only. The planner does not calculate remaining payable, refunds, or regularization settlement.',
                })}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Chip label={`${t('reta.recordedYtd', { defaultValue: 'Recorded YTD' })}: ${money.format(estimate.seguridadSocialPaidAnnual)}`} />
                <Chip
                  label={`${t('reta.selectedAnnualized', { defaultValue: 'Selected annualized cuota' })}: ${
                    estimate.cuotaScenarios.find((s) => s.kind === 'SELECTED_BASE')?.annualizedCuota != null
                      ? money.format(estimate.cuotaScenarios.find((s) => s.kind === 'SELECTED_BASE')?.annualizedCuota ?? 0)
                      : t('common.na')
                  }`}
                />
              </Stack>
              <Button component={RouterLink} to={`/workspaces/${props.workspaceId}/state-payments`} variant="outlined" sx={{ alignSelf: 'flex-start' }}>
                {t('reta.openStatePayments', { defaultValue: 'Open State payments' })}
              </Button>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1">{t('reta.monthBuckets', { defaultValue: 'Months used in projection' })}</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))', md: 'repeat(6, minmax(0, 1fr))' }, gap: 1, mt: 1.5 }}>
              {estimate.projectionBreakdown.monthBuckets.map((bucket) => (
                <Paper key={bucket.monthKey} variant="outlined" sx={{ p: 1.25 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {formatMonthKey(bucket.monthKey)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {bucket.kind}
                  </Typography>
                  <Typography variant="body2">{money.format(bucket.irpfActivityNet)}</Typography>
                </Paper>
              ))}
            </Box>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1">{t('reta.officialLinks', { defaultValue: 'Official verification' })}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t('reta.officialLinksHelp', {
                defaultValue: 'Always verify the final value, contribution base, cuota, and eligibility in Importass before submitting changes.',
              })}
            </Typography>
            <Divider sx={{ my: 1.5 }} />
            <Stack spacing={1}>
              {estimate.catalogSources.map((source) => (
                <Link key={source.url} href={source.url} target="_blank" rel="noreferrer">
                  {source.label}
                </Link>
              ))}
            </Stack>
          </Paper>
        </>
      ) : null}
    </Stack>
  )
}
