import { create } from 'zustand';

export interface InterviewStore {
  track: string | null;
  difficulty: string | null;
  jobDescription: string;
  resumeFileName: string | null;
  resumeText: string;
  vagueMode: boolean;
  setTrack: (track: string) => void;
  setDifficulty: (difficulty: string) => void;
  setJobDescription: (jd: string) => void;
  setResumeFileName: (name: string | null) => void;
  setResumeText: (text: string) => void;
  setVagueMode: (vagueMode: boolean) => void;
  reset: () => void;
}

export const useInterviewStore = create<InterviewStore>((set) => ({
  track: null,
  difficulty: "Fresher",
  jobDescription: '',
  resumeFileName: null,
  resumeText: '',
  vagueMode: false,
  setTrack: (track) => set({ track }),
  setDifficulty: (difficulty) => set({ difficulty }),
  setJobDescription: (jobDescription) => set({ jobDescription }),
  setResumeFileName: (resumeFileName) => set({ resumeFileName }),
  setResumeText: (resumeText) => set({ resumeText }),
  setVagueMode: (vagueMode) => set({ vagueMode }),
  reset: () => set({
    track: null,
    difficulty: "Fresher",
    jobDescription: '',
    resumeFileName: null,
    resumeText: '',
    vagueMode: false,
  }),
}));
