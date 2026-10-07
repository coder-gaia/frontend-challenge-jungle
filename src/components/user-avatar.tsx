import type { User } from '@/contracts'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function UserAvatar({
  user,
  className,
}: {
  user: Pick<User, 'displayName' | 'avatarUrl'>
  className?: string
}) {
  return (
    <Avatar className={cn('size-8 border border-primary', className)}>
      {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
      <AvatarFallback className="bg-surface-dark text-xs font-bold text-text-accent">
        {initials(user.displayName)}
      </AvatarFallback>
    </Avatar>
  )
}
