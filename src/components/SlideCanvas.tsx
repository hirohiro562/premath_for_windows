import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { renderPageToCanvas } from '../lib/pdf';

interface SlideCanvasProps {
  doc: PDFDocumentProxy | null;
  pageNumber: number;
  className?: string;
  renderScale?: number;
}

interface RenderRequest {
  pageNumber: number;
  width: number;
  height: number;
  renderScale: number;
}

// pdf.js's render() waits on requestAnimationFrame internally, and some browsers
// suspend rAF during fullscreen-transition reflows. If that happens to a render
// call, its promise never settles — and since renders are queued one at a time,
// every later resize/page-change would wait behind it forever. Capping how long
// we wait lets the queue move on to the latest request instead of freezing the
// slide at a stale size.
const RENDER_TIMEOUT_MS = 4000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`render timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export function SlideCanvas({ doc, pageNumber, className, renderScale = 1 }: SlideCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  // pdf.js throws if a canvas gets a second render() call before the first
  // settles, and cancelling in-flight tasks proved unreliable — so renders
  // are queued one at a time, and a request drops itself if a newer one has
  // already superseded it by the time its turn comes up.
  const renderChainRef = useRef<Promise<void>>(Promise.resolve());
  const latestRequestRef = useRef<RenderRequest | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function measure() {
      const rect = container!.getBoundingClientRect();
      // Keep the same object reference when the size hasn't actually changed —
      // containerSize is a render-effect dependency, so a new reference on every
      // ResizeObserver tick would requeue a redundant render.
      setContainerSize((prev) =>
        prev.width === rect.width && prev.height === rect.height ? prev : { width: rect.width, height: rect.height },
      );
    }

    // ResizeObserver's initial callback timing is inconsistent across environments,
    // so measure synchronously on mount and let the observer handle later changes.
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    // Belt-and-suspenders for the F11 (browser-chrome) fullscreen toggle: that's a
    // plain window resize, not the Fullscreen API, so it doesn't fire 'fullscreenchange'.
    // It reliably fires a window 'resize' event, which we also listen for directly in
    // case a given browser's ResizeObserver batching drops the tail end of the transition.
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  useEffect(() => {
    if (!doc || !canvasRef.current || containerSize.width === 0 || containerSize.height === 0) return;
    const canvas = canvasRef.current;
    const request: RenderRequest = { pageNumber, width: containerSize.width, height: containerSize.height, renderScale };
    latestRequestRef.current = request;

    renderChainRef.current = renderChainRef.current.catch(() => {}).then(async () => {
      if (latestRequestRef.current !== request) return;
      try {
        await withTimeout(
          renderPageToCanvas(doc, pageNumber, canvas, containerSize.width, containerSize.height, renderScale),
          RENDER_TIMEOUT_MS,
        );
      } catch (err) {
        console.error('SlideCanvas render failed', err);
      }
    });
  }, [doc, pageNumber, containerSize, renderScale]);

  return (
    <div ref={containerRef} className={className}>
      <canvas ref={canvasRef} />
    </div>
  );
}
