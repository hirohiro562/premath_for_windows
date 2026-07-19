import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';

interface Stroke {
  page: number;
  color: string;
  points: { x: number; y: number }[];
}

export interface PenOverlayHandle {
  clearPage: (page: number) => void;
}

interface PenOverlayProps {
  enabled: boolean;
  color: string;
  pageNumber: number;
  className?: string;
}

const PEN_LINE_WIDTH = 3;

export const PenOverlay = forwardRef<PenOverlayHandle, PenOverlayProps>(function PenOverlay(
  { enabled, color, pageNumber, className },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Strokes are kept per-page (in a page's own local ref, not global sync state) since
  // annotations are a presenter-side aid tied to this window, not something audiences need synced.
  const strokesByPageRef = useRef<Map<number, Stroke[]>>(new Map());
  const activeStrokeRef = useRef<Stroke | null>(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const dpr = window.devicePixelRatio || 1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = PEN_LINE_WIDTH * dpr;
    for (const stroke of strokesByPageRef.current.get(pageNumber) ?? []) {
      if (stroke.points.length === 0) continue;
      ctx.strokeStyle = stroke.color;
      ctx.beginPath();
      stroke.points.forEach((p, i) => {
        const x = p.x * canvas.width;
        const y = p.y * canvas.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  }, [pageNumber]);

  // Keeps the ResizeObserver effect below mount-once while still calling the
  // current page's redraw — recreating the observer on every page flip isn't needed.
  const redrawRef = useRef(redraw);
  useEffect(() => {
    redrawRef.current = redraw;
    redraw();
  }, [redraw]);

  useImperativeHandle(
    ref,
    () => ({
      clearPage(page: number) {
        strokesByPageRef.current.delete(page);
        redrawRef.current();
      },
    }),
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;

    function resize() {
      const rect = container!.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = Math.max(1, Math.round(rect.width * dpr));
      canvas!.height = Math.max(1, Math.round(rect.height * dpr));
      canvas!.style.width = `${rect.width}px`;
      canvas!.style.height = `${rect.height}px`;
      redrawRef.current();
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    // Also react to plain window resizes (e.g. F11 browser-chrome fullscreen toggle),
    // as a fallback in case a browser's ResizeObserver batching misses the transition.
    window.addEventListener('resize', resize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);

  function pointFromEvent(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!enabled) return;
    e.preventDefault();
    e.stopPropagation();
    canvasRef.current?.setPointerCapture(e.pointerId);
    activeStrokeRef.current = { page: pageNumber, color, points: [pointFromEvent(e)] };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const stroke = activeStrokeRef.current;
    const canvas = canvasRef.current;
    if (!enabled || !stroke || !canvas) return;
    e.stopPropagation();
    const point = pointFromEvent(e);
    const prev = stroke.points[stroke.points.length - 1];
    stroke.points.push(point);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = PEN_LINE_WIDTH * (window.devicePixelRatio || 1);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(prev.x * canvas.width, prev.y * canvas.height);
    ctx.lineTo(point.x * canvas.width, point.y * canvas.height);
    ctx.stroke();
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    const stroke = activeStrokeRef.current;
    if (!stroke) return;
    e.stopPropagation();
    const list = strokesByPageRef.current.get(stroke.page) ?? [];
    list.push(stroke);
    strokesByPageRef.current.set(stroke.page, list);
    activeStrokeRef.current = null;
  }

  return (
    <canvas
      ref={canvasRef}
      className={`${className ?? ''}${enabled ? ' pen-overlay--active' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={(e) => enabled && e.stopPropagation()}
      onContextMenu={(e) => {
        if (!enabled) return;
        e.preventDefault();
        e.stopPropagation();
      }}
    />
  );
});
