'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api } from '@/lib/api/client';
import type { User } from '@/types/api';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: true,

      setUser: (user) => set({ user }),
      setLoading: (loading) => set({ loading }),

      refresh: async () => {
        try {
          const userData = await api.getMe();
          set({ user: userData, loading: false });
        } catch {
          set({ user: null, loading: false });
          api.setToken(null);
        }
      },

      login: async (email: string, password: string) => {
        const { access_token } = await api.login({ email, password });
        api.setToken(access_token);
        await get().refresh();
      },

      signup: async (email: string, password: string, fullName?: string) => {
        const { access_token } = await api.signup({ email, password, full_name: fullName });
        api.setToken(access_token);
        await get().refresh();
      },

      logout: async () => {
        try {
          await api.logout();
        } finally {
          api.setToken(null);
          set({ user: null });
        }
      },
    }),
    {
      name: 'frameflux-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.loading = false;
          if (state.user) {
            state.refresh();
          }
        }
      },
    }
  )
);

export function useAuth() {
  return useAuthStore();
}