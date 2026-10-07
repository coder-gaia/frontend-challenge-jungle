import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { toApiError } from '@/api/errors'

/**
 * Aplica os erros por campo devolvidos pela API (`error.fields`) no react-hook-form.
 * Retorna a mensagem geral quando não há campo correspondente.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fieldMap: Partial<Record<string, Path<T>>> = {},
): string | null {
  const apiError = toApiError(error)
  let mapped = false
  for (const [field, message] of Object.entries(apiError.fields ?? {})) {
    const target = fieldMap[field] ?? (field as Path<T>)
    setError(target, { type: 'server', message }, { shouldFocus: !mapped })
    mapped = true
  }
  return mapped ? null : apiError.message
}
