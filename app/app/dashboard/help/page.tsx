'use client';

import Link from 'next/link';
import {
  BookOpen,
  MessageSquare,
  FileText,
  ExternalLink,
} from 'lucide-react';

const helpResources = [
  {
    title: 'Documentation',
    description: 'Read the full FrameFlux guide',
    href: '/app/dashboard/help',
    icon: BookOpen,
  },
  {
    title: 'Getting Started',
    description: 'Upload, edit, and export your first video',
    href: '/app/dashboard/media',
    icon: FileText,
  },
  {
    title: 'Community',
    description: 'Join discussions and get help from other users',
    href: '/app/dashboard/settings',
    icon: MessageSquare,
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Help & Support</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">Get help with FrameFlux</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {helpResources.map((resource) => (
          <Link
            key={resource.title}
            href={resource.href}
            className="flex flex-col items-start rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mb-4">
              <resource.icon className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-1">{resource.title}</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{resource.description}</p>
            <div className="mt-4 flex items-center text-sm text-indigo-600 dark:text-indigo-400">
              Visit
              <ExternalLink className="ml-1 h-4 w-4" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}