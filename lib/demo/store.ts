
import { createDemoState, type DemoState } from './seed';

const STORAGE_KEY = 'frameflux-demo-state-v1';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function cloneState(state: DemoState) {
  return structuredClone(state);
}

export function loadDemoState(): DemoState {
  if (!canUseStorage()) return createDemoState();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createDemoState();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }

    const parsed = JSON.parse(raw) as Partial<DemoState>;
    const defaults = createDemoState();
    if (!parsed || typeof parsed !== 'object' || (parsed.version ?? 0) > defaults.version) {
      const reset = createDemoState();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reset));
      return reset;
    }

    const migrated: DemoState = {
      ...defaults,
      ...parsed,
      version: defaults.version,
      shares: Array.isArray(parsed.shares) ? parsed.shares : defaults.shares,
      preferences: parsed.preferences && typeof parsed.preferences === 'object'
        ? { ...defaults.preferences, ...parsed.preferences }
        : defaults.preferences,
      quickActions: parsed.quickActions || defaults.quickActions,
    };
    saveDemoState(migrated);
    return migrated;
  } catch {
    return createDemoState();
  }
}

export function saveDemoState(state: DemoState) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function updateDemoState(
  updater: (state: DemoState) => void,
): DemoState {
  const state = loadDemoState();
  updater(state);
  saveDemoState(state);
  return state;
}

export function resetDemoState() {
  const next = createDemoState();
  if (canUseStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return cloneState(next);
}

export function getDemoUser() {
  return loadDemoState().user;
}
