import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Linkiac — Universal Link Library',
    short_name: 'Linkiac',
    description: 'Save anything from anywhere on the internet. Infinite nested folders and private sharing.',
    id: 'eu.linkiac.app',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#09090b',
    icons: [
      {
        src: '/app-icon.svg',
        sizes: '256x256',
        type: 'image/svg+xml',
      },
      {
        src: '/favicon.svg',
        sizes: '64x64',
        type: 'image/svg+xml',
      },
    ],
  };
}
