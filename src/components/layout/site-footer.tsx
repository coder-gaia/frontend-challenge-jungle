import { useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { CATEGORY_LABEL, type Category } from '@/contracts'
import { FacebookIcon, InstagramIcon, LinkedinIcon, TwitterIcon, YoutubeIcon } from '@/components/brand-icons'
import { cn } from '@/lib/utils'
import { KurioWordmark } from './kurio-wordmark'
import { RealtimeIndicator } from './realtime-indicator'

const SERVICES = [
  {
    mark: 'W',
    title: 'Segurança da carteira',
    text: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    mark: 'C',
    title: 'Criadores em destaque',
    text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    mark: 'D',
    title: 'Alertas de lançamentos',
    text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
]

const SOCIALS = [
  { label: 'Facebook', href: 'https://www.facebook.com/', Icon: FacebookIcon },
  { label: 'Instagram', href: 'https://www.instagram.com/', Icon: InstagramIcon },
  { label: 'X (Twitter)', href: 'https://x.com/', Icon: TwitterIcon },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/', Icon: LinkedinIcon },
  { label: 'YouTube', href: 'https://www.youtube.com/', Icon: YoutubeIcon },
]

const COLLECTION_LINKS: Category[] = ['digital-art', 'photography', 'music', '3d-art', 'utility']

const linkClass = 'text-sm leading-[30px] text-foreground hover:text-text-accent'

function Newsletter() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Informe um e-mail válido')
      return
    }
    setError(null)
    // Fora do escopo da entrega: deixamos claro que nada foi registrado.
    toast.info('Newsletter ainda não disponível', {
      description: 'Esta demonstração não registra inscrições. Nenhum e-mail foi enviado.',
    })
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4" aria-labelledby="newsletter-title">
      <h2 id="newsletter-title" className="text-lg leading-4 font-bold">
        Antecipe-se ao próximo lançamento
      </h2>
      <div>
        <div className="flex h-10 overflow-hidden rounded-md bg-surface-dark shadow-glow">
          <label htmlFor="newsletter-email" className="sr-only">
            E-mail para receber novidades
          </label>
          <input
            id="newsletter-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="digite seu e-mail..."
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'newsletter-error' : undefined}
            className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
          />
          <button
            type="submit"
            className="cursor-pointer rounded-r-md bg-primary px-4 text-lg font-bold text-ink hover:bg-brand-light"
          >
            Enviar
          </button>
        </div>
        {error && (
          <p id="newsletter-error" className="mt-1 text-xs text-destructive-foreground">
            {error}
          </p>
        )}
      </div>
      <p className="text-13 text-text-secondary">
        Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
      </p>
    </form>
  )
}

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={cn('container-kurio mt-24 pb-28 md:pb-6', className)}>
      <section aria-label="Serviços" className="bg-surface p-6 md:p-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.35fr] lg:gap-0">
          {SERVICES.map((service) => (
            <div key={service.mark} className="flex flex-col gap-3 lg:border-r lg:border-primary lg:px-4">
              <span
                aria-hidden="true"
                className="flex size-[74px] items-center justify-center rounded-full bg-primary text-2xl font-bold text-ink"
              >
                {service.mark}
              </span>
              <h2 className="text-17 font-bold">{service.title}</h2>
              <p className="max-w-[204px] text-sm leading-[22px] text-text-secondary">{service.text}</p>
            </div>
          ))}
          <div className="lg:px-4">
            <Newsletter />
          </div>
        </div>
      </section>

      <div className="grid gap-4 bg-surface-dark px-6 py-6 text-sm leading-[22px] sm:grid-cols-2 md:px-8 lg:grid-cols-4">
        <KurioWordmark />
        <p>
          Feito para colecionadores,
          <br />
          criadores e cultura
        </p>
        <a href="mailto:contato@email.com" className="hover:text-text-accent">
          contato@email.com
        </a>
        <a href="tel:+551140028922" className="hover:text-text-accent">
          +55 11 4002 8922
        </a>
      </div>

      <div className="grid gap-8 bg-surface px-6 py-8 sm:grid-cols-2 md:px-8 lg:grid-cols-4">
        <nav aria-labelledby="footer-profile">
          <h2 id="footer-profile" className="mb-2 text-lg leading-4 font-bold">
            Meu perfil
          </h2>
          <ul>
            <li>
              <Link to="/conta/perfil" className={linkClass}>
                Meu perfil
              </Link>
            </li>
            <li>
              <Link to="/em-breve/$secao" params={{ secao: 'colecao' }} className={linkClass}>
                Minha coleção
              </Link>
            </li>
            <li>
              <Link to="/em-breve/$secao" params={{ secao: 'atividade' }} className={linkClass}>
                Atividade
              </Link>
            </li>
            <li>
              <Link to="/em-breve/$secao" params={{ secao: 'estudio' }} className={linkClass}>
                Estúdio do criador
              </Link>
            </li>
            <li>
              <Link to="/conta/favoritos" className={linkClass}>
                Lista de interesse
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-labelledby="footer-help">
          <h2 id="footer-help" className="mb-2 text-lg leading-4 font-bold">
            Central de ajuda
          </h2>
          <ul>
            {[
              'Central de ajuda',
              'Como comprar NFTs',
              'Carteira e segurança',
              'Política do mercado',
              'Denunciar item',
            ].map((label) => (
              <li key={label}>
                <Link to="/em-breve/$secao" params={{ secao: 'ajuda' }} className={linkClass}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-labelledby="footer-collections">
          <h2 id="footer-collections" className="mb-2 text-lg leading-4 font-bold">
            Coleções
          </h2>
          <ul>
            {COLLECTION_LINKS.map((category) => (
              <li key={category}>
                <Link to="/" search={{ category: [category] }} hash="mercado" className={linkClass}>
                  {CATEGORY_LABEL[category]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-col gap-8">
          <div>
            <h2 className="mb-5 text-lg leading-4 font-bold">Redes sociais</h2>
            <ul className="flex gap-2.5">
              {SOCIALS.map(({ label, href, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${label} (abre em nova aba)`}
                    className="flex size-[30px] items-center justify-center rounded border border-primary text-primary hover:bg-primary hover:text-ink"
                  >
                    <Icon />
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-lg leading-4 font-bold">Carteiras compatíveis</h2>
            <p className="inline-flex rounded-md border border-border-soft bg-surface-dark px-2 py-2 text-[9px] font-bold tracking-[0.01em] text-text-accent">
              METAMASK&nbsp;&nbsp;•&nbsp;&nbsp;WALLETCONNECT&nbsp;&nbsp;•&nbsp;&nbsp;COINBASE
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center gap-1 py-1">
        <p className="text-center text-sm leading-[30px]">© 2026 Kurio. Propriedade digital para todos.</p>
        <RealtimeIndicator />
      </div>
    </footer>
  )
}
