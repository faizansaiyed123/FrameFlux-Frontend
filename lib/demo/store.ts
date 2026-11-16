
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

    const parsed = JSON.parse(raw) as DemoState;
    if (!parsed || parsed.version !== 1) {
      const reset = createDemoState();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reset));
      return reset;
    }

    return parsed;
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
