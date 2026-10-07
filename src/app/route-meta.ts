import { useMatches } from '@tanstack/react-router'

/**
 * Metadados de layout declarados nas rotas (`staticData`). O layout raiz combina os valores
 * da rota mais profunda para decidir navegação ativa, cabeçalho mobile e barra inferior.
 */
declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    /** Item de navegação ativo no header desktop. */
    nav?: 'home' | 'market'
    /** Cabeçalho mobile: `back` (voltar + título), `brand` (logo) ou `none` (a página desenha o seu). */
    mobileHeader?: 'back' | 'brand' | 'none'
    mobileTitle?: string
    /** Destino do botão voltar no mobile (padrão: histórico). */
    mobileBackTo?: string
    /** Oculta a barra de abas inferior (páginas com ações fixas no rodapé). */
    hideTabBar?: boolean
  }
}

export interface RouteMeta {
  nav?: 'home' | 'market'
  mobileHeader: 'back' | 'brand' | 'none'
  mobileTitle?: string
  mobileBackTo?: string
  hideTabBar: boolean
}

export function useRouteMeta(): RouteMeta {
  const matches = useMatches()
  const merged: RouteMeta = { mobileHeader: 'brand', hideTabBar: false }
  for (const match of matches) Object.assign(merged, match.staticData)
  return merged
}
