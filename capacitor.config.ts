import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.studiostride.app',
  appName: 'Stride Studio',
  webDir: 'dist',
  plugins: {
    Health: {
      android: {
        // Request history access to bypass the ~30-day read cap
        requestHistoryAccess: true,
      },
    },
  },
};

export default config;
