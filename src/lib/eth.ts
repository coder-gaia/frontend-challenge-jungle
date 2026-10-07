import Big from 'big.js'

/**
 * Valores em ETH trafegam como strings decimais e são calculados com big.js,
 * evitando erros de ponto flutuante (ex.: 0.1 + 0.2). Nunca convertemos para `number`.
 */
Big.DP = 18
Big.RM = Big.roundHalfUp
// Evita notação exponencial em `toString()` para a faixa de valores usada.
Big.NE = -24
Big.PE = 40

export type EthValue = string

const ETH_PATTERN = /^\d+(\.\d{1,18})?$/

export function isEthValue(value: unknown): value is EthValue {
  return typeof value === 'string' && ETH_PATTERN.test(value)
}

function toBig(value: EthValue | Big): Big {
  return value instanceof Big ? value : new Big(value)
}

/** Normaliza para a forma canônica (sem zeros à direita desnecessários). */
export function normalizeEth(value: EthValue | Big): EthValue {
  const big = toBig(value)
  if (big.lt(0)) throw new RangeError('Valores em ETH não podem ser negativos')
  return big.toFixed(18).replace(/\.?0+$/, '') || '0'
}

export function addEth(...values: Array<EthValue | Big>): EthValue {
  return normalizeEth(values.reduce<Big>((sum, v) => sum.plus(toBig(v)), new Big(0)))
}

export function subEth(a: EthValue, b: EthValue): EthValue {
  const result = toBig(a).minus(toBig(b))
  return normalizeEth(result.lt(0) ? new Big(0) : result)
}

export function mulEth(value: EthValue, quantity: number): EthValue {
  if (!Number.isInteger(quantity) || quantity < 0) throw new RangeError('Quantidade deve ser inteira')
  return normalizeEth(toBig(value).times(quantity))
}

/** Aplica um percentual (ex.: 10 → 10%) arredondando para 6 casas. */
export function percentOfEth(value: EthValue, percent: number): EthValue {
  return normalizeEth(toBig(value).times(percent).div(100).round(6))
}

/** Multiplica por um fator decimal arredondando para `decimals` casas (usado em reajustes de preço). */
export function scaleEth(value: EthValue, factor: string, decimals = 2): EthValue {
  return normalizeEth(toBig(value).times(factor).round(decimals))
}

export function compareEth(a: EthValue, b: EthValue): -1 | 0 | 1 {
  return toBig(a).cmp(toBig(b)) as -1 | 0 | 1
}

export function minEth(a: EthValue, b: EthValue): EthValue {
  return compareEth(a, b) <= 0 ? a : b
}

export function isZeroEth(value: EthValue): boolean {
  return toBig(value).eq(0)
}

/**
 * Formata para exibição: no mínimo 2 e no máximo `maxDecimals` casas (padrão do Figma: "1.19", "26.846", "0.016").
 * O separador decimal segue o padrão do layout (ponto).
 */
export function formatEth(value: EthValue, { maxDecimals = 4, withUnit = true } = {}): string {
  const fixed = toBig(value).round(maxDecimals).toFixed(maxDecimals)
  const [int = '0', dec = ''] = fixed.split('.')
  const trimmed = dec.replace(/0+$/, '').padEnd(2, '0')
  const text = `${int}.${trimmed}`
  return withUnit ? `${text} ETH` : text
}
