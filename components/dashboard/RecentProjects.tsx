'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { RecentProjectItem } from '@/types/api';
import { FolderOpen, MoreHorizontal, Plus } from 'lucide-react';

interface RecentProjectsProps {
  projects: RecentProjectItem[];
}

export function RecentProjects({ projects }: RecentProjectsProps) {
  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Recent Projects</CardTitle>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">More options</span>
        </Button>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 mb-4">
              <FolderOpen className="h-6 w-6 text-zinc-400" />
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">No projects yet</p>
            <Button size="sm" asChild>
              <Link href="/app/dashboard/projects">
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/app/dashboard/projects/${project.id}`}
                className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                    <FolderOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">{project.name}</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {project.description || 'No description'}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
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