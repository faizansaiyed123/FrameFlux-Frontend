'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(email, password); router.push('/app/dashboard'); router.refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Login failed'); }
    finally { setLoading(false); }
  };

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
        <section className="relative hidden overflow-hidden bg-zinc-950 px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
          <div className="absolute inset-0 ff-grid opacity-30" />
          <div className="relative z-10 flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-zinc-950"><span className="h-2.5 w-2.5 rounded-[3px] bg-current" /></span>
            <span className="font-semibold tracking-tight">FrameFlux</span>
          </div>
          <div className="relative z-10 max-w-xl pb-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300"><ShieldCheck className="h-3.5 w-3.5" /> Built for modern media workflows</div>
            <h1 className="text-5xl font-semibold leading-[1.05] tracking-[-0.04em] xl:text-6xl">Your media workspace,<br /><span className="text-zinc-400">without the busywork.</span></h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-zinc-400">Process, transform, and manage your media from one focused workspace.</p>
          </div>
          <p className="relative z-10 text-xs text-zinc-500">© {new Date().getFullYear()} FrameFlux</p>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <Link href="/" className="mb-10 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-900 dark:hover:text-white lg:hidden"><ArrowLeft className="h-4 w-4" /> Back to home</Link>
            <div className="mb-8 lg:mt-0">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-950 text-white shadow-sm dark:bg-white dark:text-zinc-950 lg:hidden"><span className="h-3 w-3 rounded-[3px] bg-current" /></div>
              <h2 className="text-3xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-white">Welcome back</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">Sign in to continue to your FrameFlux workspace.</p>
            </div>
            {error && <Alert className="mb-5 border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"><AlertDescription>{error}</AlertDescription></Alert>}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2"><Label htmlFor="email">Email</Label><div className="relative"><Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" /><Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-lg pl-10" required disabled={loading} /></div></div>
              <div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="password">Password</Label><Link href="/auth/forgot-password" className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">Forgot password?</Link></div><div className="relative"><Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" /><Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-lg pl-10 pr-10" required disabled={loading} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
              <Button type="submit" className="h-11 w-full rounded-lg" disabled={loading}>{loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</> : 'Sign in'}</Button>
            </form>
            <p className="mt-7 text-center text-sm text-zinc-500 dark:text-zinc-400">New to FrameFlux? <Link href="/auth/signup" className="font-medium text-zinc-950 hover:underline dark:text-white">Create an account</Link></p>
            <p className="mt-10 text-center text-[11px] leading-5 text-zinc-400 dark:text-zinc-500">By continuing, you agree to our Terms of Service and Privacy Policy.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
