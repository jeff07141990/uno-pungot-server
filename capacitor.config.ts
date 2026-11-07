import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.unopungot.game',
  appName: 'UNO Pungot Edition',
  webDir: 'dist',
  server: {
    url: 'https://uno-pungot-server.onrender.com',
    cleartext: true,
    allowNavigation: ['*']
  }
};

export default config;
