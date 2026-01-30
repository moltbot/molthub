import { useAuthActions } from '@convex-dev/auth/react'
import { Link } from '@tanstack/react-router'
import { Menu, Monitor, Moon, Sun } from 'lucide-react'
import { useMemo, useRef } from 'react'
import { gravatarUrl } from '../lib/gravatar'
import { isModerator } from '../lib/roles'
import { getOpenClawSiteUrl, getSiteMode, getSiteName } from '../lib/site'
import { applyTheme, useThemeMode } from '../lib/theme'
import { startThemeTransition } from '../lib/theme-transition'
import { useAuthStatus } from '../lib/useAuthStatus'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from './ui/navigation-menu'
import { Separator } from './ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet'
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group'

export default function Header() {
  const { isAuthenticated, isLoading, me, bypassEnabled } = useAuthStatus()
  const { signIn, signOut } = useAuthActions()
  const { mode, setMode } = useThemeMode()
  const toggleRef = useRef<HTMLDivElement | null>(null)
  const siteMode = getSiteMode()
  const siteName = useMemo(() => getSiteName(siteMode), [siteMode])
  const isSoulMode = siteMode === 'souls'
  const moltHubUrl = getOpenClawSiteUrl()

  const avatar = me?.image ?? (me?.email ? gravatarUrl(me.email) : undefined)
  const handle = me?.handle ?? me?.displayName ?? 'user'
  const initial = (me?.displayName ?? me?.name ?? handle).charAt(0).toUpperCase()
  const isStaff = isModerator(me) || bypassEnabled

  const setTheme = (next: 'system' | 'light' | 'dark') => {
    startThemeTransition({
      nextTheme: next,
      currentTheme: mode,
      setTheme: (value) => {
        const nextMode = value as 'system' | 'light' | 'dark'
        applyTheme(nextMode)
        setMode(nextMode)
      },
      context: { element: toggleRef.current },
    })
  }

  const navLinks = [
    ...(isSoulMode ? ([{ href: moltHubUrl, label: 'MoltHub' }] as const) : ([] as const)),
    {
      label: isSoulMode ? 'Souls' : 'Skills',
      to: isSoulMode ? '/souls' : '/skills',
      search: isSoulMode
        ? {
            q: undefined,
            sort: undefined,
            dir: undefined,
            view: undefined,
            focus: undefined,
          }
        : {
            q: undefined,
            sort: undefined,
            dir: undefined,
            highlighted: undefined,
            view: undefined,
            focus: undefined,
          },
    },
    ...(isSoulMode ? ([] as const) : ([{ label: 'Extensions', to: '/extensions' }] as const)),
    {
      label: 'Upload',
      to: '/upload',
      search: { updateSlug: undefined },
    },
    ...(isSoulMode ? ([] as const) : ([{ label: 'Import', to: '/import' }] as const)),
    {
      label: 'Search',
      to: isSoulMode ? '/souls' : '/skills',
      search: isSoulMode
        ? {
            q: undefined,
            sort: undefined,
            dir: undefined,
            view: undefined,
            focus: 'search',
          }
        : {
            q: undefined,
            sort: undefined,
            dir: undefined,
            highlighted: undefined,
            view: undefined,
            focus: 'search',
          },
    },
    ...(me ? ([{ label: 'Stars', to: '/stars' }] as const) : ([] as const)),
    ...(isStaff ? ([{ label: 'Moderation', to: '/moderation' }] as const) : ([] as const)),
  ]

  return (
    <header
      ref={toggleRef}
      className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          search={{ q: undefined, highlighted: undefined, search: undefined }}
          className="flex items-center gap-3 font-display text-lg font-semibold"
        >
          <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-[radial-gradient(circle_at_30%_30%,#ffd3c2_0%,#ff6b4a_60%,#d1492f_100%)] shadow-inner">
            <img src="/molt-logo.png" alt="" aria-hidden="true" className="h-7 w-7" />
          </span>
          <span>{siteName}</span>
        </Link>

        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            {navLinks.map((link) => (
              <NavigationMenuItem key={link.label}>
                {'href' in link ? (
                  <NavigationMenuLink asChild>
                    <a href={link.href}>{link.label}</a>
                  </NavigationMenuLink>
                ) : (
                  <NavigationMenuLink asChild>
                    <Link to={link.to} search={'search' in link ? link.search : undefined}>
                      {link.label}
                    </Link>
                  </NavigationMenuLink>
                )}
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-2 md:flex">
            <ToggleGroup
              type="single"
              value={mode}
              onValueChange={(value) => {
                if (!value) return
                setTheme(value as 'system' | 'light' | 'dark')
              }}
              aria-label="Theme mode"
            >
              <ToggleGroupItem value="system" aria-label="System theme">
                <Monitor className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">System</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="light" aria-label="Light theme">
                <Sun className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Light</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="dark" aria-label="Dark theme">
                <Moon className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Dark</span>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {isAuthenticated && (me || bypassEnabled) ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    {avatar ? <AvatarImage src={avatar} alt={handle} /> : null}
                    <AvatarFallback>{initial}</AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium md:inline-flex">
                    @{handle}
                    {bypassEnabled ? ' (bypass)' : ''}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/dashboard">Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {bypassEnabled ? null : (
                  <DropdownMenuItem onClick={() => void signOut()}>Sign out</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              type="button"
              disabled={isLoading || bypassEnabled}
              onClick={() => void signIn('github')}
            >
              Sign in with GitHub
            </Button>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden" aria-label="Menu">
                <Menu className="h-4 w-4" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <div className="mt-6 flex flex-col gap-2">
                {navLinks.map((link) => (
                  <div key={link.label}>
                    {'href' in link ? (
                      <a href={link.href} className="text-sm font-medium">
                        {link.label}
                      </a>
                    ) : (
                      <Link to={link.to} search={'search' in link ? link.search : undefined}>
                        <span className="text-sm font-medium">{link.label}</span>
                      </Link>
                    )}
                  </div>
                ))}
                <Separator className="my-2" />
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => setTheme('system')}>
                    <Monitor className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setTheme('light')}>
                    <Sun className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setTheme('dark')}>
                    <Moon className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
