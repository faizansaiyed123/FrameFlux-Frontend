'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, Mail } from 'lucide-react';

export function Footer() {
  const groups = {
    Product: [{ label: 'Features', href: '/#features' }, { label: 'Pricing', href: '/pricing' }, { label: 'Changelog', href: '/changelog' }],
    Support: [{ label: 'Help center', href: '/help-center' }, { label: 'Contact', href: '/contact' }, { label: 'Status', href: 'https://status.frameflux.io' }],
    Legal: [{ label: 'Privacy', href: '/privacy' }, { label: 'Terms', href: '/terms' }, { label: 'Cookies', href: '/cookies' }],
  };

  return (
    <footer className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-16">
        <div className="flex flex-col gap-12 lg:flex-row lg:justify-between">
          <div className="max-w-sm">
            <Link href="/" className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"><span className="h-2.5 w-2.5 rounded-[3px] bg-current" /></span><span className="font-semibold tracking-tight text-zinc-950 dark:text-white">FrameFlux</span></Link>
            <p className="mt-4 text-sm leading-6 text-zinc-500 dark:text-zinc-400">A focused workspace for processing, transforming, and managing your media.</p>
            <a href="mailto:hello@frameflux.io" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"><Mail className="h-4 w-4" /> hello@frameflux.io</a>
          </div>
          <div className="grid grid-cols-3 gap-12 sm:gap-20">
            {Object.entries(groups).map(([name, links]) => <div key={name}><h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-950 dark:text-white">{name}</h3><ul className="mt-4 space-y-3">{links.map((link) => <li key={link.label}><Link href={link.href} className="text-sm text-zinc-500 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white">{link.label}</Link></li>)}</ul></div>)}
          </div>
        </div>
        <div className="mt-14 flex flex-col gap-4 border-t border-zinc-200 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
          <p className="text-xs text-zinc-400">© {new Date().getFullYear()} FrameFlux. All rights reserved.</p>
          <div className="flex items-center gap-2"><Button variant="ghost" size="sm" asChild><Link href="/auth/login">Sign in</Link></Button><Button size="sm" className="rounded-lg" asChild><Link href="/auth/signup">Get started <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" /></Link></Button></div>
        </div>
      </div>
    </footer>
  );
}
