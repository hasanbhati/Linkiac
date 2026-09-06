import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/lib/app-context';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Linkiac — The Universal Link Library & Friend Recommendations',
  description:
    'Save anything from anywhere on the internet — regular websites, Instagram reels, YouTube videos, or arbitrary notes. Organize with infinite folders and privately share with friends.',
  keywords: ['bookmarks', 'links', 'read-it-later', 'curation', 'private sharing', 'link manager'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#09090b',
};

export default function RootLayout({
  children,
}: {
  children: any;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen flex flex-col bg-zinc-950 text-zinc-100`}>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
