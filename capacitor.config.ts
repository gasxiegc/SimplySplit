import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.simplesplit.app',
  appName: 'Simple Split',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
