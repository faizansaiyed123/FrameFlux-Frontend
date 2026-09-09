import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "FrameFlux — Video Processing API for Developers",
    template: "%s | FrameFlux",
  },
  description: "Professional video transcoding, editing, and processing REST API. Resumable uploads, real-time progress, composable operations. Start free.",
  keywords: ["video api", "transcoding", "ffmpeg", "media processing", "video editing", "developer tools"],
  authors: [{ name: "FrameFlux" }],
  creator: "FrameFlux",
  publisher: "FrameFlux",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://frameflux.io",
    siteName: "FrameFlux",
    title: "FrameFlux — Video Processing API for Developers",
    description: "Professional video transcoding, editing, and processing REST API. Resumable uploads, real-time progress, composable operations.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "FrameFlux - Video Processing API",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FrameFlux — Video Processing API for Developers",
    description: "Professional video transcoding, editing, and processing REST API.",
    images: ["/og-image.png"],
    creator: "@frameflux",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://api.frameflux.io" />
        <link rel="dns-prefetch" href="https://api.frameflux.io" />
      </head>
      <body className="min-h-full flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
        {children}
      </body>
    </html>
  );
}