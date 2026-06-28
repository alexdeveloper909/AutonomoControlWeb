import { Button, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import type { ReactNode } from 'react'

export function RecordListControls(props: {
  labelId: string
  yearLabel: string
  year: string
  yearOptions: string[]
  pageSummary: ReactNode
  refreshLabel: string
  prevLabel: string
  nextLabel: string
  isFetching: boolean
  isPrevDisabled: boolean
  isNextDisabled: boolean
  onYearChange: (year: string) => void
  onRefresh: () => void
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: 2.25,
        borderColor: (theme) => alpha(theme.palette.divider, 0.72),
        boxShadow: { xs: (theme) => `0 10px 24px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.2 : 0.05)}`, sm: 'none' },
      }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
        <FormControl sx={{ minWidth: { xs: 0, sm: 160 } }}>
          <InputLabel id={props.labelId}>{props.yearLabel}</InputLabel>
          <Select
            labelId={props.labelId}
            label={props.yearLabel}
            value={props.year}
            onChange={(e) => props.onYearChange(e.target.value)}
            size="small"
          >
            {props.yearOptions.map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          alignItems="center"
          justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
          sx={{
            flex: 1,
            flexWrap: 'wrap',
            '& > .MuiButton-root': { minHeight: 44, flex: { xs: '1 1 calc(33.33% - 8px)', sm: '0 0 auto' } },
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ flex: { xs: '1 1 100%', sm: '0 0 auto' }, fontWeight: { xs: 600, sm: 400 } }}
          >
            {props.pageSummary}
          </Typography>
          <Button variant="text" onClick={props.onRefresh} disabled={props.isFetching}>
            {props.refreshLabel}
          </Button>
          <Button variant="outlined" onClick={props.onPrev} disabled={props.isFetching || props.isPrevDisabled}>
            {props.prevLabel}
          </Button>
          <Button variant="outlined" onClick={props.onNext} disabled={props.isFetching || props.isNextDisabled}>
            {props.nextLabel}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  )
}
