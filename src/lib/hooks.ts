import { useEffect, useState, useSyncExternalStore } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { getState, subscribe } from './syncStore';
import type { SyncState } from '../types';
import { loadPdfDocument } from './pdf';
import { loadPdfFile } from './pdfFileStore';
import { resetPresentation, setPdfBlobUrl } from './actions';

export function usePresentationState(): SyncState {
  return useSyncExternalStore(subscribe, getState);
}

interface PdfDocumentResult {
  doc: PDFDocumentProxy | null;
  loadError: boolean;
}

// Shared by PresentationView and PresenterView: both just need "the PDFDocumentProxy for
// the current blob URL", including recovery when that URL has gone stale (see pdfFileStore.ts).
export function usePdfDocument(pdfBlobUrl: string | null): PdfDocumentResult {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!pdfBlobUrl) return;
    let cancelled = false;
    setLoadError(false);

    void loadPdfDocument(pdfBlobUrl)
      .then((loaded) => {
        if (!cancelled) setDoc(loaded);
      })
      .catch(async () => {
        const file = await loadPdfFile();
        if (cancelled) return;
        if (!file) {
          resetPresentation();
          return;
        }
        const freshUrl = URL.createObjectURL(file);
        try {
          const loaded = await loadPdfDocument(freshUrl);
          if (cancelled) {
            URL.revokeObjectURL(freshUrl);
            return;
          }
          setPdfBlobUrl(freshUrl);
          setDoc(loaded);
        } catch {
          URL.revokeObjectURL(freshUrl);
          if (!cancelled) {
            setLoadError(true);
            resetPresentation();
          }
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pdfBlobUrl]);

  return { doc, loadError };
}

export function useTicker(active: boolean, intervalMs = 250): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => window.clearInterval(id);
  }, [active, intervalMs]);
}
