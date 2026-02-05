import { Button, Chip, Stack, TextField } from '@mui/material'

export function ExpenseCategoriesEditor(props: {
  categories: string[]
  onChange: (next: string[]) => void
  placeholder: string
  removeLabel: string
  addLabel: string
  disabled?: boolean
}) {
  const updateCategory = (i: number, value: string) => {
    props.onChange(props.categories.map((c, idx) => (idx === i ? value : c)))
  }

  const addCategory = () => {
    props.onChange([...props.categories, ''])
  }

  const removeCategory = (i: number) => {
    props.onChange(props.categories.filter((_, idx) => idx !== i))
  }

  return (
    <Stack spacing={1}>
      {props.categories.map((c, i) => (
        <Stack key={i} direction="row" spacing={1} alignItems="center">
          <TextField
            value={c}
            onChange={(e) => updateCategory(i, e.target.value)}
            placeholder={props.placeholder}
            fullWidth
            disabled={props.disabled}
          />
          <Chip
            label={props.removeLabel}
            onClick={props.disabled ? undefined : () => removeCategory(i)}
            clickable={!props.disabled}
            disabled={props.disabled}
          />
        </Stack>
      ))}
      <Button onClick={addCategory} disabled={props.disabled}>
        {props.addLabel}
      </Button>
    </Stack>
  )
}

