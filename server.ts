import dotenv from 'dotenv';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createTutorRouter } from './server/tutorRoutes.ts';

// Load .env.local first, then .env. Variables that are already set in the
// environment (for example AI Studio secrets) always win over both files.
dotenv.config({ path: ['.env.local', '.env'], quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// `npm start` passes --production so the script works on Windows too, where
// the `NODE_ENV=production command` shell syntax is not available.
const isProduction =
  process.env.NODE_ENV === 'production' || process.argv.includes('--production');
if (isProduction) {
  process.env.NODE_ENV = 'production';
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const HOST = process.env.HOST?.trim() || '0.0.0.0';

  app.use(express.json({ limit: '256kb' }));
  app.use('/api', createTutorRouter());

  // Unknown API routes get a JSON 404 instead of falling through to the SPA.
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Unknown API route.' });
  });

  // Body-parser failures (malformed JSON, oversized payloads) as JSON errors.
  app.use('/api', (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const errObj = err as { type?: string; status?: number; statusCode?: number };
    if (errObj?.type === 'entity.too.large') {
      res.status(413).json({ error: 'Request is too large. Try sending less code or text.' });
      return;
    }
    const status = errObj?.status ?? errObj?.statusCode;
    if (typeof status === 'number' && status >= 400 && status < 500) {
      res.status(status).json({ error: 'The request could not be read. Please try again.' });
      return;
    }
    console.error('[server] Unexpected API error:', err);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    const indexFile = path.join(distDir, 'index.html');
    if (fs.existsSync(indexFile)) {
      app.use(express.static(distDir));
      // SPA fallback. Written as plain middleware so it behaves the same on
      // Express 4 and Express 5 (their wildcard route syntaxes differ).
      app.use((req: Request, res: Response, next: NextFunction) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          next();
          return;
        }
        res.sendFile(indexFile);
      });
    } else {
      console.warn(
        '[server] No production build found in dist/. Run "npm run build" first, or use "npm run dev".'
      );
    }
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`CSharpTutor is running at http://localhost:${PORT}`);
    if (!process.env.GEMINI_API_KEY?.trim()) {
      console.warn(
        '[server] GEMINI_API_KEY is not set. Add it to a .env file (see .env.example) to enable the AI features.'
      );
    }
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `Port ${PORT} is already in use. Close the other program or set a different PORT in your .env file.`
      );
    } else {
      console.error('CSharpTutor server error:', err);
    }
    process.exit(1);
  });
}

startServer().catch((err) => {
  console.error('Failed to start CSharpTutor server:', err);
  process.exit(1);
});
