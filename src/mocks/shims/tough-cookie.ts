/**
 * Shim do `tough-cookie` para o bundle do navegador.
 * O MSW usa um cookie jar para refletir `Set-Cookie` dos mocks; nosso backend simulado não usa cookies
 * (a sessão trafega no header Authorization). Substituir o jar remove ~250 KB (tough-cookie + tldts)
 * do chunk de mocks sem alterar nenhum comportamento da aplicação. Ver ARCHITECTURE.md › Performance.
 */
export class Cookie {
  static fromJSON(): null {
    return null
  }
  toJSON() {
    return {}
  }
}

export class MemoryCookieStore {
  idx: Record<string, unknown> = {}
}

export class CookieJar {
  constructor(_store?: MemoryCookieStore) {}
  getCookiesSync(): Cookie[] {
    return []
  }
  async setCookie(): Promise<void> {}
}
