'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, Film, Music, Image, FileText, Eye, EyeOff, Mail, Lock, User, Play, Scissors, Merge, Download, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/client';
import { ResumableUploader } from '@/lib/api/resumable';
import type { Media } from '@/types/api';

type MediaCategory = 'video' | 'audio' | 'image' | 'subtitle';

interface DetectedFile {
  file: File;
  category: MediaCategory;
  icon: React.ElementType;
}

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.avi', '.mkv', '.webm']);
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a', '.aiff', '.aif', '.wma', '.ogg', '.flac', '.opus']);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff', '.tif']);
const SUBTITLE_EXTENSIONS = new Set(['.srt', '.vtt', '.ass']);

const ALLOWED_EXTENSIONS = new Set([
  ...VIDEO_EXTENSIONS,
  ...AUDIO_EXTENSIONS,
  ...IMAGE_EXTENSIONS,
  ...SUBTITLE_EXTENSIONS,
]);

const CATEGORY_ICONS: Record<MediaCategory, React.ElementType> = {
  video: Film,
  audio: Music,
  image: Image,
  subtitle: FileText,
};

function detectMediaType(filename: string): MediaCategory | null {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  if (VIDEO_EXTENSIONS.has(ext)) return 'video';
  if (AUDIO_EXTENSIONS.has(ext)) return 'audio';
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (SUBTITLE_EXTENSIONS.has(ext)) return 'subtitle';
  return null;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const FEATURE_CARDS = [
  { icon: Scissors, title: 'Trim & Cut', description: 'Frame-accurate video editing with timeline' },
  { icon: Merge, title: 'Merge & Split', description: 'Combine clips or divide at any point' },
  { icon: Sparkles, title: 'Convert', description: 'Change format, resolution, and quality' },
  { icon: Download, title: 'Compress', description: 'Reduce file size while preserving quality' },
  { icon: Music, title: 'Audio', description: 'Extract, replace, and mix audio tracks' },
  { icon: Film, title: 'Subtitles', description: 'Burn or keep selectable subtitle tracks' },
];

export function Hero() {
  const router = useRouter();
  const { user, signup, login, loading: authLoading } = useAuth();

  const [dragOver, setDragOver] = useState(false);
  const [detectedFile, setDetectedFile] = useState<DetectedFile | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'processing'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPaused, setUploadPaused] = useState(false);
  const uploaderRef = useRef<ResumableUploader | null>(null);

  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showAuth, setShowAuth] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    setUploadError('');

    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
      setUploadError(`Unsupported file type. Supported: ${[...ALLOWED_EXTENSIONS].join(', ')}`);
      setDetectedFile(null);
      return;
    }

    const category = detectMediaType(file.name);
    if (!category) {
      setUploadError('Could not detect media type from filename.');
      setDetectedFile(null);
      return;
    }

    setDetectedFile({ file, category, icon: CATEGORY_ICONS[category] });
  }, []);

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true);
    setUploadState('uploading');
    setUploadError('');
    setUploadProgress(0);
    setUploadPaused(false);

    const uploader = new ResumableUploader();
    uploaderRef.current = uploader;

    try {
      await uploader.init(file);
      setUploadState('uploading');

      await uploader.uploadAll((progress) => {
        setUploadProgress(progress);
      });

      const media = await uploader.finalize();
      setUploadState('processing');
      router.push(`/app/dashboard/media/${media.id}?from_upload=1`);
    } catch (err) {
      setUploadState('idle');
      setUploadError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [router]);

  const handlePauseUpload = useCallback(async () => {
    const uploader = uploaderRef.current;
    if (!uploader) return;
    if (uploadPaused) {
      await uploader.resume();
      setUploadPaused(false);
    } else {
      await uploader.pause();
      setUploadPaused(true);
    }
  }, [uploadPaused]);

  const handleCancelUpload = useCallback(async () => {
    const uploader = uploaderRef.current;
    if (!uploader) return;
    await uploader.cancel();
    setUploading(false);
    setUploadState('idle');
    setUploadProgress(0);
    setUploadPaused(false);
    setUploadError('Upload cancelled');
  }, []);

  const handleAuthAndUpload = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSubmitting(true);

    try {
      if (authMode === 'signup') {
        await signup(authEmail, authPassword, authFullName || undefined);
      } else {
        await login(authEmail, authPassword);
      }

      if (detectedFile) {
        setShowAuth(false);
        await handleUpload(detectedFile.file);
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setAuthSubmitting(false);
    }
  }, [authMode, authEmail, authPassword, authFullName, signup, login, detectedFile, handleUpload]);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    processFile(files[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleUploadClick = () => {
    if (!detectedFile) {
      fileInputRef.current?.click();
      return;
    }

    if (!user) {
      setShowAuth(true);
      return;
    }

    handleUpload(detectedFile.file);
  };

  const handleReset = () => {
    setDetectedFile(null);
    setUploadError('');
  };

  if (authLoading) {
    return (
      <section className="py-32 lg:pt-48 lg:pb-32 min-h-[500px] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400 mx-auto mb-4" />
          <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 lg:py-20 min-h-screen flex items-center">
      <div className="mx-auto max-w-4xl w-full px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-6">
            Professional Media Processing
            <br />
            <span className="text-indigo-600 dark:text-indigo-400">Made Simple</span>
          </h1>
          <p className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Upload video, audio, images, or subtitles. We detect your media type and open
            the right workspace so you can edit, convert, and export without any setup.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {FEATURE_CARDS.map((card) => (
            <div key={card.title} className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 text-center hover:border-indigo-200 dark:hover:border-indigo-900/30 transition-colors">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mx-auto mb-3">
                <card.icon className="h-5 w-5" />
              </div>
              <h3 className="font-medium text-zinc-900 dark:text-zinc-50 mb-1">{card.title}</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{card.description}</p>
            </div>
          ))}
        </div>

        {uploading ? (
          <div className="text-center py-16 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400 mx-auto mb-4" />
            <p className="text-zinc-600 dark:text-zinc-400">
              {uploadState === 'processing'
                ? `Processing ${detectedFile?.file.name}...`
                : `Uploading ${detectedFile?.file.name}...`}
            </p>
            <div className="max-w-xs mx-auto">
              <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 dark:bg-indigo-400 transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
              <p className="text-[10px] text-zinc-400 mt-1 text-right">{uploadProgress}%</p>
            </div>
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePauseUpload}>
                {uploadPaused ? 'Resume' : 'Pause'}
              </Button>
              <Button variant="destructive" size="sm" onClick={handleCancelUpload}>
                Cancel
              </Button>
            </div>
          </div>
        ) : detectedFile ? (
          <div className="border-2 border-dashed border-indigo-200 dark:border-indigo-900/30 rounded-xl p-8 text-center bg-indigo-50/30 dark:bg-indigo-900/10">
            <div className="flex items-center justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                {(() => {
                  const Icon = detectedFile.icon;
                  return <Icon className="h-8 w-8" />;
                })()}
              </div>
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2 capitalize">
              {detectedFile.category} file ready to process
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4 break-all">
              {detectedFile.file.name}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
              {formatFileSize(detectedFile.file.size)}
            </p>
            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={handleReset} disabled={uploading}>
                Choose another file
              </Button>
              <Button onClick={handleUploadClick} disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {uploadState === 'processing' ? 'Processing...' : 'Uploading...'}
                  </>
                ) : user ? (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload and open workspace
                  </>
                ) : (
                  <>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Continue with sign in
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
              dragOver
                ? 'border-indigo-400 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/10'
                : 'border-zinc-200 dark:border-zinc-800 hover:border-indigo-200 dark:hover:border-indigo-900/30'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="h-12 w-12 text-zinc-400 dark:text-zinc-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              Drag & drop your media file
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6 max-w-md mx-auto">
              Video, audio, images, and subtitles. We'll detect the type and open the right workspace.
            </p>
            <label className="inline-flex items-center px-6 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors">
              <input
                type="file"
                className="hidden"
                ref={fileInputRef}
                accept={[...ALLOWED_EXTENSIONS].join(',')}
                onChange={(e) => handleFileSelect(e.target.files)}
              />
              <Upload className="mr-2 h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Choose file
            </label>
          </div>
        )}

        {uploadError && (
          <Alert className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 mt-6">
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        )}

        {user ? (
          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400 mt-8">
            Or{' '}
            <Link href="/app/dashboard/media" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
              browse your media library
            </Link>
          </p>
        ) : (
          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400 mt-8">
            <Link href="/auth/login" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
              Sign in
            </Link>{' '}
            or{' '}
            <Link href="/auth/signup" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
              create an account
            </Link>{' '}
            to save your work to the cloud.
          </p>
        )}
      </div>

      <AuthModal
        open={showAuth}
        mode={authMode}
        email={authEmail}
        password={authPassword}
        fullName={authFullName}
        loading={authSubmitting}
        error={authError}
        onEmailChange={setAuthEmail}
        onPasswordChange={setAuthPassword}
        onFullNameChange={setAuthFullName}
        onModeChange={setAuthMode}
        onSubmit={handleAuthAndUpload}
        onClose={() => setShowAuth(false)}
      />
    </section>
  );
}

