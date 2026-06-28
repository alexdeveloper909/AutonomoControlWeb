import { Box, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'

export function PageHeader(props: { title: string; description?: string; right?: ReactNode }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      alignItems={{ xs: 'stretch', sm: 'flex-start' }}
      justifyContent="space-between"
      sx={{ minWidth: 0 }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h5">{props.title}</Typography>
        {props.description ? (
          <Typography variant="body2" color="text.secondary">
            {props.description}
          </Typography>
        ) : null}
      </Box>
      {props.right ? (
        <Box
          sx={{
            flexShrink: 0,
            width: { xs: '100%', sm: 'auto' },
            '& > .MuiStack-root': {
              flexWrap: 'wrap',
              gap: 1,
            },
          }}
        >
          {props.right}
        </Box>
      ) : null}
    </Stack>
  )
}
