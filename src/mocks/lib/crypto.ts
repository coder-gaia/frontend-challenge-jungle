/**
 * Utilitários criptográficos do backend simulado (WebCrypto).
 * Senhas nunca são armazenadas em claro: usamos PBKDF2-SHA256 com salt por usuário.
 */
const ITERATIONS = 60_000
const encoder = new TextEncoder()

const toHex = (bytes: ArrayBuffer | Uint8Array) =>
  Array.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

const fromHex = (hex: string) => new Uint8Array(hex.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) ?? [])

async function derive(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    key,
    256,
  )
  return toHex(bits)
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return `pbkdf2-sha256$${ITERATIONS}$${toHex(salt)}$${await derive(password, salt, ITERATIONS)}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, iterations, salt, hash] = stored.split('$')
  if (algorithm !== 'pbkdf2-sha256' || !iterations || !salt || !hash) return false
  const candidate = await derive(password, fromHex(salt), Number(iterations))
  // Comparação em tempo constante.
  let diff = candidate.length ^ hash.length
  for (let i = 0; i < Math.min(candidate.length, hash.length); i++)
    diff |= candidate.charCodeAt(i) ^ hash.charCodeAt(i)
  return diff === 0
}

export function randomToken(bytes = 32): string {
  return toHex(crypto.getRandomValues(new Uint8Array(bytes)))
}

export function randomId(prefix: string): string {
  return `${prefix}_${randomToken(8)}`
}

export async function sha256(value: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', encoder.encode(value)))
}

/** Serialização estável (chaves ordenadas) para comparar payloads de idempotência. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  return `{${Object.keys(value as Record<string, unknown>)
    .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`)
    .join(',')}}`
}
