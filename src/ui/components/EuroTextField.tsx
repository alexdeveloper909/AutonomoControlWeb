import { InputAdornment, TextField } from '@mui/material'
import type { TextFieldProps } from '@mui/material/TextField'

export function EuroTextField(props: TextFieldProps) {
  const { InputProps, inputMode, ...rest } = props
  return (
    <TextField
      {...rest}
      inputMode={inputMode ?? 'decimal'}
      InputProps={{
        startAdornment: <InputAdornment position="start">€</InputAdornment>,
        ...InputProps,
      }}
    />
  )
}

