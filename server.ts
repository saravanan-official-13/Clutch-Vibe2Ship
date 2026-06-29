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

  // Initialize the server-side Gemini client
  const geminiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  const ai = new GoogleGenAI({
    apiKey: geminiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // API Routes
  app.get('/api/gemini/config', (req, res) => {
    res.json({ isDemoMode: !geminiKey });
  });

  app.post('/api/gemini/generateContent', async (req, res) => {
    try {
      const { model, contents, config } = req.body;
      if (!geminiKey) {
        return res.status(400).json({ error: 'No API Key configured. Please configure your key in settings.' });
      }
      const response = await ai.models.generateContent({ model, contents, config });
      res.json(response);
    } catch (err: any) {
      console.error('Server-side Gemini Error:', err);
      res.status(err.status || 500).json({ error: err.message || 'Error from Gemini API' });
    }
  });

  app.post('/api/gemini/generateImages', async (req, res) => {
    try {
      const { model, prompt, config } = req.body;
      if (!geminiKey) {
        return res.status(400).json({ error: 'No API Key configured. Please configure your key in settings.' });
      }
      const response = await (ai.models as any).generateImages({ model, prompt, config });
      res.json(response);
    } catch (err: any) {
      console.error('Server-side Imagen Error:', err);
      res.status(err.status || 500).json({ error: err.message || 'Error from Imagen API' });
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
