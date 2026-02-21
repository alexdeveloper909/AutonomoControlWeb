import { Alert, Button, Paper, Stack, Typography } from '@mui/material'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import type { RecordResponse } from '../../domain/records'
import { PageHeader } from '../components/PageHeader'
import { useTranslation } from 'react-i18next'

type LocationState = { record?: RecordResponse }

export function WorkspaceRegularSpendingsCreatedPage(props: { workspaceId: string }) {
  const { t } = useTranslation()
  const location = useLocation()
  const record = (location.state as LocationState | null)?.record

  return (
    <Stack spacing={2}>
      <PageHeader title={t('regularSpendingsCreated.title')} />

      <Alert severity="success">{t('regularSpendingsCreated.success')}</Alert>

      {record ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={0.5}>
            <Typography variant="subtitle2">{t('records.record')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('regularSpendingsCreated.recordType', { value: record.recordType })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('regularSpendingsCreated.eventDate', { value: record.eventDate })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('regularSpendingsCreated.recordId', { value: record.recordId })}
            </Typography>
          </Stack>
        </Paper>
      ) : null}

      <Stack direction="row" spacing={2}>
        <Button variant="contained" component={RouterLink} to={`/workspaces/${props.workspaceId}/regular-spendings`}>
          {t('regularSpendingsCreated.backTo')}
        </Button>
        <Button variant="text" component={RouterLink} to={`/workspaces/${props.workspaceId}/regular-spendings/new`}>
          {t('regularSpendingsCreated.addAnother')}
        </Button>
      </Stack>
    </Stack>
  )
}
