import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material'
import { useTranslation } from 'react-i18next'

export function ConfirmDialog(props: {
  open: boolean
  title: string
  description?: string | null
  confirmText?: string
  cancelText?: string
  confirmColor?: 'primary' | 'error'
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()

  return (
    <Dialog open={props.open} onClose={props.loading ? undefined : props.onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{props.title}</DialogTitle>
      {props.description ? (
        <DialogContent>
          <DialogContentText>{props.description}</DialogContentText>
        </DialogContent>
      ) : null}
      <DialogActions>
        <Button onClick={props.onClose} disabled={props.loading}>
          {props.cancelText ?? t('common.cancel')}
        </Button>
        <Button onClick={props.onConfirm} color={props.confirmColor ?? 'primary'} variant="contained" disabled={props.loading}>
          {props.confirmText ?? t('common.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

