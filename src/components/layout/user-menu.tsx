import { Link } from '@tanstack/react-router'
import { ChevronDown, Heart, LogOut, UserRound, Wallet } from 'lucide-react'
import type { User } from '@/contracts'
import { UserAvatar } from '@/components/user-avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLogout } from '@/features/auth/session'

export default function UserMenu({ user }: { user: User }) {
  const logout = useLogout()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-[35px] cursor-pointer items-center gap-2 rounded-md px-1.5 hover:bg-surface-raised"
        data-testid="user-menu"
        aria-label={`Menu da conta de ${user.displayName}`}
      >
        <UserAvatar user={user} />
        <span className="hidden max-w-32 truncate text-sm font-medium xl:inline">{user.displayName}</span>
        <ChevronDown className="size-4 text-text-secondary" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 border-border-soft bg-surface">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-sm font-bold">{user.displayName}</span>
          <span className="block truncate text-xs text-text-secondary">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/conta/perfil">
            <UserRound aria-hidden="true" /> Meu perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/conta/carteiras">
            <Wallet aria-hidden="true" /> Carteiras
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/conta/favoritos">
            <Heart aria-hidden="true" /> Lista de interesse
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => logout.mutate()} data-testid="logout">
          <LogOut aria-hidden="true" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
