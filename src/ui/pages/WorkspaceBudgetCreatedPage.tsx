import { Alert, Button, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import type { RecordResponse } from '../../domain/records'
import { PageHeader } from '../components/PageHeader'
import { useTranslation } from 'react-i18next'

type LocationState = { record?: RecordResponse }

export function WorkspaceBudgetCreatedPage(props: { workspaceId: string }) {
  const { t } = useTranslation()
  const location = useLocation()
  const record = (location.state as LocationState | null)?.record

  return (
    <Stack spacing={2}>
      <PageHeader title={t('budgetCreated.title')} />

      <Alert severity="success">{t('budgetCreated.success')}</Alert>

      {record ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={0.5}>
            <Typography variant="subtitle2">{t('records.record')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('budgetCreated.recordType', { value: record.recordType })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('budgetCreated.eventDate', { value: record.eventDate })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('budgetCreated.recordId', { value: record.recordId })}
            </Typography>
          </Stack>
        </Paper>
      ) : null}

      <Stack direction="row" spacing={2}>
        <Button variant="contained" component={RouterLink} to={`/workspaces/${props.workspaceId}/budget`}>
          {t('budgetCreated.backTo')}
        </Button>
        <Button variant="text" component={RouterLink} to={`/workspaces/${props.workspaceId}/budget/new`}>
          {t('budgetCreated.addAnother')}
        </Button>
      </Stack>
    </Stack>
  )
}
