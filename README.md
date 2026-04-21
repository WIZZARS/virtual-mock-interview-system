# 🎯 InterviewIQ — AI Mock Interview System

> Practice interviews like the ones at Google, Meta, Amazon — powered by Gemini AI.

![InterviewIQ](https://img.shields.io/badge/Built%20with-Gemini%20AI-4285F4?style=for-the-badge&logo=google)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-3ECF8E?style=for-the-badge&logo=supabase)

---

## ✨ Features

- 🎙️ **Voice Recording** — Speak your answers, Gemini AI transcribes them in real-time
- 🤖 **AI Interview Coach** — Gemini 2.5 Flash acts as a supportive mentor, giving feedback after every answer
- 📄 **PDF Resume Parsing** — Upload your resume and AI tailors questions to your background
- 👁️ **Vision Tracking** — MediaPipe monitors your eye contact and posture during the interview
- 📊 **Detailed Report** — Get scored on communication, confidence, body language, eye contact, and speaking pace
- 📥 **PDF Report Export** — Download your performance report after each session
- 🗂️ **Session History** — All past interviews saved to your dashboard
- 🔐 **Auth** — Supabase authentication (email/password) + guest mode

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A [Gemini API key](https://aistudio.google.com/apikey)
- A [Supabase](https://supabase.com) project

### Installation

```bash
# Install dependencies
npm install

# Create your environment file
cp .env.local.example .env.local
```

### Environment Variables

Create a `.env.local` file in the root with:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in **Google Chrome** (required for best audio support).

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + Custom CSS animations |
| AI | Google Gemini 2.5 Flash (`@google/genai`) |
| Audio | MediaRecorder API + Web Audio API |
| Vision | MediaPipe Tasks Vision |
| Auth & DB | Supabase |
| State | Zustand |
| PDF | pdfjs-dist (parse) + html2pdf.js (export) |

---

## 📁 Project Structure

```
virtual-mock-interview-system/
├── App.tsx                    # Core AI interview engine
├── components/
│   ├── InterviewScreen.tsx    # Live interview UI + recording
│   └── ReportScreen.tsx       # Performance report + PDF export
├── src/
│   ├── pages/
│   │   ├── LandingPage.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── SetupScreen.tsx    # Resume upload + track selection
│   │   └── Dashboard.tsx      # Session history
│   ├── hooks/
│   │   └── useVisionTracker.ts # MediaPipe eye contact + posture
│   ├── store/
│   │   ├── useInterviewStore.ts
│   │   └── useAuthStore.ts
│   └── lib/
│       └── supabase.ts
└── schema.sql                 # Supabase database schema
```

---

## 🎮 How It Works

1. **Setup** — Select your interview track (HR, Technical, etc.), difficulty, and optionally upload your resume PDF
2. **Interview** — AI coach asks questions, you speak your answer → recording auto-starts after AI finishes speaking
3. **Submit** — Click the red **Submit Answer** button when done speaking (or it auto-submits after 5s of silence)
4. **Feedback** — AI transcribes your audio, gives coaching feedback, then asks the next question
5. **Report** — After 15 questions, get a detailed performance report with scores and improvement tips

---

## 🗄️ Database Setup

Run `schema.sql` in your Supabase SQL editor to create the required tables.

---

## 👨‍💻 Author

Built by **Prabik Raj Tripathi** 
GitHub: [@WIZZARS](https://github.com/WIZZARS)
