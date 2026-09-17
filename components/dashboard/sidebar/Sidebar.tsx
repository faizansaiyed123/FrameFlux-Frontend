'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FolderOpen,
  Film,
  Settings,
  HelpCircle,
  Activity,
  LogOut,
  User,
  Workflow,
  Search,
  Bell,
  HardDrive,
  History,
  Heart,
  Layers,
  Settings2,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
  { name: 'Projects', href: '/app/dashboard/projects', icon: FolderOpen },
  { name: 'Media Library', href: '/app/dashboard/media', icon: Film },
  { name: 'Batch', href: '/app/dashboard/batch', icon: Layers },
  { name: 'Favorites', href: '/app/dashboard/favorites', icon: Heart },
  { name: 'Quick Actions', href: '/app/dashboard/quick-actions', icon: Zap },
  { name: 'Search', href: '/app/dashboard/search', icon: Search },
  { name: 'Workflows', href: '/app/dashboard/workflows', icon: Workflow },
  { name: 'Presets', href: '/app/dashboard/presets', icon: Settings2 },
  { name: 'Notifications', href: '/app/dashboard/notifications', icon: Bell },
  { name: 'Storage', href: '/app/dashboard/storage', icon: HardDrive },
  { name: 'History', href: '/app/dashboard/history', icon: History },
  { name: 'Jobs', href: '/app/dashboard/jobs', icon: Activity },
  { name: 'Settings', href: '/app/dashboard/settings', icon: Settings },
  { name: 'Help & Support', href: '/app/dashboard/help', icon: HelpCircle },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    : user?.email?.[0].toUpperCase() || 'U';

  return (
    <aside className={cn('flex h-full flex-col border-r border-zinc-200/80 bg-white dark:border-zinc-800/80 dark:bg-zinc-950', className)}>
      <div className="flex h-[72px] items-center border-b border-zinc-200/80 px-5 dark:border-zinc-800/80">
        <Link href="/app/dashboard" className="group flex items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950" aria-label="FrameFlux dashboard">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-950 text-white shadow-sm transition-transform group-hover:scale-[1.02] dark:bg-white dark:text-zinc-950">
            <span className="h-3 w-3 rounded-[3px] bg-current" />
          </span>
          <div className="leading-none">
            <span className="block text-[15px] font-semibold tracking-[-0.02em] text-zinc-950 dark:text-white">FrameFlux</span>
            <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400">Workspace</span>
          </div>
        </Link>
      </div>

      <ScrollArea className="flex-1 py-5">
        <nav className="space-y-1 px-3" aria-label="Dashboard navigation">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/app/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium outline-none transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-inset',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 shadow-[inset_3px_0_0_#6366f1] dark:bg-indigo-950/45 dark:text-indigo-300'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'
                )}
              >
                <item.icon className={cn('h-[17px] w-[17px] shrink-0 transition-transform group-hover:scale-105', isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 dark:text-zinc-500')} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="border-t border-zinc-200/80 p-3 dark:border-zinc-800/80">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-auto w-full cursor-pointer justify-start gap-3 rounded-xl px-2.5 py-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-900">
              <Avatar className="h-9 w-9 shrink-0 ring-1 ring-zinc-200 dark:ring-zinc-800">
                <AvatarImage src="" alt={user?.full_name || user?.email || ''} />
                <AvatarFallback className="bg-zinc-100 text-xs font-semibold text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 text-left">
                <span className="block truncate text-[13px] font-semibold text-zinc-900 dark:text-zinc-50">
                  {user?.full_name || 'User'}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                  {user?.email}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5">
            <DropdownMenuLabel className="px-2.5 py-2 text-xs text-zinc-500">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
              <Link href="/app/dashboard/settings" className="text-zinc-700 dark:text-zinc-300">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer rounded-lg">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="cursor-pointer rounded-lg text-red-600 dark:text-red-400">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
