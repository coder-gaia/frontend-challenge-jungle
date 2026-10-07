import { Link } from '@tanstack/react-router'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { KurioWordmark } from './kurio-wordmark'
import { RealtimeIndicator } from './realtime-indicator'
import { NAV_ITEMS } from './site-header'

export default function NavSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 border-border-soft bg-surface">
        <SheetHeader>
          <SheetTitle>
            <KurioWordmark />
          </SheetTitle>
          <SheetDescription>Navegação principal</SheetDescription>
        </SheetHeader>
        <nav aria-label="Principal" className="flex flex-col gap-1 px-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.id}
              to={item.to}
              hash={'hash' in item ? item.hash : undefined}
              params={'params' in item ? item.params : undefined}
              onClick={() => onOpenChange(false)}
              className="rounded-md px-3 py-3 text-base hover:bg-surface-raised hover:text-text-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <RealtimeIndicator className="mt-auto p-4" />
      </SheetContent>
    </Sheet>
  )
}
