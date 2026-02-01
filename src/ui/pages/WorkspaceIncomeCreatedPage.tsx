import { Alert, Button, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import type { RecordResponse } from '../../domain/records'
import { PageHeader } from '../components/PageHeader'
import { useTranslation } from 'react-i18next'

type LocationState = { record?: RecordResponse }

export function WorkspaceIncomeCreatedPage(props: { workspaceId: string }) {
  const { t } = useTranslation()
  const location = useLocation()
  const record = (location.state as LocationState | null)?.record

  return (
    <Stack spacing={2}>
      <PageHeader title={t('incomeCreated.title')} />

      <Alert severity="success">{t('incomeCreated.success')}</Alert>

      {record ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={0.5}>
            <Typography variant="subtitle2">{t('records.record')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('incomeCreated.recordType', { value: record.recordType })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('incomeCreated.eventDate', { value: record.eventDate })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('incomeCreated.recordId', { value: record.recordId })}
            </Typography>
          </Stack>
        </Paper>
      ) : null}

      <Stack direction="row" spacing={2}>
        <Button variant="contained" component={RouterLink} to={`/workspaces/${props.workspaceId}/income`}>
          {t('incomeCreated.backTo')}
        </Button>
        <Button variant="text" component={RouterLink} to={`/workspaces/${props.workspaceId}/income/new`}>
          {t('incomeCreated.addAnother')}
        </Button>
      </Stack>
    </Stack>
  )
}
