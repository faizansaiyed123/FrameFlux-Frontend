'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { RecentProjectItem } from '@/types/api';
import { FolderOpen, Plus, ArrowUpRight } from 'lucide-react';

interface RecentProjectsProps {
  projects: RecentProjectItem[];
}

export function RecentProjects({ projects }: RecentProjectsProps) {
  return (
    <Card className="rounded-2xl border-zinc-200/80 bg-white/90 shadow-[0_10px_35px_-28px_rgba(24,24,27,.5)] dark:border-zinc-800/80 dark:bg-zinc-900/80">
      <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-100 px-5 py-5 dark:border-zinc-800/80 sm:px-6">
        <div>
          <CardTitle className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">Recent Projects</CardTitle>
          <p className="mt-1 text-xs text-zinc-400">Your latest project activity</p>
        </div>
        <Link href="/app/dashboard/projects" className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 dark:hover:bg-zinc-800 dark:hover:text-white">
          View all <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-zinc-400 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
              <FolderOpen className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">No projects yet</p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-zinc-400">Create a project to keep related media and workflows organized.</p>
            <Button size="sm" className="mt-5 cursor-pointer rounded-lg" asChild>
              <Link href="/app/dashboard/projects">
                <Plus className="mr-2 h-4 w-4" />
                Create project
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/app/dashboard/projects/${project.id}`}
                className="group flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-transparent px-3 py-3.5 outline-none transition-all hover:border-zinc-200 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:border-zinc-800 dark:hover:bg-zinc-950"
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-400 dark:ring-indigo-900/60">
                    <FolderOpen className="h-[18px] w-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">{project.name}</p>
                    <p className="mt-0.5 truncate text-xs text-zinc-400 dark:text-zinc-500">{project.description || 'No description'}</p>
                  </div>
                </div>
                <span className="shrink-0 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                  {new Date(project.updated_at).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
