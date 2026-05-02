import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  authSubscription: { unsubscribe: () => void } | null;
  setUser: (user: User | null) => void;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  authSubscription: null,
  setUser: (user) => set({ user }),
  initialize: async () => {
    if (!isSupabaseConfigured) {
      set({ user: null, isLoading: false });
      return;
    }

    // Initial fetch
    const { data: { session } } = await supabase.auth.getSession();
    set({ user: session?.user || null, isLoading: false });
    
    // Subscribe to changes (login/logout events)
    set((state) => {
      state.authSubscription?.unsubscribe();
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        set({ user: session?.user || null });
      });
      return { authSubscription: subscription };
    });
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  }
}));
