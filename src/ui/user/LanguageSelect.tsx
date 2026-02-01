import { FormControl, InputLabel, MenuItem, Select } from '@mui/material'
import type { AppLanguage } from '../../domain/language'
import { languageOptions } from '../i18n/supportedLanguages'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'

export function LanguageSelect(props: {
  value: AppLanguage
  onChange: (lang: AppLanguage) => void
  label?: string
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const id = useId()
  const labelId = `${id}-label`
  const label = props.label ?? t('common.language')

  return (
    <FormControl fullWidth disabled={props.disabled}>
      <InputLabel id={labelId}>{label}</InputLabel>
      <Select
        labelId={labelId}
        label={label}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value as AppLanguage)}
      >
        {languageOptions.map((o) => (
          <MenuItem key={o.code} value={o.code}>
            {o.nativeName} ({o.englishName})
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}

