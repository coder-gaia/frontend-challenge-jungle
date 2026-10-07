import { ChevronDown } from 'lucide-react'

/** Sufixo ".eth" do campo "Nome ENS" (único domínio suportado, como no Figma). */
export function EnsSuffix() {
  return (
    <span className="relative shrink-0">
      <select
        aria-label="Domínio ENS"
        defaultValue=".eth"
        className="h-10 w-[78px] cursor-pointer appearance-none rounded-[3px] border border-input bg-background pr-7 pl-2.5 text-15 outline-none focus-visible:border-primary"
      >
        <option value=".eth">.eth</option>
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-2 size-[18px] -translate-y-1/2"
        aria-hidden="true"
      />
    </span>
  )
}
