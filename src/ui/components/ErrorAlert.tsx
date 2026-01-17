import { Alert } from '@mui/material'

export function ErrorAlert(props: { message: string }) {
  return (
    <Alert severity="error" sx={{ whiteSpace: 'pre-wrap' }}>
      {props.message}
    </Alert>
  )
}
