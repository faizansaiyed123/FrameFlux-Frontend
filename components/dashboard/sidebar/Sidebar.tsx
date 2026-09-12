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
  Share2,
  History,
  Heart,
  Layers,
  Settings2,
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
    <div className={cn('flex h-full flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950', className)}>
      <div className="flex h-16 items-center px-6 border-b border-zinc-200 dark:border-zinc-800">
        <Link href="/app/dashboard" className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-50">
          <Film className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          <span>FrameFlux</span>
        </Link>
      </div>

      <ScrollArea className="flex-1 py-4">
        <nav className="px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/app/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-50'
                )}
              >
                <item.icon className={cn('h-4 w-4', isActive && 'text-indigo-600 dark:text-indigo-400')} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-3 px-3 py-2 h-auto">
              <Avatar className="h-8 w-8">
                <AvatarImage src="" alt={user?.full_name || user?.email || ''} />
                <AvatarFallback className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-sm">
                <span className="font-medium text-zinc-900 dark:text-zinc-50 truncate max-w-[140px]">
                  {user?.full_name || 'User'}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[140px]">
                  {user?.email}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-red-600 dark:text-red-400">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}