<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Groq-LLaMA_3.3-F55036?style=for-the-badge&logo=meta&logoColor=white" />
  <img src="https://img.shields.io/badge/MediaPipe-Vision_AI-4285F4?style=for-the-badge&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-Auth_%26_DB-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/Deployed-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />
</p>

# 🎙️ InterviewIQ — AI-Powered Virtual Mock Interview System

> **Practice interviews with an AI coach that listens, responds, and gives real-time behavioral feedback on your eye contact, posture, and communication skills.**

🔗 **Live Demo:** [https://aiimterview.dev](https://aiinterviews.dev)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [AI & ML Pipeline](#ai--ml-pipeline)
- [Project Structure](#project-structure)
- [Pages & Routes](#pages--routes)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Screenshots](#screenshots)

---

## Overview

InterviewIQ is a full-stack, AI-powered mock interview platform that simulates real interview experiences. It combines **Groq's LLaMA 3.3 70B** for conversational AI and speech transcription, **Google MediaPipe Face Landmarker** for real-time behavioral coaching via webcam, and **Supabase** for authentication and persistent session tracking.

The system conducts a structured **15-question interview session** (30–40 min), provides live coaching tips during the interview, and generates a detailed AI-assessed performance report with scores across 6 dimensions at the end.

---

## Key Features

### 🤖 AI Interview Engine (Groq + LLaMA 3.3)
- **Conversational AI Interviewer** — Natural, multi-turn voice conversation powered by Groq's `llama-3.3-70b-versatile` model.
- **Structured Interview Flow** — 15 questions split into phases: icebreakers (Q1–3), core domain (Q4–8), deep dives (Q9–12), and behavioral STAR wrap-up (Q13–15).
- **Context-Aware Questions** — Upload your **resume (PDF)** and paste a **job description** — the AI tailors questions to your specific profile and target role.
- **Per-Answer Coaching** — The AI gives one sentence of coaching feedback after each answer before asking the next question.
- **Fallback & Retry** — If the AI connection drops, the system uses a hardcoded fallback opener and gracefully prompts the user to repeat.

### 🎤 Voice Pipeline (Speech-to-Text + Text-to-Speech)
- **Groq Whisper Large V3** — User's spoken answers are recorded via the browser's `MediaRecorder` API and sent to Groq's Whisper endpoint for transcription.
- **Browser Speech Synthesis** — AI responses are spoken aloud using the Web Speech API with preferred Google/Microsoft English voices.
- **Automatic Silence Detection** — After the user finishes speaking, 5 seconds of silence auto-submits the recording.
- **Audio Level Visualization** — Real-time waveform bars powered by the Web Audio API `AnalyserNode`.

### 👁️ Real-Time Vision AI Coaching (MediaPipe Face Landmarker)
The `useVisionTracker` hook runs Google MediaPipe's Face Landmarker model directly in the browser (GPU-accelerated via WebAssembly) at **10 FPS**. It monitors **8 behavioral metrics** in real-time:

| Metric | What It Detects | How |
|---|---|---|
| **Eye Contact** | Gaze drifting away from camera | Blendshape scores: `eyeLookOutLeft/Right`, `eyeLookInLeft/Right`, `eyeLookUp/Down` — threshold > 0.45 |
| **Posture / Slouch** | Leaning forward or slouching | Z-axis difference between chin (landmark 152) and top of head (landmark 10) — threshold > 0.045 |
| **Head Tilt** | Head tilting sideways | Y-position difference between left cheek (landmark 234) and right cheek (landmark 454) — threshold > 0.04 |
| **Facial Tension** | Stressed or stiff expression | Combined blendshape scores: `browDown`, `mouthFrown`, `eyeSquint` — threshold > 0.6 |
| **Camera Proximity** | Too close or too far from camera | Face bounding box area (cheek width × chin-to-head height) — too close > 0.18, too far < 0.03 |
| **Fidgeting** | Excessive head movement | Rolling average of frame-to-frame nose position deltas over 30 frames (~3s) — threshold > 0.008 |
| **Face Visibility** | Face leaving the frame | No face detected for > 20 consecutive frames (~2s) |
| **Positive Reinforcement** | Everything looking great | All metrics passing for 80+ consecutive frames (~8s), max once per 45s |

**Intelligent Feedback System:**
- Requires **sustained bad behavior** (15+ consecutive frames, ~1.5s) before alerting — no false positives from brief glances.
- **Per-category cooldowns** (12–25s) prevent tip spam.
- **Randomized tip pools** (6–8 unique tips per category) with no-repeat logic within a session.
- Tips are classified as `success`, `warning`, or `info` severity with matching color-coded UI.

### 📊 AI Performance Report
After the interview ends, the full transcript is sent to Groq for analysis. The AI generates a **strict, honest JSON report** with:
- **6 scored dimensions** (0.0–10.0): Communication, Confidence, Body Language, Eye Contact, Speaking Pace, Overall.
- **Detailed per-dimension analysis** with written feedback.
- **Top 3 strengths** identified.
- **5 actionable improvement tips**.
- **Vision data integration** — Eye contact and posture scores come directly from MediaPipe tracking data, not AI estimation.
- **Anti-inflation rules** — Short sessions (<2 min) or few answers (<3) are scored harshly to prevent false praise.
- **PDF download** — Reports can be exported as styled A4 PDFs via `html2pdf.js`.

### 📈 Dashboard & Progress Tracking
- **Session History** — All past interview sessions with date, track, difficulty, and score.
- **Performance Growth Chart** — Area chart (Recharts) showing score trends over time.
- **Achievement Badges** — Gamification system:
  - 🏆 **Eye Contact Pro** — Score 9.0+ on eye contact or body language.
  - ⭐ **90+ Club** — Achieve an overall score of 9.0+.
  - ⚡ **5-Session Streak** — Complete 5+ sessions.
- **Report Modal** — Click any past session to view the full report breakdown.

### 🔐 Authentication
- **Email + Password** sign-up/sign-in via Supabase Auth.
- **Guest Mode** — Users can skip login and practice without an account (sessions won't be saved).
- **Protected Routes** — Dashboard requires authentication; interview is accessible to all.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                        │
│                                                                 │
│  ┌──────────┐  ┌────────────┐  ┌───────────────────────────┐   │
│  │ React 19 │  │  Zustand   │  │  MediaPipe Face Landmarker │   │
│  │  + Vite  │  │  (State)   │  │  (GPU WASM, 10 FPS)       │   │
│  └────┬─────┘  └─────┬──────┘  └─────────────┬─────────────┘   │
│       │              │                        │                  │
│       │    ┌─────────┴────────┐    ┌─────────┴──────────┐      │
│       │    │  MediaRecorder   │    │  useVisionTracker   │      │
│       │    │  (Audio Capture) │    │  (8 Metric Analysis)│      │
│       │    └────────┬─────────┘    └────────────────────┘      │
│       │             │                                           │
└───────┼─────────────┼───────────────────────────────────────────┘
        │             │
        ▼             ▼
┌───────────────────────────────────────┐
│          GROQ API (Cloud)             │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │ llama-3.3-70b-versatile         │  │
│  │ • Chat Completions (Interview)  │  │
│  │ • JSON Mode (Report Generation) │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │ whisper-large-v3                │  │
│  │ • Audio Transcription (STT)     │  │
│  └─────────────────────────────────┘  │
└───────────────────────────────────────┘

┌───────────────────────────────────────┐
│        SUPABASE (Cloud)               │
│                                       │
│  ┌─────────────┐  ┌───────────────┐  │
│  │  Auth        │  │ PostgreSQL DB │  │
│  │  (Email/PW)  │  │ session_scores│  │
│  └─────────────┘  └───────────────┘  │
└───────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | React 19 + TypeScript 5.8 | UI components and type safety |
| **Build Tool** | Vite 6 | Fast HMR dev server and bundling |
| **Styling** | Tailwind CSS 3.4 | Utility-first CSS with custom dark theme |
| **State Management** | Zustand 5 | Lightweight stores for auth and interview state |
| **Routing** | React Router 7 | Client-side SPA routing |
| **AI Conversation** | Groq API (LLaMA 3.3 70B) | Interview question generation and coaching |
| **Speech-to-Text** | Groq Whisper Large V3 | Transcription of user's spoken answers |
| **Text-to-Speech** | Web Speech API (SpeechSynthesis) | Speaking AI responses aloud |
| **Vision AI** | MediaPipe Face Landmarker | Real-time face tracking and behavioral analysis |
| **Authentication** | Supabase Auth | Email/password sign-up and session management |
| **Database** | Supabase PostgreSQL | Persistent session scores and report storage |
| **Resume Parsing** | pdf.js (pdfjs-dist) | Client-side PDF text extraction |
| **Charts** | Recharts | Dashboard performance growth visualization |
| **PDF Export** | html2pdf.js | Download interview reports as PDF |
| **Icons** | Lucide React | Consistent icon library |
| **Analytics** | Vercel Analytics + Speed Insights | Production performance monitoring |
| **Deployment** | Vercel | Auto-deploy from GitHub |

---

## AI & ML Pipeline

### Interview Flow (Step by Step)

```
1. User selects Track (HR/Technical/General) + Difficulty (Fresher/Mid/Senior)
2. Optionally uploads Resume (PDF parsed client-side) and pastes Job Description
3. Camera + Mic permissions granted
4. AI generates first question via Groq LLaMA 3.3 → spoken via Web Speech API
5. MediaPipe Face Landmarker starts analyzing webcam at 10 FPS
   └─ Detects: eye contact, posture, head tilt, expression, proximity, fidgeting
   └─ Emits real-time coaching tips with cooldown + streak logic
6. User speaks answer → MediaRecorder captures audio
   └─ Web Audio API AnalyserNode monitors volume levels for waveform visualization
   └─ 5-second silence detection auto-submits the recording
7. Audio blob → Groq Whisper Large V3 → text transcription
8. Transcription + conversation history → Groq LLaMA 3.3 → next question + feedback
9. Steps 4–8 repeat for 15 questions
10. Full transcript + MediaPipe metrics → Groq LLaMA 3.3 (JSON mode) → Performance Report
11. Report saved to Supabase (if authenticated) with all 6 dimension scores
12. User can download report as PDF, start a new session, or view dashboard
```

### Groq API Endpoints Used

| Endpoint | Model | Purpose |
|---|---|---|
| `POST /chat/completions` | `llama-3.3-70b-versatile` | Conversational interview (temp: 0.7, max_tokens: 300) |
| `POST /chat/completions` | `llama-3.3-70b-versatile` | Report generation in JSON mode (temp: 0.3, max_tokens: 2000) |
| `POST /audio/transcriptions` | `whisper-large-v3` | Speech-to-text transcription |

### MediaPipe Configuration

```typescript
FaceLandmarker.createFromOptions(vision, {
  baseOptions: {
    modelAssetPath: "face_landmarker/float16/1/face_landmarker.task",
    delegate: "GPU"  // WebAssembly GPU acceleration
  },
  outputFaceBlendshapes: true,  // 52 facial blendshapes
  runningMode: "VIDEO",
  numFaces: 1
});
```

---

## Project Structure

```
virtual-mock-interview-system/
├── index.html                  # Entry HTML with meta tags and Google verification
├── index.tsx                   # React DOM root mount
├── App.tsx                     # Main interview engine (743 lines)
│                               # - Audio recording pipeline
│                               # - Groq API integration
│                               # - Interview state machine
│                               # - TTS and silence detection
├── types.ts                    # Shared TypeScript interfaces
├── vite.config.ts              # Vite build configuration
├── tailwind.config.js          # Custom dark theme and animations
├── vercel.json                 # Vercel SPA rewrites + static file rules
├── schema.sql                  # Supabase PostgreSQL schema
├── package.json                # Dependencies and scripts
│
├── src/
│   ├── MainRouter.tsx          # React Router setup with protected routes
│   ├── index.css               # Global styles, custom animations, glassmorphism
│   │
│   ├── pages/
│   │   ├── LandingPage.tsx     # Marketing landing page with features grid
│   │   ├── LoginScreen.tsx     # Email auth + guest mode
│   │   ├── SetupScreen.tsx     # Interview config (track, difficulty, resume, JD)
│   │   └── Dashboard.tsx       # Performance charts, session history, badges
│   │
│   ├── hooks/
│   │   └── useVisionTracker.ts # MediaPipe Face Landmarker integration (438 lines)
│   │                           # - 8 behavioral metrics
│   │                           # - Streak-based alert logic
│   │                           # - Randomized tip pools
│   │                           # - Per-category cooldowns
│   │
│   ├── store/
│   │   ├── useAuthStore.ts     # Supabase auth state (Zustand)
│   │   └── useInterviewStore.ts # Interview config state (Zustand)
│   │
│   └── lib/
│       ├── groqApi.ts          # Groq REST API wrapper (chat, JSON, STT)
│       ├── supabase.ts         # Supabase client initialization
│       └── utils.ts            # Utility functions (cn)
│
├── components/
│   ├── InterviewScreen.tsx     # Live interview UI (camera, transcript, coaching)
│   ├── ReportScreen.tsx        # Post-interview performance report with PDF export
│   ├── TopicSelector.tsx       # Interview track selection component
│   └── Icons.tsx               # Custom SVG icons
│
└── public/
    ├── sitemap.xml             # SEO sitemap for Google Search Console
    └── robots.txt              # Crawler directives
```

---

## Pages & Routes

| Route | Component | Auth Required | Description |
|---|---|---|---|
| `/` | `LandingPage` | ❌ | Marketing page with features, how-it-works, and CTAs |
| `/login` | `LoginScreen` | ❌ | Email sign-up/sign-in + guest mode option |
| `/setup` | `SetupScreen` | ❌ | Configure track, difficulty, upload resume, paste JD, camera test |
| `/interview` | `App` (InterviewApp) | ❌ | Live AI interview with vision coaching |
| `/dashboard` | `Dashboard` | ✅ | Performance charts, session history, achievement badges |

---

## Database Schema

The app uses **Supabase PostgreSQL** with the following tables:

| Table | Purpose | Key Columns |
|---|---|---|
| `users` | Extended user profiles | `id` (UUID, FK → auth.users), `email`, `name` |
| `sessions` | Interview session metadata | `user_id`, `track`, `difficulty`, `duration`, `overall_score` |
| `session_scores` | Per-dimension score breakdown | `session_id`, `dimension`, `score` (0.0–10.0) |
| `transcripts` | Full interview transcripts | `session_id`, `speaker` (user/ai), `text` |
| `reports` | Generated report data | `session_id`, `markdown_content`, `pdf_url`, `share_token` |
| `badges` | Gamification achievements | `user_id`, `badge_type`, `earned_at` |

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and **npm**
- **Groq API Key** — Get one at [console.groq.com](https://console.groq.com)
- **Supabase Project** — Create one at [supabase.com](https://supabase.com) (for auth + database)

### Installation

```bash
# Clone the repository
git clone https://github.com/WIZZARS/virtual-mock-interview-system.git
cd virtual-mock-interview-system

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local
# Edit .env.local with your API keys (see below)

# Run the database schema
# Paste schema.sql contents into your Supabase SQL Editor and execute

# Start development server
npm run dev
```

The app will be running at `http://localhost:5173`.

---

## Environment Variables

Create a `.env.local` file in the project root:

```env
# Groq API (Required — powers the AI interviewer + speech transcription)
VITE_GROQ_API_KEY=gsk_your_groq_api_key_here

# Supabase (Required — powers auth + session persistence)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

| Variable | Required | Description |
|---|---|---|
| `VITE_GROQ_API_KEY` | ✅ | Groq API key for LLaMA 3.3 chat + Whisper STT |
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous/public key |

---

## Deployment

The app is deployed on **Vercel** with automatic deploys from the `main` branch.

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

### Vercel Configuration

The `vercel.json` includes SPA routing with static file exceptions:

```json
{
  "rewrites": [
    { "source": "/sitemap.xml", "destination": "/sitemap.xml" },
    { "source": "/robots.txt", "destination": "/robots.txt" },
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

### SEO

- **Google Search Console** verified via HTML meta tag
- **Sitemap** submitted at `/sitemap.xml`
- **robots.txt** allows all pages except `/dashboard` (authenticated content)
- Open Graph meta tags configured for social sharing

---

## Screenshots

### Landing Page
> Modern dark-themed landing page with gradient hero, feature cards, and smooth animations.

### Interview Setup
> 5-step configuration: select track → difficulty → paste JD → upload resume → camera/mic check.

### Live Interview
> Split-screen layout: webcam with live recording indicators (left), real-time AI coaching tips + live transcript (right).

### AI Coaching Tips
> Color-coded behavioral feedback cards (eye contact, posture, expression, proximity, fidgeting) with severity indicators.

### Performance Report
> Detailed score breakdown with animated counters, score bars, strengths, improvement tips, and PDF download.

### Dashboard
> Performance growth chart, session history table, and achievement badges with progress tracking.

---


---

<p align="center">
  <b>Built with ❤️ for students and job seekers.</b><br/>
  <i>Practice → Improve → Ace it.</i>
</p>
