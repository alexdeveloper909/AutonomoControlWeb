import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { Box, Button, Card, CardContent, Collapse, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
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
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2.25,
        overflow: 'hidden',
        boxShadow: (theme) => `0 10px 24px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.22 : 0.06)}`,
      }}
    >
      <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1.25} alignItems="flex-start">
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="subtitle2" sx={{ overflowWrap: 'anywhere', fontWeight: 800, lineHeight: 1.25 }}>
                {props.title}
              </Typography>
              {props.subtitle ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35, overflowWrap: 'anywhere', lineHeight: 1.35 }}>
                  {props.subtitle}
                </Typography>
              ) : null}
            </Box>
            {props.amount ? (
              <Typography
                variant="subtitle2"
                sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontWeight: 800, lineHeight: 1.25 }}
              >
                {props.amount}
              </Typography>
            ) : null}
            {props.actions}
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 1,
            }}
          >
            {props.facts.map((fact) => (
              <Box
                key={fact.label}
                sx={{
                  minWidth: 0,
                  p: 1.25,
                  border: 1,
                  borderColor: (theme) => alpha(theme.palette.divider, 0.72),
                  borderRadius: 1.75,
                  bgcolor: (theme) => alpha(theme.palette.background.default, theme.palette.mode === 'dark' ? 0.32 : 0.74),
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}
                >
                  {fact.label}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.55, minWidth: 0, overflowWrap: 'anywhere', lineHeight: 1.3 }}>
                  {fact.value}
                </Typography>
              </Box>
            ))}
          </Box>

          {hasDetails ? (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  aria-expanded={Boolean(props.expanded)}
                  onClick={props.onToggleExpanded}
                  size="small"
                  endIcon={<ExpandMoreIcon fontSize="small" />}
                  sx={{
                    minWidth: 44,
                    minHeight: 44,
                    borderRadius: 1.75,
                    fontWeight: 800,
                    '& .MuiButton-endIcon': {
                      transform: props.expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: (theme) => theme.transitions.create('transform'),
                    },
                  }}
                >
                  {props.expandLabel}
                </Button>
              </Box>
              <Collapse in={props.expanded} timeout="auto" unmountOnExit>
                <Box
                  sx={{
                    display: 'grid',
                    gap: 1,
                    pt: 0.25,
                  }}
                >
                  {props.details?.map((fact) => (
                    <Box
                      key={fact.label}
                      sx={{
                        minWidth: 0,
                        p: 1.25,
                        border: 1,
                        borderColor: (theme) => alpha(theme.palette.divider, 0.72),
                        borderRadius: 1.75,
                        bgcolor: (theme) => alpha(theme.palette.background.default, theme.palette.mode === 'dark' ? 0.24 : 0.6),
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}
                      >
                        {fact.label}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.55, minWidth: 0, overflowWrap: 'anywhere', lineHeight: 1.35 }}>
                        {fact.value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Collapse>
            </>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  )
}
