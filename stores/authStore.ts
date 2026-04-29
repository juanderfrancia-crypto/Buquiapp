import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  session: any | null;
  loading: boolean;
  setSession: (session: any) => void;
  setUser: (user: User | null) => void;
  signOut: () => Promise<void>;
  fetchUser: (userId: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,

  setSession: (session) => {
    if (!session) {
      set({ session: null, user: null, loading: false });
    } else {
      set({ session, loading: true });
    }
  },

  setUser: (user) => set({ user }),

  fetchUser: async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    set({ user: data ?? null, loading: false });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },
}));
