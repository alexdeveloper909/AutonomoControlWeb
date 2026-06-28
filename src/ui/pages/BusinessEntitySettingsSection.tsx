import { Alert, Button, Checkbox, Chip, Divider, FormControlLabel, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { AutonomoControlApi } from '../../infrastructure/api/autonomoControlApi'
import type { BusinessEntity, BusinessEntityCurrency, BusinessEntitySocialContributionYear } from '../../domain/settings'
import { queryKeys } from '../queries/queryKeys'
import { ErrorAlert } from '../components/ErrorAlert'
import type { RecordResponse } from '../../domain/records'

const currentYear = (): number => new Date().getFullYear()
const monthKeys = (year: number): string[] => Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`)
const yearSocialContribution = (year: number, monthlyAmount: number, enabled: boolean): BusinessEntitySocialContributionYear => ({
  enabled,
  monthlyAmountsUah: Object.fromEntries(monthKeys(year).map((month) => [month, monthlyAmount])),
  exemptionReason: enabled ? null : 'DISABILITY',
})

const entityMutablePayload = (entity: BusinessEntity): BusinessEntity => ({
  ...entity,
  taxCurrency: entity.taxCurrency ?? 'UAH',
  invoiceCurrencies: entity.invoiceCurrencies?.length ? entity.invoiceCurrencies : ['USD', 'UAH'],
  taxRatesByYear: entity.taxRatesByYear ?? {},
  socialContribution: entity.socialContribution ?? { byYear: {} },
})

const invoiceCurrencyFromRecord = (record: RecordResponse): BusinessEntityCurrency | null => {
  const payload = record.payload
  if (!payload || typeof payload !== 'object') return null
  const currency = (payload as Record<string, unknown>).currency
  return currency === 'USD' || currency === 'UAH' ? currency : null
}

export function BusinessEntitySettingsSection(props: {
  workspaceId: string
  api: AutonomoControlApi
  readOnly: boolean
}) {
  const queryClient = useQueryClient()
  const [entities, setEntities] = useState<BusinessEntity[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [name, setName] = useState('Ukrainian FOP')
  const [currencies, setCurrencies] = useState<BusinessEntityCurrency[]>(['USD', 'UAH'])
  const [year, setYear] = useState(currentYear())
  const [singleTaxRate, setSingleTaxRate] = useState(0.05)
  const [militaryLevyRate, setMilitaryLevyRate] = useState(0.01)
  const [socialEnabled, setSocialEnabled] = useState(true)
  const [monthlySocial, setMonthlySocial] = useState(1902.34)

  const [selectedEntityId, setSelectedEntityId] = useState('')
  const [editYear, setEditYear] = useState(currentYear())
  const [editSingleTaxRate, setEditSingleTaxRate] = useState(0.05)
  const [editMilitaryLevyRate, setEditMilitaryLevyRate] = useState(0.01)
  const [editSocialEnabled, setEditSocialEnabled] = useState(true)
  const [editMonthlySocial, setEditMonthlySocial] = useState(1902.34)
  const [editCurrencies, setEditCurrencies] = useState<BusinessEntityCurrency[]>(['USD', 'UAH'])
  const [lockedCurrencies, setLockedCurrencies] = useState<BusinessEntityCurrency[]>([])

  const activeUserEntities = useMemo(
    () => entities.filter((entity) => entity.entityId !== 'autonomo' && !entity.archivedAt),
    [entities],
  )
  const archivedUserEntities = useMemo(
    () => entities.filter((entity) => entity.entityId !== 'autonomo' && Boolean(entity.archivedAt)),
    [entities],
  )
  const selectedEntity = useMemo(
    () => entities.find((entity) => entity.entityId === selectedEntityId) ?? activeUserEntities[0] ?? null,
    [activeUserEntities, entities, selectedEntityId],
  )

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const next = await props.api.listBusinessEntities(props.workspaceId, showArchived)
      setEntities(next)
      queryClient.setQueryData(queryKeys.businessEntities(props.workspaceId, showArchived), next)
      if (!selectedEntityId) setSelectedEntityId(next.find((entity) => entity.entityId !== 'autonomo' && !entity.archivedAt)?.entityId ?? '')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.workspaceId, showArchived])

  useEffect(() => {
    if (!selectedEntity) return
    const selectedYear = String(editYear)
    const rates = selectedEntity.taxRatesByYear?.[selectedYear]
    const social = selectedEntity.socialContribution?.byYear?.[selectedYear]
    setEditCurrencies((selectedEntity.invoiceCurrencies?.filter((currency): currency is BusinessEntityCurrency => currency === 'USD' || currency === 'UAH') ?? ['USD', 'UAH']))
    setEditSingleTaxRate(rates?.singleTaxRate ?? 0.05)
    setEditMilitaryLevyRate(rates?.militaryLevyRate ?? 0.01)
    setEditSocialEnabled(social?.enabled ?? true)
    setEditMonthlySocial(social ? social.monthlyAmountsUah[`${selectedYear}-01`] ?? 0 : 1902.34)
  }, [editYear, selectedEntity])

  useEffect(() => {
    if (!selectedEntity || selectedEntity.entityId === 'autonomo') {
      setLockedCurrencies([])
      return
    }
    let cancelled = false
    const loadCurrencies = async () => {
      const years = new Set<string>()
      const now = currentYear()
      for (let y = now + 1; y >= now - 10; y -= 1) years.add(String(y))
      Object.keys(selectedEntity.taxRatesByYear ?? {}).forEach((y) => years.add(y))
      Object.keys(selectedEntity.socialContribution?.byYear ?? {}).forEach((y) => years.add(y))

      const next = new Set<BusinessEntityCurrency>()
      for (const y of years) {
        let nextToken: string | null = null
        do {
          const page = await props.api.listInvoiceRecordsByEntityYear(props.workspaceId, selectedEntity.entityId, y, {
            limit: 100,
            nextToken,
          })
          page.items.map(invoiceCurrencyFromRecord).forEach((currency) => {
            if (currency) next.add(currency)
          })
          nextToken = page.nextToken ?? null
        } while (nextToken)
      }
      if (!cancelled) setLockedCurrencies(Array.from(next))
    }
    void loadCurrencies().catch((e) => {
      if (!cancelled) setError(e instanceof Error ? e.message : String(e))
    })
    return () => {
      cancelled = true
    }
  }, [props.api, props.workspaceId, selectedEntity])

  const hasDuplicateActiveName = (candidate: string): boolean =>
    activeUserEntities.some((entity) => entity.name.trim().toLowerCase() === candidate.trim().toLowerCase())

  const createEntity = async () => {
    setError(null)
    setSuccess(null)
    if (!name.trim()) {
      setError('Entity name is required.')
      return
    }
    if (hasDuplicateActiveName(name)) {
      setError('An active business entity with this name already exists.')
      return
    }
    setSaving(true)
    try {
      const y = String(year)
      await props.api.createBusinessEntity(props.workspaceId, {
        type: 'UKRAINIAN_FOP_GROUP3_SIMPLIFIED',
        name: name.trim(),
        taxCurrency: 'UAH',
        invoiceCurrencies: currencies.includes('USD') ? currencies : ['USD', ...currencies],
        taxRatesByYear: { [y]: { singleTaxRate, militaryLevyRate } },
        socialContribution: { byYear: { [y]: yearSocialContribution(year, monthlySocial, socialEnabled) } },
      })
      setSuccess('Business entity created.')
      queryClient.invalidateQueries({ queryKey: queryKeys.businessEntitiesAll(props.workspaceId) })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const saveYearSettings = async () => {
    if (!selectedEntity) return
    setError(null)
    setSuccess(null)
    setSaving(true)
    try {
      const invoices = await props.api.listInvoiceRecordsByEntityYear(props.workspaceId, selectedEntity.entityId, String(editYear), { limit: 1 })
      if (invoices.items.length && !window.confirm('This entity already has invoices for this year. Saving will change historical summaries. Continue?')) return
      const removedLockedCurrency = lockedCurrencies.find((currency) => !editCurrencies.includes(currency))
      if (removedLockedCurrency) {
        setError(`Cannot remove ${removedLockedCurrency}; existing invoices use that currency.`)
        return
      }
      const payload = {
        ...entityMutablePayload(selectedEntity),
        confirmHistoricalSummaryChange: invoices.items.length > 0,
      }
      payload.invoiceCurrencies = editCurrencies.includes('USD') ? editCurrencies : ['USD', ...editCurrencies]
      payload.taxRatesByYear = {
        ...(payload.taxRatesByYear ?? {}),
        [String(editYear)]: { singleTaxRate: editSingleTaxRate, militaryLevyRate: editMilitaryLevyRate },
      }
      payload.socialContribution = {
        byYear: {
          ...(payload.socialContribution?.byYear ?? {}),
          [String(editYear)]: yearSocialContribution(editYear, editMonthlySocial, editSocialEnabled),
        },
      }
      await props.api.updateBusinessEntity(props.workspaceId, selectedEntity.entityId, payload)
      setSuccess('Business entity settings saved.')
      queryClient.invalidateQueries({ queryKey: queryKeys.businessEntitiesAll(props.workspaceId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.entitySummariesAll(props.workspaceId, selectedEntity.entityId) })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const archiveEntity = async (entity: BusinessEntity) => {
    if (!window.confirm(`Archive ${entity.name}? Existing invoices and summaries stay readable.`)) return
    setError(null)
    setSuccess(null)
    setSaving(true)
    try {
      await props.api.archiveBusinessEntity(props.workspaceId, entity.entityId)
      setSuccess('Business entity archived.')
      queryClient.invalidateQueries({ queryKey: queryKeys.businessEntitiesAll(props.workspaceId) })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const toggleCurrency = (value: BusinessEntityCurrency, checked: boolean, setter: (next: BusinessEntityCurrency[]) => void, current: BusinessEntityCurrency[]) => {
    const next = checked ? Array.from(new Set([...current, value])) : current.filter((currency) => currency !== value)
    setter(next.includes('USD') ? next : ['USD', ...next])
  }

  return (
    <Stack spacing={2}>
      <Divider />
      <Typography variant="subtitle2">Business entities</Typography>
      <Typography variant="body2" color="text.secondary">
        Manage Ukrainian FOP entities. The built-in Autonomo flow is always available and is not stored in workspace settings.
      </Typography>
      {error ? <ErrorAlert message={error} /> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        {activeUserEntities.map((entity) => (
          <Chip
            key={entity.entityId}
            label={entity.name}
            color={selectedEntity?.entityId === entity.entityId ? 'primary' : 'default'}
            onClick={() => setSelectedEntityId(entity.entityId)}
          />
        ))}
        {!activeUserEntities.length && !loading ? <Typography color="text.secondary">No additional business entities yet.</Typography> : null}
        <Button size="small" onClick={refresh} disabled={loading || saving} sx={{ minHeight: 44 }}>
          Refresh
        </Button>
        <FormControlLabel control={<Checkbox checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />} label="Show archived" />
      </Stack>

      {showArchived && archivedUserEntities.length ? (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {archivedUserEntities.map((entity) => (
            <Chip key={entity.entityId} label={`${entity.name} (archived)`} variant="outlined" />
          ))}
        </Stack>
      ) : null}

      {!props.readOnly ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Typography variant="subtitle2">Create Ukrainian FOP</Typography>
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth disabled={saving} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Initial configuration year" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} fullWidth />
              <TextField label="Single tax rate" type="number" inputProps={{ step: '0.01', min: 0, max: 1 }} value={singleTaxRate} onChange={(e) => setSingleTaxRate(Number(e.target.value))} fullWidth />
              <TextField label="Military levy rate" type="number" inputProps={{ step: '0.01', min: 0, max: 1 }} value={militaryLevyRate} onChange={(e) => setMilitaryLevyRate(Number(e.target.value))} fullWidth />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              {(['USD', 'UAH'] as const).map((currency) => (
                <FormControlLabel key={currency} control={<Checkbox checked={currencies.includes(currency)} onChange={(e) => toggleCurrency(currency, e.target.checked, setCurrencies, currencies)} disabled={currency === 'USD'} />} label={currency} />
              ))}
            </Stack>
            <FormControlLabel control={<Checkbox checked={socialEnabled} onChange={(e) => setSocialEnabled(e.target.checked)} />} label="Social contribution enabled" />
            {socialEnabled ? (
              <TextField label="Monthly social contribution (UAH)" type="number" inputProps={{ step: '0.01', min: 0 }} value={monthlySocial} onChange={(e) => setMonthlySocial(Number(e.target.value))} fullWidth />
            ) : (
              <TextField select label="Exemption reason" value="DISABILITY" fullWidth disabled>
                <MenuItem value="DISABILITY">Disability</MenuItem>
              </TextField>
            )}
            <Button variant="contained" onClick={createEntity} disabled={saving || loading} sx={{ minHeight: 44, alignSelf: { xs: 'stretch', sm: 'flex-start' } }}>
              Create business entity
            </Button>
          </Stack>
        </Paper>
      ) : null}

      {selectedEntity ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
              <Typography variant="subtitle2">Year settings: {selectedEntity.name}</Typography>
              {selectedEntity.archivedAt ? <Chip label="Archived" size="small" /> : null}
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Year" type="number" value={editYear} onChange={(e) => setEditYear(Number(e.target.value))} fullWidth disabled={props.readOnly || Boolean(selectedEntity.archivedAt)} />
              <TextField label="Single tax rate" type="number" inputProps={{ step: '0.01', min: 0, max: 1 }} value={editSingleTaxRate} onChange={(e) => setEditSingleTaxRate(Number(e.target.value))} fullWidth disabled={props.readOnly || Boolean(selectedEntity.archivedAt)} />
              <TextField label="Military levy rate" type="number" inputProps={{ step: '0.01', min: 0, max: 1 }} value={editMilitaryLevyRate} onChange={(e) => setEditMilitaryLevyRate(Number(e.target.value))} fullWidth disabled={props.readOnly || Boolean(selectedEntity.archivedAt)} />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              {(['USD', 'UAH'] as const).map((currency) => (
                <FormControlLabel
                  key={currency}
                  control={
                    <Checkbox
                      checked={editCurrencies.includes(currency)}
                      onChange={(e) => toggleCurrency(currency, e.target.checked, setEditCurrencies, editCurrencies)}
                      disabled={props.readOnly || Boolean(selectedEntity.archivedAt) || currency === 'USD' || lockedCurrencies.includes(currency)}
                    />
                  }
                  label={lockedCurrencies.includes(currency) ? `${currency} (used by invoices)` : currency}
                />
              ))}
            </Stack>
            <FormControlLabel control={<Checkbox checked={editSocialEnabled} onChange={(e) => setEditSocialEnabled(e.target.checked)} disabled={props.readOnly || Boolean(selectedEntity.archivedAt)} />} label="Social contribution enabled" />
            {editSocialEnabled ? (
              <TextField label="Monthly social contribution (UAH)" type="number" inputProps={{ step: '0.01', min: 0 }} value={editMonthlySocial} onChange={(e) => setEditMonthlySocial(Number(e.target.value))} fullWidth disabled={props.readOnly || Boolean(selectedEntity.archivedAt)} />
            ) : (
              <TextField select label="Exemption reason" value="DISABILITY" fullWidth disabled>
                <MenuItem value="DISABILITY">Disability</MenuItem>
              </TextField>
            )}
            {!props.readOnly && !selectedEntity.archivedAt ? (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} useFlexGap flexWrap="wrap">
                <Button variant="contained" onClick={saveYearSettings} disabled={saving || loading}>
                  Save year settings
                </Button>
                <Button color="error" variant="outlined" onClick={() => archiveEntity(selectedEntity)} disabled={saving || loading}>
                  Archive entity
                </Button>
              </Stack>
            ) : (
              <Alert severity="info">Archived and read-only entities are visible as history only.</Alert>
            )}
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  )
}
