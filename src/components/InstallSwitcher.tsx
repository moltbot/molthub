import { useMemo, useState } from 'react'
import { cn } from '../lib/utils'
import { Button } from './ui/button'

type PackageManager = 'npm' | 'pnpm' | 'bun'

type InstallSwitcherProps = {
  exampleSlug?: string
}

const PACKAGE_MANAGERS: Array<{ id: PackageManager; label: string }> = [
  { id: 'npm', label: 'npm' },
  { id: 'pnpm', label: 'pnpm' },
  { id: 'bun', label: 'bun' },
]

export function InstallSwitcher({ exampleSlug = 'sonoscli' }: InstallSwitcherProps) {
  const [pm, setPm] = useState<PackageManager>('npm')

  const command = useMemo(() => {
    switch (pm) {
      case 'npm':
        return `npx clawhub@latest install ${exampleSlug}`
      case 'pnpm':
        return `pnpm dlx clawhub@latest install ${exampleSlug}`
      case 'bun':
        return `bunx clawhub@latest install ${exampleSlug}`
    }
  }, [exampleSlug, pm])

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted-foreground">Install any skill folder in one shot:</div>
        <div className="flex gap-2" role="tablist" aria-label="Install command">
          {PACKAGE_MANAGERS.map((entry) => (
            <Button
              key={entry.id}
              type="button"
              variant={pm === entry.id ? 'default' : 'outline'}
              size="sm"
              className={cn(pm === entry.id ? '' : 'text-muted-foreground')}
              role="tab"
              aria-selected={pm === entry.id}
              onClick={() => setPm(entry.id)}
            >
              {entry.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="rounded-[var(--radius)] border border-border bg-muted px-4 py-3 text-xs font-mono">
        {command}
      </div>
    </div>
  )
}
