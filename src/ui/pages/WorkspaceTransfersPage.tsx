import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
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
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import type { BalanceAccount, BalanceAccountKind, WorkspaceSettings } from '../../domain/settings'
import { normalizedBalanceAccounts } from '../../domain/settings'
import type { BalanceAccountSummary, BalanceLedgerRow } from '../../domain/balance'
import { PageHeader } from '../components/PageHeader'
import { ErrorAlert } from '../components/ErrorAlert'
import { queryKeys } from '../queries/queryKeys'
import { useTranslation } from 'react-i18next'
import { decimalFormatter, euroCurrencyFormatter } from '../lib/intl'
import { MoreActionsMenu } from '../components/MoreActionsMenu'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { parseEuroAmount } from '../lib/money'
import { ResponsiveDataView } from '../components/ResponsiveDataView'
import { MobileRecordCard } from '../components/MobileRecordCard'
import { ResponsiveActionRow } from '../components/ResponsiveActionRow'

const currentYear = (): string => String(new Date().getFullYear())
const todayIso = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const isIsoDate = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s)

const sortRowsDesc = (a: BalanceLedgerRow, b: BalanceLedgerRow): number => {
  if (a.eventDate !== b.eventDate) return a.eventDate > b.eventDate ? -1 : 1
  return a.recordKey > b.recordKey ? -1 : a.recordKey < b.recordKey ? 1 : 0
}

const slug = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const stableAccountId = (kind: BalanceAccountKind, name: string, existingIds: Set<string>): string => {
  const base = slug(name) || kind.toLowerCase()
  let candidate = base
  let i = 2
  while (candidate === 'main' || existingIds.has(candidate)) {
    candidate = `${base}-${i}`
    i += 1
  }
  return candidate
}

const displayAccountName = (accounts: BalanceAccountSummary[], accountId: string | null | undefined): string => {
  if (!accountId) return 'Main'
  return accounts.find((account) => account.accountId === accountId)?.name ?? accountId
}

