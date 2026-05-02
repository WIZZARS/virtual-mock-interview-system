import { fileURLToPath } from 'url';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GROQ_BASE = 'https://api.groq.com/openai/v1';

function readBody(req: import('node:http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function groqDevProxy(): Plugin {
  return {
    name: 'groq-dev-proxy',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '');
      const groqKey = env.GROQ_API_KEY || env.VITE_GROQ_API_KEY || '';

      server.middlewares.use('/api/groq', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        if (!groqKey) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Missing GROQ_API_KEY in .env.local.' }));
          return;
        }

        try {
          const body = JSON.parse(await readBody(req) || '{}');
          const operation = body.operation;

          if (operation === 'tts') {
            const upstream = await fetch(`${GROQ_BASE}/audio/speech`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'canopylabs/orpheus-v1-english',
                input: body.text || '',
                voice: 'tara',
                response_format: 'wav',
              }),
            });

            res.statusCode = upstream.status;
            if (!upstream.ok) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: await upstream.text() }));
              return;
            }

            res.setHeader('Content-Type', 'audio/wav');
            res.end(Buffer.from(await upstream.arrayBuffer()));
            return;
          }

          if (operation === 'transcribe') {
            const bytes = Uint8Array.from(Buffer.from(body.audioBase64 || '', 'base64'));
            const formData = new FormData();
            formData.append('file', new Blob([bytes], { type: body.mimeType || 'audio/webm' }), body.filename || 'recording.webm');
            formData.append('model', 'whisper-large-v3');
            formData.append('language', 'en');
            formData.append('temperature', '0');
            formData.append('prompt', 'Technical interview answer about software engineering, computer science, algorithms, data structures, system design, machine learning, or career experience.');

            const upstream = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${groqKey}` },
              body: formData,
            });

            res.statusCode = upstream.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(upstream.ok ? JSON.stringify(await upstream.json()) : JSON.stringify({ error: await upstream.text() }));
            return;
          }

          const wantsJson = operation === 'json' || operation === 'followUp' || operation === 'star';
          const upstream = await fetch(`${GROQ_BASE}/chat/completions`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              messages: [
                { role: 'system', content: body.system || '' },
                { role: 'user', content: body.user || '' },
              ],
              temperature: body.temperature ?? 0.7,
              max_tokens: body.maxTokens ?? 300,
              ...(wantsJson ? { response_format: { type: 'json_object' } } : {}),
            }),
          });

          res.statusCode = upstream.status;
          res.setHeader('Content-Type', 'application/json');
          if (!upstream.ok) {
            res.end(JSON.stringify({ error: await upstream.text() }));
            return;
          }

          const data = await upstream.json();
          res.end(JSON.stringify({ content: data.choices?.[0]?.message?.content?.trim() || '' }));
        } catch (error: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: error?.message || 'Groq proxy failed.' }));
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [groqDevProxy(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
