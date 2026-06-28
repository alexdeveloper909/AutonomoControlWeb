import { Box } from '@mui/material'
import type { ReactNode } from 'react'

export function ResponsiveDataView(props: {
  table: ReactNode
  cards: ReactNode
  tableLabel?: string
  cardsLabel?: string
}) {
  return (
    <>
      <Box aria-label={props.cardsLabel} sx={{ display: { xs: 'block', sm: 'none' } }}>
        {props.cards}
      </Box>
      <Box
        aria-label={props.tableLabel}
        sx={{
          display: { xs: 'none', sm: 'block' },
          maxWidth: '100%',
          overflowX: 'auto',
        }}
      >
        {props.table}
      </Box>
    </>
  )
}
