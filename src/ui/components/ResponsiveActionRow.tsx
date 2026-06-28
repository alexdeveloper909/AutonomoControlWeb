import { Stack } from '@mui/material'
import type { PropsWithChildren } from 'react'

export function ResponsiveActionRow(props: PropsWithChildren<{ align?: 'start' | 'end' | 'space-between' }>) {
  const justifyContent =
    props.align === 'space-between' ? 'space-between' : props.align === 'start' ? 'flex-start' : 'flex-end'

  return (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      sx={{
        flexWrap: 'wrap',
        justifyContent: { xs: 'flex-start', sm: justifyContent },
        '& > .MuiButton-root': { minHeight: 44 },
        '& > *': { flex: { xs: '1 1 100%', sm: '0 0 auto' } },
      }}
    >
      {props.children}
    </Stack>
  )
}
