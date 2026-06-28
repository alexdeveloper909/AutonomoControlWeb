import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { Box, Card, CardContent, Collapse, IconButton, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'

export type MobileRecordFact = {
  label: string
  value: ReactNode
}

export function MobileRecordCard(props: {
  title: ReactNode
  subtitle?: ReactNode
  amount?: ReactNode
  facts: MobileRecordFact[]
  details?: MobileRecordFact[]
  actions?: ReactNode
  expanded?: boolean
  onToggleExpanded?: () => void
  expandLabel: string
}) {
  const hasDetails = Boolean(props.details?.length)

  return (
    <Card variant="outlined" sx={{ borderRadius: 1 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1.25}>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="subtitle2" sx={{ overflowWrap: 'anywhere' }}>
                {props.title}
              </Typography>
              {props.subtitle ? (
                <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                  {props.subtitle}
                </Typography>
              ) : null}
            </Box>
            {props.amount ? (
              <Typography variant="subtitle2" sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                {props.amount}
              </Typography>
            ) : null}
            {props.actions}
          </Stack>

          <Stack spacing={0.75}>
            {props.facts.map((fact) => (
              <Stack key={fact.label} direction="row" spacing={1} justifyContent="space-between" alignItems="baseline">
                <Typography variant="caption" color="text.secondary">
                  {fact.label}
                </Typography>
                <Typography variant="body2" align="right" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                  {fact.value}
                </Typography>
              </Stack>
            ))}
          </Stack>

          {hasDetails ? (
            <>
              <Box>
                <IconButton
                  aria-label={props.expandLabel}
                  onClick={props.onToggleExpanded}
                  size="small"
                  sx={{
                    minWidth: 44,
                    minHeight: 44,
                    transform: props.expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: (theme) => theme.transitions.create('transform'),
                  }}
                >
                  <ExpandMoreIcon fontSize="small" />
                </IconButton>
              </Box>
              <Collapse in={props.expanded} timeout="auto" unmountOnExit>
                <Stack spacing={0.75}>
                  {props.details?.map((fact) => (
                    <Stack key={fact.label} direction="row" spacing={1} justifyContent="space-between" alignItems="baseline">
                      <Typography variant="caption" color="text.secondary">
                        {fact.label}
                      </Typography>
                      <Typography variant="body2" align="right" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                        {fact.value}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Collapse>
            </>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  )
}