function AccountDialog(props: {
  open: boolean
  mode: 'create' | 'rename'
  account?: BalanceAccount | null
  onClose: () => void
  onSubmit: (input: { name: string; kind: BalanceAccountKind; openingBalance: number; openingDate: string }) => Promise<void>
}) {
  const { t } = useTranslation()
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const [name, setName] = useState(props.account?.name ?? '')
  const [kind, setKind] = useState<BalanceAccountKind>(props.account?.kind === 'MAIN' ? 'OTHER' : props.account?.kind ?? 'CASH')
  const [openingBalance, setOpeningBalance] = useState('0')
  const [openingDate, setOpeningDate] = useState(todayIso())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setName(props.account?.name ?? '')
    setKind(props.account?.kind === 'MAIN' ? 'OTHER' : props.account?.kind ?? 'CASH')
    setOpeningBalance('0')
    setOpeningDate(todayIso())
    setError(null)
  }

  useEffect(() => {
    if (!props.open) return
    setName(props.account?.name ?? '')
    setKind(props.account?.kind === 'MAIN' ? 'OTHER' : props.account?.kind ?? 'CASH')
    setOpeningBalance('0')
    setOpeningDate(todayIso())
    setError(null)
  }, [props.open, props.mode, props.account?.accountId, props.account?.kind, props.account?.name])

  const submit = async () => {
    setError(null)
    const cleanName = name.trim()
    if (!cleanName) {
      setError(t('balanceAccounts.validation.nameRequired'))
      return
    }
    const amount = parseEuroAmount(openingBalance)
    if (props.mode === 'create' && amount == null) {
      setError(t('transfersCreate.validation.amountNumber'))
      return
    }
    if (props.mode === 'create' && !isIsoDate(openingDate)) {
      setError(t('transfersCreate.validation.date'))
      return
    }
    setSubmitting(true)
    try {
      await props.onSubmit({
        name: cleanName,
        kind,
        openingBalance: amount ?? 0,
        openingDate,
      })
      reset()
      props.onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={props.open} onClose={submitting ? () => {} : props.onClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle>{props.mode === 'create' ? t('balanceAccounts.createTitle') : t('balanceAccounts.renameTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error ? <ErrorAlert message={error} /> : null}
          <TextField
            label={t('balanceAccounts.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={submitting}
            fullWidth
          />
          {props.mode === 'create' ? (
            <>
              <FormControl fullWidth>
                <InputLabel id="balance-account-kind-label">{t('balanceAccounts.kind')}</InputLabel>
                <Select
                  labelId="balance-account-kind-label"
                  label={t('balanceAccounts.kind')}
                  value={kind}
                  onChange={(e) => setKind(e.target.value as BalanceAccountKind)}
                  disabled={submitting}
                >
                  <MenuItem value="CASH">{t('balanceAccounts.kinds.CASH')}</MenuItem>
                  <MenuItem value="OTHER">{t('balanceAccounts.kinds.OTHER')}</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label={t('balanceAccounts.openingBalance')}
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                disabled={submitting}
                fullWidth
              />
              <TextField
                label={t('balanceAccounts.openingDate')}
                type="date"
                value={openingDate}
                onChange={(e) => setOpeningDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                disabled={submitting}
                fullWidth
              />
            </>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1, '& > .MuiButton-root': { minHeight: 44, flex: { xs: '1 1 100%', sm: '0 0 auto' } } }}>
        <Button onClick={props.onClose} disabled={submitting}>
          {t('common.cancel')}
        </Button>
        <Button variant="contained" onClick={submit} disabled={submitting}>
          {submitting ? t('common.saving') : props.mode === 'create' ? t('common.create') : t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export function WorkspaceTransfersPage(props: { workspaceId: string; api: AutonomoControlApi; readOnly: boolean }) {
  const { t, i18n } = useTranslation()
  const money = useMemo(() => decimalFormatter(i18n.language), [i18n.language])
  const currency = useMemo(() => euroCurrencyFormatter(i18n.language), [i18n.language])
  const navigate = useNavigate()
  const [year, setYear] = useState(currentYear())
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BalanceLedgerRow | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [accountDialog, setAccountDialog] = useState<{ mode: 'create' | 'rename'; account?: BalanceAccount | null } | null>(null)
  const [accountError, setAccountError] = useState<string | null>(null)
  const [confirmAccount, setConfirmAccount] = useState<{ account: BalanceAccount; action: 'archive' | 'close' } | null>(null)
  const [accountSubmitting, setAccountSubmitting] = useState(false)
  const [expandedRecordKey, setExpandedRecordKey] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const settingsQuery = useQuery({
    queryKey: queryKeys.workspaceSettings(props.workspaceId),
    queryFn: () => props.api.getWorkspaceSettings(props.workspaceId),
  })
  const balanceQueryKey = queryKeys.balance(props.workspaceId, year, selectedAccountId)
  const balanceQuery = useQuery({
    queryKey: balanceQueryKey,
    queryFn: () => props.api.getBalance(props.workspaceId, { year, accountId: selectedAccountId }),
  })

  const settings = (settingsQuery.data ?? null) as WorkspaceSettings | null
  const settingsAccounts = useMemo(() => normalizedBalanceAccounts(settings), [settings])
  const balance = balanceQuery.data ?? null
  const accounts = balance?.accounts ?? []
  const activeAccounts = accounts.filter((account) => !account.archived && !account.closedAt)
  const selectedAccount = selectedAccountId ? accounts.find((account) => account.accountId === selectedAccountId) ?? null : null
  const rows = useMemo(() => (balance?.ledgerRows ?? []).slice().sort(sortRowsDesc), [balance?.ledgerRows])
  const loading = settingsQuery.isFetching || balanceQuery.isFetching
  const error =
    settingsQuery.error instanceof Error
      ? settingsQuery.error.message
      : balanceQuery.error instanceof Error
        ? balanceQuery.error.message
        : settingsQuery.error
          ? String(settingsQuery.error)
          : balanceQuery.error
            ? String(balanceQuery.error)
            : null

  const yearOptions = useMemo(() => {
    const current = Number(currentYear())
    const years: string[] = []
    for (let y = current + 1; y >= current - 10; y -= 1) years.push(String(y))
    return years
  }, [])

  const refreshBalance = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.balanceAll(props.workspaceId) })
  }

  const saveSettingsAccounts = async (nextAccounts: BalanceAccount[]) => {
    if (!settings) return
    setAccountError(null)
    const saved = await props.api.putWorkspaceSettings(props.workspaceId, {
      ...settings,
      balanceAccounts: nextAccounts,
    })
    queryClient.setQueryData(queryKeys.workspaceSettings(props.workspaceId), saved)
    queryClient.invalidateQueries({ queryKey: queryKeys.workspaceSettings(props.workspaceId) })
    refreshBalance()
  }

  const upsertAccount = async (input: { name: string; kind: BalanceAccountKind; openingBalance: number; openingDate: string }) => {
    const existing = settingsAccounts
    if (accountDialog?.mode === 'rename' && accountDialog.account) {
      await saveSettingsAccounts(
        existing.map((account) => (account.accountId === accountDialog.account?.accountId ? { ...account, name: input.name } : account)),
      )
      return
    }
    const accountId = stableAccountId(input.kind, input.name, new Set(existing.map((account) => account.accountId)))
    await saveSettingsAccounts([
      ...existing,
      {
        accountId,
        kind: input.kind,
        name: input.name,
        openingBalance: input.openingBalance,
        openingDate: input.openingDate,
        archivedAt: null,
        closedAt: null,
      },
    ])
    setSelectedAccountId(accountId)
  }

  const confirmAccountAction = async () => {
    if (!confirmAccount) return
    setAccountSubmitting(true)
    setAccountError(null)
    try {
      const today = todayIso()
      await saveSettingsAccounts(
        settingsAccounts.map((account) => {
          if (account.accountId !== confirmAccount.account.accountId) return account
          if (confirmAccount.action === 'archive') return { ...account, archivedAt: account.archivedAt ?? today }
          return { ...account, archivedAt: account.archivedAt ?? today, closedAt: account.closedAt ?? today }
        }),
      )
      if (selectedAccountId === confirmAccount.account.accountId && confirmAccount.action === 'close') setSelectedAccountId(null)
      setConfirmAccount(null)
    } catch (e) {
      setAccountError(e instanceof Error ? e.message : String(e))
    } finally {
      setAccountSubmitting(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    setDeleteSubmitting(true)
    try {
      await props.api.deleteRecord(props.workspaceId, 'TRANSFER', deleteTarget.eventDate, deleteTarget.recordId)
      refreshBalance()
      queryClient.invalidateQueries({ queryKey: queryKeys.recordsByYearRecordType(props.workspaceId, 'TRANSFER') })
      setDeleteTarget(null)
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : String(e))
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const colSpan = props.readOnly ? 7 : 8

  return (
    <Stack spacing={2}>
      <PageHeader
        title={t('transfers.title')}
        right={
          props.readOnly ? null : (
            <ResponsiveActionRow>
              <Button variant="outlined" onClick={() => setAccountDialog({ mode: 'create' })}>
                {t('balanceAccounts.create')}
              </Button>
              <Button variant="contained" component={RouterLink} to={`/workspaces/${props.workspaceId}/balance/new`}>
                {t('transfers.add')}
              </Button>
            </ResponsiveActionRow>
          )
        }
      />

      <Paper
        variant="outlined"
        sx={(theme) => ({
          p: { xs: 2, md: 2.5 },
          borderColor: alpha(theme.palette.divider, 0.8),
          background:
            theme.palette.mode === 'dark'
              ? `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.88)} 0%, ${alpha(theme.palette.background.paper, 0.62)} 100%)`
              : `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.035)} 100%)`,
        })}
      >
        <Stack spacing={2.25}>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems={{ xs: 'stretch', lg: 'flex-start' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
              <FormControl sx={{ minWidth: { xs: '100%', sm: 130 } }}>
                <InputLabel id="transfers-year-label">{t('common.year')}</InputLabel>
                <Select
                  labelId="transfers-year-label"
                  label={t('common.year')}
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  size="small"
                  sx={{ borderRadius: 1.5 }}
                >
                  {yearOptions.map((y) => (
                    <MenuItem key={y} value={y}>
                      {y}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: { xs: '100%', sm: 260 } }}>
                <InputLabel id="balance-account-label">{t('balanceAccounts.selector')}</InputLabel>
                <Select
                  labelId="balance-account-label"
                  label={t('balanceAccounts.selector')}
                  value={selectedAccountId ?? 'all'}
                  onChange={(e) => setSelectedAccountId(e.target.value === 'all' ? null : e.target.value)}
                  size="small"
                  sx={{ borderRadius: 1.5 }}
                >
                  <MenuItem value="all">{t('balanceAccounts.allAccounts')}</MenuItem>
                  {accounts.map((account) => (
                    <MenuItem key={account.accountId} value={account.accountId}>
                      {account.name}
                      {account.archived ? ` (${t('balanceAccounts.archived')})` : ''}
                      {account.closedAt ? ` (${t('balanceAccounts.closed')})` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ alignItems: { xs: 'stretch', sm: 'flex-start' }, justifyContent: 'flex-end' }}
            >
              <Stack
                spacing={0.25}
                sx={{
                  minWidth: { xs: 'auto', sm: 210 },
                  textAlign: { xs: 'left', sm: 'right' },
                }}
              >
                <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                  {t('balanceAccounts.totalBalance')}
                </Typography>
                <Typography variant="h4" sx={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                  {balance ? currency.format(balance.totalCurrentBalance) : t('common.na')}
                </Typography>
                {selectedAccount ? (
                  <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {t('balanceAccounts.selectedBalance', { account: selectedAccount.name })}: {currency.format(selectedAccount.currentBalance)}
                  </Typography>
                ) : null}
              </Stack>
              <Button variant="text" onClick={refreshBalance} disabled={loading} sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}>
                {t('common.refresh')}
              </Button>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1.25} useFlexGap flexWrap="wrap">
            {accounts.map((account) => {
              const fullAccount = settingsAccounts.find((candidate) => candidate.accountId === account.accountId) ?? null
              const isSelected = selectedAccountId === account.accountId
              return (
                <Paper
                  key={account.accountId}
                  variant="outlined"
                  onClick={() => setSelectedAccountId(account.accountId)}
                  sx={(theme) => ({
                    p: 1.5,
                    width: { xs: '100%', sm: 248 },
                    minHeight: 124,
                    cursor: 'pointer',
                    borderRadius: 2,
                    borderColor: isSelected ? alpha(theme.palette.primary.main, 0.75) : alpha(theme.palette.divider, 0.72),
                    backgroundColor: isSelected ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.08) : 'transparent',
                    transition: theme.transitions.create(['border-color', 'background-color', 'transform'], {
                      duration: theme.transitions.duration.shortest,
                    }),
                    '&:hover': {
                      borderColor: alpha(theme.palette.primary.main, 0.7),
                      backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.1 : 0.055),
                      transform: 'translateY(-1px)',
                    },
                  })}
                >
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
                      <Stack spacing={0.5}>
                        <Typography variant="subtitle1" noWrap title={account.name} sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                          {account.name}
                        </Typography>
                        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                          <Chip size="small" label={t(`balanceAccounts.kinds.${account.kind}`)} variant={isSelected ? 'filled' : 'outlined'} />
                          {account.archived ? <Chip size="small" label={t('balanceAccounts.archived')} variant="outlined" /> : null}
                          {account.closedAt ? <Chip size="small" label={t('balanceAccounts.closed')} color="warning" variant="outlined" /> : null}
                        </Stack>
                      </Stack>
                      <Typography variant="h6" sx={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                        {currency.format(account.currentBalance)}
                      </Typography>
                    </Stack>
                    {props.readOnly || !fullAccount ? null : (
                      <Stack onClick={(e) => e.stopPropagation()} sx={{ mt: -0.5, mr: -0.5 }}>
                        <MoreActionsMenu
                          onEdit={() => setAccountDialog({ mode: 'rename', account: fullAccount })}
                          onDelete={
                            account.accountId === 'main'
                              ? undefined
                              : () => setConfirmAccount({ account: fullAccount, action: account.archived ? 'close' : 'archive' })
                          }
                          deleteLabel={account.archived ? t('balanceAccounts.close') : t('balanceAccounts.archive')}
                        />
                      </Stack>
                    )}
                  </Stack>
                </Paper>
              )
            })}
          </Stack>
        </Stack>
      </Paper>

      {loading ? <LinearProgress /> : null}
      {error ? <ErrorAlert message={error} /> : null}
      {deleteError ? <ErrorAlert message={deleteError} /> : null}
      {accountError ? <Alert severity="warning">{accountError}</Alert> : null}

      <ResponsiveDataView
        tableLabel={t('transfers.title')}
        cardsLabel={t('transfers.title')}
        table={
          <Paper variant="outlined">
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('records.eventDate')}</TableCell>
                    <TableCell>{t('balanceAccounts.account')}</TableCell>
                    <TableCell>{t('records.operation')}</TableCell>
                    <TableCell align="right">{t('records.amount')}</TableCell>
                    <TableCell align="right">{t('balanceAccounts.impact')}</TableCell>
                    <TableCell>{t('records.note')}</TableCell>
                    <TableCell align="right">{selectedAccountId ? t('records.balance') : t('balanceAccounts.totalBalance')}</TableCell>
                    {props.readOnly ? null : <TableCell align="right">{t('records.actions')}</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.length ? (
                    rows.map((row) => {
                      const accountLabel =
                        row.movementType === 'InternalTransfer'
                          ? `${displayAccountName(accounts, row.fromAccountId)} -> ${displayAccountName(accounts, row.toAccountId)}`
                          : displayAccountName(accounts, row.accountId ?? 'main')
                      const operation =
                        row.movementType === 'InternalTransfer'
                          ? t('transfersCreate.modes.internal')
                          : row.operation
                            ? t(`transfersCreate.operations.${row.operation}`)
                            : t('common.na')
                      const impact = selectedAccountId ? row.selectedAccountImpact : row.totalBalanceImpact
                      const running = selectedAccountId ? row.selectedAccountRunningBalance : row.totalRunningBalance
                      return (
                        <TableRow key={row.recordKey} hover>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.eventDate}</TableCell>
                          <TableCell>{accountLabel}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{operation}</TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                            {money.format(row.amount)}
                          </TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                            {impact == null ? t('common.na') : money.format(impact)}
                          </TableCell>
                          <TableCell sx={{ maxWidth: 320 }} title={row.note ?? undefined}>
                            {row.note ?? t('common.na')}
                          </TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                            {running == null ? t('common.na') : money.format(running)}
                          </TableCell>
                          {props.readOnly ? null : (
                            <TableCell align="right" padding="checkbox">
                              <MoreActionsMenu
                                onEdit={() => navigate(`/workspaces/${props.workspaceId}/balance/${row.eventDate}/${row.recordId}/edit`)}
                                onDelete={() => setDeleteTarget(row)}
                              />
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })
                  ) : balance ? (
                    <TableRow>
                      <TableCell colSpan={colSpan}>
                        <Typography color="text.secondary">{t('transfers.empty', { year })}</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={colSpan}>
                        <Typography color="text.secondary">{t('common.loading')}</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        }
        cards={
          <Stack spacing={1}>
            {rows.length ? (
              rows.map((row) => {
                const accountLabel =
                  row.movementType === 'InternalTransfer'
                    ? `${displayAccountName(accounts, row.fromAccountId)} -> ${displayAccountName(accounts, row.toAccountId)}`
                    : displayAccountName(accounts, row.accountId ?? 'main')
                const operation =
                  row.movementType === 'InternalTransfer'
                    ? t('transfersCreate.modes.internal')
                    : row.operation
                      ? t(`transfersCreate.operations.${row.operation}`)
                      : t('common.na')
                const impact = selectedAccountId ? row.selectedAccountImpact : row.totalBalanceImpact
                const running = selectedAccountId ? row.selectedAccountRunningBalance : row.totalRunningBalance
                return (
                  <MobileRecordCard
                    key={row.recordKey}
                    title={row.eventDate}
                    subtitle={accountLabel}
                    amount={money.format(row.amount)}
                    facts={[
                      { label: t('records.operation'), value: operation },
                      { label: t('balanceAccounts.impact'), value: impact == null ? t('common.na') : money.format(impact) },
                      {
                        label: selectedAccountId ? t('records.balance') : t('balanceAccounts.totalBalance'),
                        value: running == null ? t('common.na') : money.format(running),
                      },
                    ]}
                    details={[
                      { label: t('records.note'), value: row.note ?? t('common.na') },
                      { label: t('balanceAccounts.account'), value: accountLabel },
                    ]}
                    actions={
                      props.readOnly ? null : (
                        <MoreActionsMenu
                          onEdit={() => navigate(`/workspaces/${props.workspaceId}/balance/${row.eventDate}/${row.recordId}/edit`)}
                          onDelete={() => setDeleteTarget(row)}
                        />
                      )
                    }
                    expanded={expandedRecordKey === row.recordKey}
                    onToggleExpanded={() => setExpandedRecordKey((current) => (current === row.recordKey ? null : row.recordKey))}
                    expandLabel={t('common.more')}
                  />
                )
              })
            ) : balance ? (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography color="text.secondary">{t('transfers.empty', { year })}</Typography>
              </Paper>
            ) : (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography color="text.secondary">{t('common.loading')}</Typography>
              </Paper>
            )}
          </Stack>
        }
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('records.deleteConfirmTitle', { record: deleteTarget?.recordId ?? '' })}
        description={t('records.deleteConfirmBody')}
        confirmColor="error"
        loading={deleteSubmitting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
      <ConfirmDialog
        open={Boolean(confirmAccount)}
        title={
          confirmAccount?.action === 'close'
            ? t('balanceAccounts.closeTitle', { account: confirmAccount.account.name })
            : t('balanceAccounts.archiveTitle', { account: confirmAccount?.account.name ?? '' })
        }
        description={confirmAccount?.action === 'close' ? t('balanceAccounts.closeDescription') : t('balanceAccounts.archiveDescription')}
        confirmColor={confirmAccount?.action === 'close' ? 'error' : 'primary'}
        loading={accountSubmitting}
        onClose={() => setConfirmAccount(null)}
        onConfirm={confirmAccountAction}
      />
      <AccountDialog
        open={Boolean(accountDialog)}
        mode={accountDialog?.mode ?? 'create'}
        account={accountDialog?.account ?? null}
        onClose={() => setAccountDialog(null)}
        onSubmit={upsertAccount}
      />
      {props.readOnly || activeAccounts.length ? null : <Alert severity="warning">{t('balanceAccounts.noActiveAccounts')}</Alert>}
    </Stack>
  )
}
