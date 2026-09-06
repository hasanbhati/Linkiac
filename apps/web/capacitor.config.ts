import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.linkiac.app',
  appName: 'Linkiac',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    // In local development, you can point url to your local dev server IP (e.g. http://192.168.1.5:3000)
    cleartext: true,
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#09090b',
    },
    Browser: {
      presentationStyle: 'popover',
    },
  },
};

export default config;
