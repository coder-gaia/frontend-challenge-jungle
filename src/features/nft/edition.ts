import { z } from 'zod'
import type { Edition, EditionType, NftDetail } from '@/contracts'

/** Edição na URL do detalhe (`?edicao=1-50`): permite compartilhar/acessar uma edição específica. */
export const EDITION_PARAM: Record<EditionType, string> = {
  '1/1': '1-1',
  '1/10': '1-10',
  '1/50': '1-50',
  open: 'aberta',
}

export const editionParamSchema = z.enum(['1-1', '1-10', '1-50', 'aberta'])
export type EditionParam = z.infer<typeof editionParamSchema>

export const nftDetailSearchSchema = z.object({
  edicao: editionParamSchema.optional().catch(undefined),
  aba: z.enum(['detalhes', 'avaliacoes']).optional().catch(undefined),
})

export function editionFromParam(nft: NftDetail, param: EditionParam | undefined): Edition {
  const byParam = param ? nft.editions.find((e) => EDITION_PARAM[e.type] === param) : undefined
  if (byParam) return byParam
  const fallback = nft.editions.find((e) => e.id === nft.defaultEditionId)
  return fallback && fallback.available > 0
    ? fallback
    : (nft.editions.find((e) => e.available > 0) ?? fallback ?? nft.editions[0]!)
}
