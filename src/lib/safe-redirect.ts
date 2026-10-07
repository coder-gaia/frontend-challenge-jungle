/** Aceita apenas caminhos internos (evita open redirect via `?redirect=`). */
export function safeRedirect(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string') return fallback
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback
  if (value.startsWith('/entrar') || value.startsWith('/cadastro')) return fallback
  return value
}
