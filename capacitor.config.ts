import { CapacitorConfig } from '@capacitor/cli';

// By default the native app ships and loads its own build (`dist/`), which is
// what works offline and what the stores accept. Loading a remote page is
// only for live-reload while developing — opt in explicitly:
//   CAP_SERVER_URL=https://<preview-url> npx cap sync
const devServerUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'app.lovable.82bda65581e5448f832eea464e8925dc',
  appName: 'soliv',
  webDir: 'dist',
  ...(devServerUrl
    ? {
        server: {
          url: devServerUrl,
          cleartext: devServerUrl.startsWith('http://'),
        },
      }
    : {}),
};

export default config;
