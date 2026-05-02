const BASE = 'https://api.groq.com/openai/v1';

type JsonRecord = Record<string, any>;

function getGroqKey() {
  return process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || '';
}

function sendJson(res: any, status: number, body: JsonRecord) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(body));
}

async function chatCompletion(body: JsonRecord, jsonMode = false) {
  const groqKey = getGroqKey();
  if (!groqKey) {
    return new Response('Missing GROQ_API_KEY on the server.', { status: 500 });
  }

  return fetch(`${BASE}/chat/completions`, {
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
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
}

async function transcribe(body: JsonRecord) {
  const groqKey = getGroqKey();
  if (!groqKey) {
    return new Response('Missing GROQ_API_KEY on the server.', { status: 500 });
  }

  const bytes = Uint8Array.from(Buffer.from(body.audioBase64 || '', 'base64'));
  const formData = new FormData();
  formData.append('file', new Blob([bytes], { type: body.mimeType || 'audio/webm' }), body.filename || 'recording.webm');
  formData.append('model', 'whisper-large-v3');
  formData.append('language', 'en');
  formData.append('temperature', '0');
  formData.append('prompt', 'Technical interview answer about software engineering, computer science, algorithms, data structures, system design, machine learning, or career experience.');

  return fetch(`${BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${groqKey}` },
    body: formData,
  });
}

async function tts(body: JsonRecord) {
  const groqKey = getGroqKey();
  if (!groqKey) {
    return new Response('Missing GROQ_API_KEY on the server.', { status: 500 });
  }

  return fetch(`${BASE}/audio/speech`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'canopylabs/orpheus-v1-english',
      input: body.text || '',
      voice: 'tara',
      response_format: 'wav',
    }),
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const operation = body.operation;

  try {
    if (operation === 'tts') {
      const upstream = await tts(body);
      if (!upstream.ok) {
        sendJson(res, upstream.status, { error: await upstream.text() });
        return;
      }
      const audio = Buffer.from(await upstream.arrayBuffer());
      res.status(200).setHeader('Content-Type', 'audio/wav');
      res.send(audio);
      return;
    }

    if (operation === 'transcribe') {
      const upstream = await transcribe(body);
      if (!upstream.ok) {
        sendJson(res, upstream.status, { error: await upstream.text() });
        return;
      }
      sendJson(res, 200, await upstream.json());
      return;
    }

    const wantsJson = operation === 'json' || operation === 'followUp' || operation === 'star';
    const upstream = await chatCompletion(body, wantsJson);
    if (!upstream.ok) {
      sendJson(res, upstream.status, { error: await upstream.text() });
      return;
    }

    const data = await upstream.json();
    sendJson(res, 200, { content: data.choices?.[0]?.message?.content?.trim() || '' });
  } catch (error: any) {
    sendJson(res, 500, { error: error?.message || 'Groq proxy failed.' });
  }
}
