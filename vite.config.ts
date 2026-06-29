import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Google AI Studio injects the Gemini key as API_KEY at deploy time. Locally we read
// GEMINI_API_KEY from .env.local. We expose both names so code can reference
// process.env.API_KEY (the AI Studio convention) in either environment.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const geminiKey = env.GEMINI_API_KEY || env.API_KEY || '';
  const googleOAuthClientId = env.GOOGLE_OAUTH_CLIENT_ID || '';
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.API_KEY': JSON.stringify(geminiKey),
      'process.env.GEMINI_API_KEY': JSON.stringify(geminiKey),
      'process.env.GOOGLE_OAUTH_CLIENT_ID': JSON.stringify(googleOAuthClientId),
    },
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
  };
});
