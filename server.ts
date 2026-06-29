import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use a generous JSON payload size limit because multimodal inputs (e.g., capture) send large base64 strings.
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Bulletproof environment variable loading safeguard
  try {
    const fs = await import('fs');
    for (const envFile of ['.env', '.env.local']) {
      const envPath = path.join(process.cwd(), envFile);
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const lines = envContent.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const parts = trimmed.split('=');
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
            if (key && !process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('Could not load environment files', err);
  }

  const getGeminiClient = () => {
    try {
      const fs = require('fs');
      for (const envFile of ['.env', '.env.local']) {
        const envPath = path.join(process.cwd(), envFile);
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, 'utf8');
          const lines = envContent.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
              const parts = trimmed.split('=');
              const key = parts[0].trim();
              const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
              if (key) {
                process.env[key] = value;
              }
            }
          }
        }
      }
    } catch (e) {
      // ignore
    }

    const key = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    if (!key) return null;
    return {
      key,
      ai: new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      })
    };
  };

  let isQuotaExhausted = false;

  // API Routes
  app.get('/api/gemini/config', (req, res) => {
    const client = getGeminiClient();
    res.json({ isDemoMode: !client || isQuotaExhausted });
  });

  app.post('/api/gemini/generateContent', async (req, res) => {
    try {
      const { model, contents, config } = req.body;
      const client = getGeminiClient();
      if (!client) {
        return res.status(400).json({ error: 'No API Key configured. Please configure your key in settings.' });
      }
      const response = await client.ai.models.generateContent({ model, contents, config });
      res.json(response);
    } catch (err: any) {
      const isQuota = err.status === 429 || err.code === 429 || 
                      /RESOURCE_EXHAUSTED|exceeded your current quota|rate limit|\b429\b/i.test(err.message || '');
      if (isQuota) {
        isQuotaExhausted = true;
        console.warn('Gemini quota reached (RESOURCE_EXHAUSTED). Gracefully informing client.');
      } else {
        console.error('Server-side Gemini Error:', err);
      }
      const status = isQuota ? 429 : (err.status || 500);
      res.status(status).json({ error: err.message || 'Error from Gemini API' });
    }
  });

  app.post('/api/gemini/generateImages', async (req, res) => {
    try {
      const { model, prompt, config } = req.body;
      const client = getGeminiClient();
      if (!client) {
        return res.status(400).json({ error: 'No API Key configured. Please configure your key in settings.' });
      }
      const response = await (client.ai.models as any).generateImages({ model, prompt, config });
      res.json(response);
    } catch (err: any) {
      const isQuota = err.status === 429 || err.code === 429 || 
                      /RESOURCE_EXHAUSTED|exceeded your current quota|rate limit|\b429\b/i.test(err.message || '');
      if (isQuota) {
        isQuotaExhausted = true;
        console.warn('Imagen quota reached (RESOURCE_EXHAUSTED). Gracefully informing client.');
      } else {
        console.error('Server-side Imagen Error:', err);
      }
      const status = isQuota ? 429 : (err.status || 500);
      res.status(status).json({ error: err.message || 'Error from Imagen API' });
    }
  });

  // Vite integration / Static Assets serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Clutch Server] Full-stack server running on http://localhost:${PORT}`);
  });
}

startServer();
