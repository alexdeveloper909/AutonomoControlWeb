import { Box, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'

export function PageHeader(props: { title: string; description?: string; right?: ReactNode }) {
  return (
    <Stack direction="row" spacing={2} alignItems="flex-start" justifyContent="space-between">
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h5">{props.title}</Typography>
        {props.description ? (
          <Typography variant="body2" color="text.secondary">
            {props.description}
          </Typography>
        ) : null}
      </Box>
      {props.right ? <Box sx={{ flexShrink: 0 }}>{props.right}</Box> : null}
    </Stack>
  )
}

