import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from 'lucide-react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

// O produto é dark-only, então o tema é fixo (sem next-themes).
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-success" />,
        info: <InfoIcon className="size-4 text-text-accent" />,
        warning: <TriangleAlertIcon className="size-4 text-amber" />,
        error: <OctagonXIcon className="size-4 text-destructive-foreground" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast: 'font-sans !border-border-soft',
          description: '!text-text-secondary',
        },
      }}
      style={
        {
          '--normal-bg': 'var(--kurio-surface)',
          '--normal-text': 'var(--kurio-foreground)',
          '--normal-border': 'var(--kurio-border-soft)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