interface AuthModalProps {
  open: boolean;
  mode: 'login' | 'signup';
  email: string;
  password: string;
  fullName: string;
  loading: boolean;
  error: string;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onFullNameChange: (v: string) => void;
  onModeChange: (v: 'login' | 'signup') => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

function AuthModal({
  open,
  mode,
  email,
  password,
  fullName,
  loading,
  error,
  onEmailChange,
  onPasswordChange,
  onFullNameChange,
  onModeChange,
  onSubmit,
  onClose,
}: AuthModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {mode === 'signup' ? 'Create your account' : 'Sign in to your account'}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {error && (
          <Alert className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="auth_full_name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  id="auth_full_name"
                  type="text"
                  placeholder="Jane Doe"
                  value={fullName}
                  onChange={(e) => onFullNameChange(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="auth_email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                id="auth_email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                className="pl-10"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="auth_password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                id="auth_password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                className="pl-10"
                required
                minLength={8}
                disabled={loading}
              />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-500">At least 8 characters</p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === 'signup' ? 'Creating account...' : 'Signing in...'}
              </>
            ) : (
              mode === 'signup' ? 'Create account & upload' : 'Sign in & upload'
            )}
          </Button>

          <div className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            {mode === 'signup' ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => onModeChange('login')}
                  className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                New to FrameFlux?{' '}
                <button
                  type="button"
                  onClick={() => onModeChange('signup')}
                  className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                >
                  Create account
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
