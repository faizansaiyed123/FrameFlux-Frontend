'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Mail, Link2 } from 'lucide-react';

export function Footer() {
  const navLinks = {
    Product: [
      { label: 'Features', href: '/#features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Changelog', href: '/changelog' },
    ],
    Support: [
      { label: 'Help', href: '/help-center' },
      { label: 'Contact', href: '/contact' },
      { label: 'Status', href: 'https://status.frameflux.io' },
    ],
    Legal: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Cookie Policy', href: '/cookies' },
    ],
  };

  const socialLinks = [
    { icon: Link2, href: 'https://linkedin.com/company/frameflux', label: 'LinkedIn' },
    { icon: Mail, href: 'mailto:hello@frameflux.io', label: 'Email' },
  ];

  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              FrameFlux
            </Link>
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400 max-w-xs">
              Professional media processing made simple. Upload, edit, and export video, audio, and images.
            </p>
            <div className="mt-6 flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(navLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-medium text-zinc-900 dark:text-zinc-50 mb-4">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              © {new Date().getFullYear()} FrameFlux. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/auth/signup">Get Started</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/auth/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
