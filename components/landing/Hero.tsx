'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { ResumableUploader } from '@/lib/api/resumable';
import { ArrowRight, Check, Film, FileAudio, FileImage, FileText, Loader2, LockKeyhole, Mail, Play, Sparkles, Upload, User, X } from 'lucide-react';

type MediaCategory = 'video' | 'audio' | 'image' | 'subtitle';
interface DetectedFile { file: File; category: MediaCategory; icon: React.ElementType; }

const EXTENSIONS: Record<MediaCategory, Set<string>> = {
  video: new Set(['.mp4', '.mov', '.avi', '.mkv', '.webm']),
  audio: new Set(['.mp3', '.wav', '.m4a', '.aiff', '.aif', '.wma', '.ogg', '.flac', '.opus']),
  image: new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff', '.tif']),
  subtitle: new Set(['.srt', '.vtt', '.ass']),
};
const ICONS: Record<MediaCategory, React.ElementType> = { video: Film, audio: FileAudio, image: FileImage, subtitle: FileText };
const ACCEPT = Object.values(EXTENSIONS).flatMap((set) => [...set]).join(',');
const FEATURES = [
  ['Instant processing', 'Upload media and get to work immediately.'],
  ['Resumable uploads', 'Large files continue safely when connections drop.'],
  ['One focused workspace', 'Edit, convert, compress, and export in one place.'],
];

function detectMediaType(name: string): MediaCategory | null {
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
  for (const [category, extensions] of Object.entries(EXTENSIONS) as [MediaCategory, Set<string>][]) if (extensions.has(ext)) return category;
  return null;
}
function formatSize(bytes: number) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB']; const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
}

