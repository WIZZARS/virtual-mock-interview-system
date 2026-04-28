import { create } from 'zustand';

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
  init: () => void;
}

function applyTheme(isDark: boolean) {
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: false,
  toggle: () =>
    set((state) => {
      const next = !state.isDark;
      applyTheme(next);
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return { isDark: next };
    }),
  init: () => {
    const saved = localStorage.getItem('theme');
    const prefersDark =
      saved === 'dark' ||
      (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    applyTheme(prefersDark);
    set({ isDark: prefersDark });
  },
}));
