'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api } from '@/lib/api/client';
import type { User } from '@/types/api';

interface AuthState {
  user: User | null;
  loading: boolean;
  isDemo: boolean;
  demoExpiresAt: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName?: string) => Promise<void>;
  startDemo: () => Promise<string>;
  endDemo: () => Promise<void>;
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
      isDemo: false,
      demoExpiresAt: null,

      setUser: (user) => set({ user }),
      setLoading: (loading) => set({ loading }),

      refresh: async () => {
        try {
          const userData = await api.getMe();
          set({ user: userData, loading: false });
        } catch {
          set({
            user: null,
            loading: false,
            isDemo: false,
            demoExpiresAt: null,
          });
          api.setToken(null);
        }
      },

      login: async (email: string, password: string) => {
        const { access_token } = await api.login({ email, password });
        api.setToken(access_token);
        set({ isDemo: false, demoExpiresAt: null });
        await get().refresh();
      },

      signup: async (email: string, password: string, fullName?: string) => {
        await api.signup({ email, password, full_name: fullName });
        const { access_token } = await api.login({ email, password });
        api.setToken(access_token);
        set({ isDemo: false, demoExpiresAt: null });
        await get().refresh();
      },

      startDemo: async () => {
        const session = await api.createDemoSession();
        api.setToken(session.access_token);
        set({
          user: session.user,
          loading: false,
          isDemo: true,
          demoExpiresAt: session.expires_at,
        });
        return session.sample_media.id;
      },

      endDemo: async () => {
        let requestError: unknown;
        try {
          await api.endDemoSession();
        } catch (error) {
          requestError = error;
        } finally {
          api.setToken(null);
          set({
            user: null,
            loading: false,
            isDemo: false,
            demoExpiresAt: null,
          });
        }
        if (requestError) {
          throw requestError;
        }
      },

      logout: async () => {
        if (get().isDemo) {
          try {
            await get().endDemo();
          } catch {
            // The local token is cleared even when the API is unreachable.
          }
          return;
        }

        try {
          await api.logout();
        } catch {
          // The local session is still cleared on logout.
        } finally {
          api.setToken(null);
          set({
            user: null,
            isDemo: false,
            demoExpiresAt: null,
          });
        }
      },
    }),
    {
      name: 'frameflux-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isDemo: state.isDemo,
        demoExpiresAt: state.demoExpiresAt,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.user) {
          state.refresh();
        } else if (state) {
          state.setLoading(false);
        }
      },
    },
  ),
);

export function useAuth() {
  return useAuthStore();
}
