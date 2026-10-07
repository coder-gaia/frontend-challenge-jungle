import type { NftImage as NftImageData } from '@/contracts'
import { NftImage } from '@/components/nft-image'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useFocusReturn } from '@/lib/use-focus-return'

export default function ZoomDialog({
  image,
  name,
  open,
  onOpenChange,
}: {
  image: NftImageData
  name: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const returnFocus = useFocusReturn(open)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[min(92vw,820px)] border-border-soft bg-surface p-3 sm:p-4"
        onCloseAutoFocus={returnFocus}
      >
        <DialogTitle className="sr-only">{name}</DialogTitle>
        <DialogDescription className="sr-only">{image.alt}</DialogDescription>
        <NftImage
          image={image}
          sizes="(min-width: 860px) 800px, 90vw"
          priority
          className="w-full rounded-2xl"
        />
      </DialogContent>
    </Dialog>
  )
}
