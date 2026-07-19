import { emit, listen } from '@tauri-apps/api/event';
import type { SyncState } from '../types';

const EVENT_NAME = 'pdf-presenter-sync';
const STORAGE_KEY = 'pdf-presenter-state';
const instanceId = crypto.randomUUID();

interface SyncMessage {
  sourceId: string;
  state: SyncState;
}

const defaultState: SyncState = {
  pdfBlobUrl: null,
  fileName: null,
  sessionCode: null,
  numPages: 0,
  currentPage: 1,
  notesByPage: {},
  videosByPage: {},
  isRunning: false,
  overallElapsedMs: 0,
  overallStartedAt: null,
  slideElapsedMs: 0,
  slideStartedAt: null,
};

// The presenter window is a second WebviewWindow running this same bundle from scratch, so it
// needs to read the main window's live session out of localStorage to sync up on open. The main
// window itself should never do this: silently resuming a stale session across an actual app
// restart is surprising (a leftover PDF from last time's talk showing up unannounced), so it
// always starts clean and lets the user pick a PDF explicitly.
const isPresenterWindow = new URLSearchParams(window.location.search).has('presenter');

function loadInitial(): SyncState {
  if (!isPresenterWindow) return defaultState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultState, ...(JSON.parse(raw) as Partial<SyncState>) };
  } catch {
    return defaultState;
  }
  return defaultState;
}

let state: SyncState = loadInitial();
const listeners = new Set<() => void>();

void listen<SyncMessage>(EVENT_NAME, (event) => {
  if (event.payload.sourceId === instanceId) return;
  state = event.payload.state;
  listeners.forEach((listener) => listener());
});

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be unavailable (e.g. private mode) — sync still works via BroadcastChannel
  }
}

export function getState(): SyncState {
  return state;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function updateState(
  patch: Partial<SyncState> | ((prev: SyncState) => Partial<SyncState>),
): void {
  const resolved = typeof patch === 'function' ? patch(state) : patch;
  state = { ...state, ...resolved };
  persist();
  void emit(EVENT_NAME, { sourceId: instanceId, state });
  listeners.forEach((listener) => listener());
}
