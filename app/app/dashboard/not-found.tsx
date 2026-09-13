import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Home } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-6">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
        <Home className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">404</h1>
        <p className="text-lg text-zinc-500 dark:text-zinc-400">Page not found</p>
        <p className="text-sm text-zinc-400 dark:text-zinc-500">The page you are looking for does not exist or has been moved.</p>
      </div>
      <Link href="/app/dashboard">
        <Button>Back to Dashboard</Button>
      </Link>
    </div>
  );
}