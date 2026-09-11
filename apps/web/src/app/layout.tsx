import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/lib/app-context';
import { ThemeProvider } from '@/lib/theme-context';

const inter = Inter({ subsets: ['latin'] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://linkiac.eu';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Linkiac — The Universal Link Library & Friend Recommendations',
  description:
    'Save anything from anywhere on the internet — regular websites, Instagram reels, YouTube videos, or arbitrary notes. Organize with infinite folders and privately share with friends.',
  keywords: ['bookmarks', 'links', 'read-it-later', 'curation', 'private sharing', 'link manager'],
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [{ url: '/favicon.svg' }],
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Linkiac — The Universal Link Library & Friend Recommendations',
    description:
      'Save anything from anywhere on the internet — regular websites, Instagram reels, YouTube videos, or arbitrary notes. Organize with infinite folders and privately share with friends.',
    url: siteUrl,
    siteName: 'Linkiac',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Linkiac — The Universal Link Library & Friend Recommendations',
    description:
      'Save anything from anywhere on the internet — regular websites, Instagram reels, YouTube videos, or arbitrary notes.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#09090b',
};

import { CookieBanner } from '@/components/CookieBanner';

export default function RootLayout({
  children,
}: {
  children: any;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('linkiac-theme');
                  var theme = stored || 'system';
                  var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.className} min-h-screen flex flex-col bg-[#F9FAFB] text-[#111827] dark:bg-zinc-950 dark:text-zinc-100 transition-colors duration-150`}>
        <ThemeProvider>
          <AppProvider>
            {children}
            <CookieBanner />
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
