import { FetchInterceptor } from '@mswjs/interceptors/fetch'
import { WebSocketInterceptor } from '@mswjs/interceptors/WebSocket'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest'
import type { RequestHandler, WebSocketHandler } from 'msw'
import { defineNetwork, HttpNetworkFrame, InterceptorSource } from 'msw/experimental'
import { API_BASE } from './lib/http'

/**
 * As classes são as mesmas que o MSW usa internamente no fallback, mas o `InterceptorSource` tipa a
 * união dos mapas de eventos e o pacote de interceptadores publica declarações duplicadas
 * (`.d.mts` em chunks separados), o que impede a checagem estrutural: daí a conversão explícita.
 */
type SourceInterceptors = ConstructorParameters<typeof InterceptorSource>[0]['interceptors']

/**
 * Modo "em página": intercepta XHR, fetch e WebSocket no próprio documento, sem Service Worker.
 *
 * Usado quando o Service Worker não intercepta a página: iframes de outra origem (simuladores
 * mobile, previews de editor), navegadores sem a API ou com ela bloqueada.
 * Os três interceptadores ficam numa única fonte: o fallback nativo do MSW 2.15 cria duas fontes
 * com o mesmo nome (`interceptor-source`), e a do WebSocket nunca chega a ser aplicada.
 */
export async function startInPageNetwork(handlers: Array<RequestHandler | WebSocketHandler>) {
  const network = defineNetwork({
    sources: [
      new InterceptorSource({
        interceptors: [
          new XMLHttpRequestInterceptor(),
          new FetchInterceptor(),
          new WebSocketInterceptor(),
        ] as unknown as SourceInterceptors,
      }),
    ],
    handlers,
    // Assets e HMR seguem para a rede em silêncio; só alerta sobre chamadas de API sem handler.
    onUnhandledFrame: ({ frame, defaults }) => {
      if (
        frame instanceof HttpNetworkFrame &&
        new URL(frame.data.request.url).pathname.startsWith(API_BASE)
      ) {
        defaults.warn()
      }
    },
    context: { quiet: true },
  })
  await network.enable()
  return network
}