export function Hero() {
  const router = useRouter();
  const { user, login, signup, loading: authLoading } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null); const uploaderRef = useRef<ResumableUploader | null>(null);
  const [file, setFile] = useState<DetectedFile | null>(null); const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(''); const [uploading, setUploading] = useState(false); const [progress, setProgress] = useState(0); const [paused, setPaused] = useState(false);
  const [authOpen, setAuthOpen] = useState(false); const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [fullName, setFullName] = useState(''); const [authError, setAuthError] = useState(''); const [authLoading, setAuthLoading] = useState(false);

  const selectFile = useCallback((candidate: File) => {
    setError(''); const category = detectMediaType(candidate.name);
    if (!category) { setFile(null); setError('Unsupported file type. Please choose a supported media file.'); return; }
    setFile({ file: candidate, category, icon: ICONS[category] });
  }, []);

  const upload = useCallback(async (candidate: File) => {
    setUploading(true); setProgress(0); setError('');
    const uploader = new ResumableUploader(); uploaderRef.current = uploader;
    try {
      await uploader.init(candidate);
      await uploader.uploadAll((value) => setProgress(value));
      const media = await uploader.finalize();
      router.push(`/app/dashboard/media/${media.id}?from_upload=1`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Upload failed. Please try again.'); setUploading(false); }
  }, [router]);

  const startUpload = () => { if (!file) { inputRef.current?.click(); return; } if (!user) { setAuthOpen(true); return; } upload(file.file); };
  const submitAuth = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthError(''); setAuthLoading(true);
    try { if (authMode === 'signup') await signup(email, password, fullName || undefined); else await login(email, password); setAuthOpen(false); if (file) await upload(file.file); }
    catch (err) { setAuthError(err instanceof Error ? err.message : 'Authentication failed'); }
    finally { setAuthLoading(false); }
  };

  if (authLoading) return <section className="min-h-[80vh] flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></section>;

  return (
    <>
      <section className="relative overflow-hidden bg-white dark:bg-zinc-950">
        <div className="absolute inset-0 ff-grid opacity-60 dark:opacity-30" />
        <div className="absolute left-1/2 top-24 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-24 sm:px-8 lg:pb-28 lg:pt-28">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-3.5 py-1.5 text-xs font-medium text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-300"><Sparkles className="h-3.5 w-3.5 text-indigo-500" /> Professional media processing, simplified</div>
            <h1 className="text-5xl font-semibold tracking-[-0.055em] text-zinc-950 sm:text-6xl lg:text-7xl dark:text-white">Turn raw media into<br /><span className="text-indigo-600 dark:text-indigo-400">finished work.</span></h1>
            <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-zinc-500 sm:text-lg dark:text-zinc-400">Upload video, audio, images, or subtitles. FrameFlux gives you the tools to process, transform, and export without the usual setup.</p>
          </div>

          <div className="mx-auto mt-12 max-w-4xl">
            <div className="rounded-2xl border border-zinc-200 bg-white p-2 shadow-[0_24px_70px_-35px_rgba(24,24,27,.35)] dark:border-zinc-800 dark:bg-zinc-900">
              {uploading ? (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-6 py-14 text-center dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
                  <h3 className="font-medium text-zinc-950 dark:text-white">Uploading {file?.file.name}</h3>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{progress}% complete</p>
                  <div className="mx-auto mt-6 h-2 max-w-md overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"><div className="h-full rounded-full bg-indigo-600 transition-all dark:bg-indigo-500" style={{ width: `${progress}%` }} /></div>
                  <div className="mt-5 flex justify-center gap-2"><Button variant="outline" size="sm" onClick={async () => { const u = uploaderRef.current; if (!u) return; if (paused) await u.resume(); else await u.pause(); setPaused(!paused); }}>{paused ? 'Resume' : 'Pause'}</Button><Button variant="ghost" size="sm" onClick={async () => { await uploaderRef.current?.cancel(); setUploading(false); setProgress(0); setPaused(false); setError('Upload cancelled'); }}>Cancel</Button></div>
                </div>
              ) : file ? (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 px-6 py-10 dark:border-indigo-900/60 dark:bg-indigo-950/20">
                  <div className="flex flex-col items-center justify-between gap-6 sm:flex-row sm:text-left">
                    <div className="flex items-center gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm dark:bg-zinc-900 dark:text-indigo-400"><file.icon className="h-7 w-7" /></div><div><p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{file.category} ready</p><h3 className="mt-1 max-w-lg truncate font-semibold text-zinc-950 dark:text-white">{file.file.name}</h3><p className="mt-1 text-sm text-zinc-500">{formatSize(file.file.size)}</p></div></div>
                    <div className="flex shrink-0 gap-2"><Button variant="outline" onClick={() => { setFile(null); setError(''); }}>Change</Button><Button onClick={startUpload}><Upload className="mr-2 h-4 w-4" /> {user ? 'Upload & open' : 'Continue'}<ArrowRight className="ml-2 h-4 w-4" /></Button></div>
                  </div>
                </div>
              ) : (
                <div className={`rounded-xl border-2 border-dashed px-6 py-14 text-center transition-all sm:py-16 ${dragOver ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/20' : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700'}`} onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) selectFile(e.dataTransfer.files[0]); }} onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}>
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"><Upload className="h-6 w-6" /></div>
                  <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">Drop your media here</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500 dark:text-zinc-400">Video, audio, images, and subtitles. We’ll detect the format automatically.</p>
                  <input ref={inputRef} type="file" className="hidden" accept={ACCEPT} onChange={(e) => e.target.files?.[0] && selectFile(e.target.files[0])} />
                  <Button className="mt-6 h-10 rounded-lg px-5" onClick={startUpload}>Choose a file <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  <p className="mt-4 text-[11px] text-zinc-400">Secure upload · Resumable · No setup required</p>
                </div>
              )}
            </div>
            {error && <Alert className="mt-4 border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"><AlertDescription>{error}</AlertDescription></Alert>}
          </div>

          <div id="features" className="mx-auto mt-12 grid max-w-4xl gap-px overflow-hidden rounded-xl border border-zinc-200 bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-800 md:grid-cols-3">
            {FEATURES.map(([title, description]) => <div key={title} className="bg-white px-6 py-5 dark:bg-zinc-950"><div className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900"><Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" /></div><h3 className="text-sm font-semibold text-zinc-950 dark:text-white">{title}</h3><p className="mt-1.5 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{description}</p></div>)}
          </div>
          <p className="mt-6 text-center text-xs text-zinc-400">{user ? <Link href="/app/dashboard/media" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">Browse your media library →</Link> : <>Already have an account? <Link href="/auth/login" className="font-medium text-zinc-700 hover:underline dark:text-zinc-200">Sign in</Link></>}</p>
        </div>
      </section>

      {authOpen && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/60 px-4 backdrop-blur-sm" role="dialog" aria-modal="true">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-7 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-start justify-between"><div><div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"><LockKeyhole className="h-4 w-4" /></div><h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">{authMode === 'signup' ? 'Create your account' : 'Welcome back'}</h2><p className="mt-1 text-sm text-zinc-500">Sign in to continue with your upload.</p></div><button onClick={() => setAuthOpen(false)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white" aria-label="Close"><X className="h-5 w-5" /></button></div>
          {authError && <Alert className="mt-5 border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"><AlertDescription>{authError}</AlertDescription></Alert>}
          <form onSubmit={submitAuth} className="mt-6 space-y-4">
            {authMode === 'signup' && <div className="space-y-2"><Label htmlFor="hero-name">Full name</Label><div className="relative"><User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" /><Input id="hero-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-11 pl-9" disabled={authLoading} /></div></div>}
            <div className="space-y-2"><Label htmlFor="hero-email">Email</Label><div className="relative"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" /><Input id="hero-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-11 pl-9" required disabled={authLoading} /></div></div>
            <div className="space-y-2"><Label htmlFor="hero-password">Password</Label><Input id="hero-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-11" required minLength={8} disabled={authLoading} /></div>
            <Button className="h-11 w-full rounded-lg" disabled={authLoading}>{authLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait...</> : authMode === 'signup' ? 'Create account & upload' : 'Sign in & upload'}</Button>
          </form>
          <p className="mt-5 text-center text-xs text-zinc-500">{authMode === 'signup' ? 'Already have an account?' : 'New to FrameFlux?'} <button type="button" onClick={() => { setAuthMode(authMode === 'signup' ? 'login' : 'signup'); setAuthError(''); }} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">{authMode === 'signup' ? 'Sign in' : 'Create account'}</button></p>
        </div>
      </div>}
    </>
  );
}
