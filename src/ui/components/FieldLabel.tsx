import { Box, IconButton, Tooltip } from '@mui/material'
import InfoOutlined from '@mui/icons-material/InfoOutlined'

export function FieldLabel(props: { label: string; tooltip?: string; tooltipAriaLabel?: string }) {
  const tooltip = props.tooltip?.trim() ? props.tooltip.trim() : null

  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, lineHeight: 1.2 }}>
      <Box component="span">{props.label}</Box>
      {tooltip ? (
        <Tooltip title={tooltip} arrow enterTouchDelay={0}>
          <IconButton
            size="small"
            aria-label={props.tooltipAriaLabel ?? `${props.label} info`}
            onMouseDown={(e) => e.preventDefault()}
            sx={{ p: 0.25 }}
          >
            <InfoOutlined fontSize="inherit" />
          </IconButton>
        </Tooltip>
      ) : null}
    </Box>
  )
}

