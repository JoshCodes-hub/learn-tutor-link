import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.9e39b5fb63ea4e489e03f975919eca8f',
  appName: 'OverraPrep AI',
  webDir: 'dist',
  server: {
    url: 'https://9e39b5fb-63ea-4e48-9e03-f975919eca8f.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  ios: {
    contentInset: 'always',
  },
  android: {
    backgroundColor: '#0a0a0b',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: false,
      backgroundColor: '#0a0a0b',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#d4af37',
      splashFullScreen: true,
      splashImmersive: true,
      useDialog: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a0b',
      overlaysWebView: false,
    },
  },
};

export default config;
