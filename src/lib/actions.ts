import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { getState, updateState } from './syncStore';
import { generateSessionCode } from './reactions';
import { clearPdfFile } from './pdfFileStore';
import { getSecondaryScreenPlacement } from './screenPlacement';

export function loadPdf(blobUrl: string, fileName: string, numPages: number): void {
  updateState({
    pdfBlobUrl: blobUrl,
    fileName,
    sessionCode: generateSessionCode(),
    numPages,
    currentPage: 1,
    notesByPage: {},
    videosByPage: {},
    isRunning: false,
    overallElapsedMs: 0,
    overallStartedAt: null,
    slideElapsedMs: 0,
    slideStartedAt: null,
  });
}

export function closePresentation(): void {
  const { pdfBlobUrl } = getState();
  if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
  void clearPdfFile();
  resetPresentation();
}

// Patches only the blob URL, leaving notes/timers/page position untouched — used when
// recovering from a stale blob URL (see usePdfDocument in hooks.ts), where a full
// loadPdf()/resetPresentation() would otherwise throw away everything we're trying to keep.
export function setPdfBlobUrl(url: string): void {
  updateState({ pdfBlobUrl: url });
}

export function resetPresentation(): void {
  updateState({
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
  });
}

export function goToPage(page: number): void {
  const state = getState();
  const clamped = Math.min(Math.max(1, page), state.numPages || 1);
  if (clamped === state.currentPage) return;
  const now = Date.now();
  updateState({
    currentPage: clamped,
    slideElapsedMs: 0,
    slideStartedAt: state.isRunning ? now : null,
  });
}

export function toggleTimer(): void {
  const state = getState();
  const now = Date.now();
  if (state.isRunning) {
    updateState({
      isRunning: false,
      overallElapsedMs: state.overallElapsedMs + (state.overallStartedAt ? now - state.overallStartedAt : 0),
      slideElapsedMs: state.slideElapsedMs + (state.slideStartedAt ? now - state.slideStartedAt : 0),
      overallStartedAt: null,
      slideStartedAt: null,
    });
  } else {
    updateState({
      isRunning: true,
      overallStartedAt: now,
      slideStartedAt: now,
    });
  }
}

export function setNote(page: number, text: string): void {
  const state = getState();
  updateState({ notesByPage: { ...state.notesByPage, [page]: text } });
}

export function setVideoUrl(page: number, url: string): void {
  const state = getState();
  const videosByPage = { ...state.videosByPage };
  if (url.trim()) {
    videosByPage[page] = url.trim();
  } else {
    delete videosByPage[page];
  }
  updateState({ videosByPage });
}

// Returns false when there's no second monitor to put the presenter window on — the caller
// should fall back to swapping the presenter view into the current window instead of opening
// a second one that would just float over the fullscreen presentation on the same screen.
export async function openPresenterWindow(): Promise<boolean> {
  const existing = await WebviewWindow.getByLabel('presenter');
  if (existing) {
    await existing.setFocus();
    return true;
  }

  const placement = await getSecondaryScreenPlacement();
  if (!placement) return false;

  const url = new URL(window.location.href);
  url.searchParams.set('presenter', '1');
  const relativeUrl = url.pathname + url.search;

  new WebviewWindow('presenter', {
    url: relativeUrl,
    title: 'TENSOR — Presenter',
    x: placement.left,
    y: placement.top,
    width: placement.width,
    height: placement.height,
  });
  return true;
}

export function getJoinUrl(sessionCode: string): string {
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('join', sessionCode);
  return url.toString();
}
