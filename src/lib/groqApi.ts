const API_ENDPOINT = '/api/groq';

type GroqOperation =
  | 'chat'
  | 'json'
  | 'followUp'
  | 'star'
  | 'transcribe'
  | 'tts';

async function postJson<T>(operation: GroqOperation, payload: Record<string, unknown>): Promise<T> {
  const res = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation, ...payload }),
  });

  if (!res.ok) {
    const details = await res.text().catch(() => '');
    throw new Error(`Groq ${operation}: ${res.status}${details ? ` - ${details}` : ''}`);
  }

  return res.json() as Promise<T>;
}

function parseJsonObject<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value || '{}') as T;
  } catch {
    return fallback;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(',')[1] || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Decides whether the interviewer should ask a follow-up question.
 * Returns { needsFollowUp: boolean, followUpQuestion: string }
 */
export async function groqFollowUpCheck(
  track: string,
  difficulty: string,
  questionAsked: string,
  candidateAnswer: string
): Promise<{ needsFollowUp: boolean; followUpQuestion: string }> {
  const system = `You are an expert interview coach analyzing a mock interview for a ${track} role at ${difficulty} level.
Your job is to decide if the candidate's answer is complete or if it needs a targeted follow-up question.

Rules:
- Return needsFollowUp: true ONLY if the answer is vague, incomplete, or misses an important aspect.
- CRITICAL: If the answer is under 15 words (e.g., just saying "Yes", "No", or dodging the question), you MUST return needsFollowUp: true and ask them to actually answer the question.
- If the answer is thorough and covers the key points, return needsFollowUp: false.
- If needsFollowUp is true, write a short, specific follow-up question (1 sentence, no markdown) challenging them to elaborate.
- If needsFollowUp is false, set followUpQuestion to an empty string.
- Only ~40% of standard answers should get follow-ups, but 100% of evasive/one-word answers MUST get a follow-up.`;

  const user = `Question asked: "${questionAsked}"
Candidate's answer: "${candidateAnswer}"

Respond ONLY with valid JSON:
{ "needsFollowUp": boolean, "followUpQuestion": string }`;

  const { content } = await postJson<{ content: string }>('followUp', {
    system,
    user,
    temperature: 0.2,
    maxTokens: 120,
  });

  return parseJsonObject(content, { needsFollowUp: false, followUpQuestion: '' });
}

/**
 * STAR-specific follow-up checker for Behavioral STAR track.
 * Identifies exactly which S/T/A/R components are present or missing
 * and generates a precise follow-up targeting the most critical gap.
 */
export async function groqStarCheck(
  questionAsked: string,
  candidateAnswer: string
): Promise<{
  presentComponents: string[];
  missingComponents: string[];
  followUpQuestion: string;
}> {
  const system = `You are an expert behavioral interview coach who deeply understands the STAR framework.

Analyze the candidate's answer and identify which STAR components are present and which are missing or too vague.

STAR definitions (be strict):
- Situation: Specific context - where, when, what was happening. Vague mentions don't count.
- Task: The candidate's specific personal responsibility or challenge. "We had to do X" without their role doesn't count.
- Action: Specific steps the candidate personally took. Must use "I did X" - "we did X" without personal contribution doesn't count.
- Result: Measurable or concrete outcome - numbers, feedback received, what changed. "It went well" doesn't count.

Priority of missing components to follow up on:
1. Result (most commonly skipped, most important to interviewers)
2. Action (if only "we" was used, no personal contribution)
3. Situation (too vague to understand context)
4. Task (their specific role unclear)

Rules:
- Only mark a component as present if it has real, specific content.
- Generate ONE natural, conversational follow-up question for the highest-priority missing component.
- If all 4 components are well-covered, return empty missingComponents and empty followUpQuestion.`;

  const user = `Behavioral question: "${questionAsked}"
Candidate's answer: "${candidateAnswer}"

Respond ONLY with valid JSON:
{
  "presentComponents": ["Situation", "Task"],
  "missingComponents": ["Action", "Result"],
  "followUpQuestion": "That's helpful context - what specific steps did YOU personally take to address this?"
}`;

  const { content } = await postJson<{ content: string }>('star', {
    system,
    user,
    temperature: 0.15,
    maxTokens: 200,
  });

  const parsed = parseJsonObject(content, {
    presentComponents: [],
    missingComponents: [],
    followUpQuestion: '',
  });

  return {
    presentComponents: parsed.presentComponents || [],
    missingComponents: parsed.missingComponents || [],
    followUpQuestion: parsed.followUpQuestion || '',
  };
}

export async function groqChat(system: string, user: string, maxTokens = 300): Promise<string> {
  const { content } = await postJson<{ content: string }>('chat', {
    system,
    user,
    temperature: 0.7,
    maxTokens,
  });
  return content.trim();
}

export async function groqJsonChat(system: string, user: string): Promise<string> {
  const { content } = await postJson<{ content: string }>('json', {
    system,
    user,
    temperature: 0.3,
    maxTokens: 2000,
  });
  return content.trim();
}

// These are patterns Whisper hallucinates on near-silent audio.
// Only block phrases that could NEVER appear in a genuine interview answer.
const WHISPER_HALLUCINATIONS = [
  'thank you for watching',
  'please subscribe',
  'subtitles by',
  'transcribed by',
  'like and subscribe',
  'click the bell',
];

export async function groqTranscribe(audioBlob: Blob): Promise<string> {
  const { text } = await postJson<{ text: string }>('transcribe', {
    audioBase64: await blobToBase64(audioBlob),
    mimeType: audioBlob.type || 'audio/webm',
    filename: 'recording.webm',
  });

  const cleanText = text?.trim() || '';
  const lower = cleanText.toLowerCase();
  if (WHISPER_HALLUCINATIONS.some(phrase => lower.includes(phrase))) {
    console.warn('Whisper hallucination detected, discarding:', cleanText);
    return '';
  }

  return cleanText;
}

export async function groqTTS(text: string): Promise<ArrayBuffer> {
  const res = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation: 'tts', text }),
  });

  if (!res.ok) throw new Error(`Groq TTS: ${res.status}`);
  return res.arrayBuffer();
}
