
import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'app.lovable.9f4fa48a616b46298c3bd1b5fc046205',
  appName: 'Mupa Digital Terminal',
  webDir: 'dist',
  server: {
    url: 'https://9f4fa48a-616b-4629-8c3b-d1b5fc046205.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1e40af',
      showSpinner: false
    },
    Camera: {
      permissions: ['camera']
    }
  }
};

export default config;
