import { Box, Paper, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { ReactNode } from 'react'

export function PageHeader(props: { title: string; description?: string; right?: ReactNode }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 1.75, sm: 0 },
        borderRadius: { xs: 2.25, sm: 0 },
        borderColor: { xs: (theme) => alpha(theme.palette.divider, 0.72), sm: 'transparent' },
        bgcolor: { xs: 'background.paper', sm: 'transparent' },
        boxShadow: { xs: (theme) => `0 10px 24px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.22 : 0.05)}`, sm: 'none' },
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 1.5, sm: 2 }}
        alignItems={{ xs: 'stretch', sm: 'flex-start' }}
        justifyContent="space-between"
        sx={{ minWidth: 0 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" sx={{ fontSize: { xs: '1.125rem', sm: '1.5rem' }, fontWeight: 800, lineHeight: 1.2 }}>
            {props.title}
          </Typography>
          {props.description ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.45 }}>
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
              '& .MuiButton-root': {
                minHeight: { xs: 44, sm: 36 },
              },
            }}
          >
            {props.right}
          </Box>
        ) : null}
      </Stack>
    </Paper>
  )
}
