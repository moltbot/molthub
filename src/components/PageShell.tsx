import type { ElementType, HTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/utils'

type PageShellProps<T extends ElementType> = {
  as?: T
  className?: string
  children: ReactNode
} & Omit<HTMLAttributes<HTMLElement>, 'as' | 'className'>

export function PageShell<T extends ElementType = 'main'>({
  as,
  className,
  children,
  ...props
}: PageShellProps<T>) {
  const Comp = (as ?? 'main') as ElementType
  return (
    <Comp className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8', className)} {...props}>
      {children}
    </Comp>
  )
}
