const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY;
const BASE = 'https://api.groq.com/openai/v1';

export async function groqChat(system: string, user: string, maxTokens = 300): Promise<string> {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: 0.7, max_tokens: maxTokens })
  });
  if (!res.ok) throw new Error(`Groq chat: ${res.status}`);
  const d = await res.json();
  return d.choices[0]?.message?.content?.trim() || '';
}

export async function groqJsonChat(system: string, user: string): Promise<string> {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: 0.3, max_tokens: 2000, response_format: { type: 'json_object' } })
  });
  if (!res.ok) throw new Error(`Groq JSON: ${res.status}`);
  const d = await res.json();
  return d.choices[0]?.message?.content?.trim() || '';
}

export async function groqTranscribe(audioBlob: Blob): Promise<string> {
  const fd = new FormData();
  fd.append('file', audioBlob, 'recording.webm');
  fd.append('model', 'whisper-large-v3');
  fd.append('language', 'en');
  fd.append('temperature', '0');
  fd.append('prompt', 'This is a mock job interview conversation. The candidate is answering interview questions about their background, skills, projects, and experience.');
  const res = await fetch(`${BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_KEY}` },
    body: fd
  });
  if (!res.ok) throw new Error(`Groq STT: ${res.status}`);
  const d = await res.json();
  return d.text?.trim() || '';
}

export async function groqTTS(text: string): Promise<ArrayBuffer> {
  const res = await fetch(`${BASE}/audio/speech`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'canopylabs/orpheus-v1-english', input: text, voice: 'tara', response_format: 'wav' })
  });
  if (!res.ok) throw new Error(`Groq TTS: ${res.status}`);
  return res.arrayBuffer();
}
