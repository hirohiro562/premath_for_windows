import { useEffect, useRef, useState } from 'react';
import { usePdfDocument, usePresentationState } from '../lib/hooks';
import { closePresentation, goToPage, openPresenterWindow } from '../lib/actions';
import { isReactionsConfigured } from '../lib/supabase';
import { SlideCanvas } from './SlideCanvas';
import { QrJoinPanel } from './QrJoinPanel';
import { VideoEmbed } from './VideoEmbed';
import { PenOverlay, type PenOverlayHandle } from './PenOverlay';

const MIN_LASER_SIZE = 8;
const MAX_LASER_SIZE = 40;
const DEFAULT_LASER_SIZE = 16;
const LASER_COLORS = ['#ff2828', '#28c440', '#2870ff', '#ffd000', '#e838d8'];
const PEN_COLORS = ['#e83030', '#222222', '#2870ff', '#ffd000'];
// Oversampling factor for the audience-facing canvas: renders at more than native pixel
// density so text/lines stay crisp under projector upscaling or window resizes.
const MAIN_CANVAS_RENDER_SCALE = 1.5;

interface PresentationViewProps {
  onPresenterFallback: () => void;
}

export function PresentationView({ onPresenterFallback }: PresentationViewProps) {
  const state = usePresentationState();
  const { doc } = usePdfDocument(state.pdfBlobUrl);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [qrVisible, setQrVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [laserEnabled, setLaserEnabled] = useState(false);
  const [laserSize, setLaserSize] = useState(DEFAULT_LASER_SIZE);
  const [laserColor, setLaserColor] = useState(LASER_COLORS[0]);
  const [laserPos, setLaserPos] = useState<{ x: number; y: number } | null>(null);
  const [penEnabled, setPenEnabled] = useState(false);
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const viewRef = useRef<HTMLDivElement>(null);
  const penOverlayRef = useRef<PenOverlayHandle>(null);

  async function handleOpenPresenterView() {
    const opened = await openPresenterWindow();
    if (!opened) onPresenterFallback();
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      switch (e.key) {
        case 'Tab':
          e.preventDefault();
          void handleOpenPresenterView();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
        case 'Enter':
          e.preventDefault();
          goToPage(state.currentPage + 1);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
        case 'Backspace':
          e.preventDefault();
          goToPage(state.currentPage - 1);
          break;
        case 'Home':
          e.preventDefault();
          goToPage(1);
          break;
        case 'End':
          e.preventDefault();
          goToPage(state.numPages);
          break;
        case 'f':
        case 'F':
          void toggleFullscreen();
          break;
        case 'l':
        case 'L':
          setLaserEnabled((v) => !v);
          break;
        case 'p':
        case 'P':
          setPenEnabled((v) => !v);
          break;
        default:
          break;
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.currentPage, state.numPages]);

  useEffect(() => {
    let timeoutId: number;
    function onMouseMove(e: MouseEvent) {
      setToolbarVisible(true);
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => setToolbarVisible(false), 2500);
      if (laserEnabled) setLaserPos({ x: e.clientX, y: e.clientY });
    }
    window.addEventListener('mousemove', onMouseMove);
    setToolbarVisible(true);
    timeoutId = window.setTimeout(() => setToolbarVisible(false), 2500);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.clearTimeout(timeoutId);
    };
  }, [laserEnabled]);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  async function toggleFullscreen() {
    if (!document.fullscreenElement) {
      await viewRef.current?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }

  const videoUrl = state.videosByPage[state.currentPage];

  return (
    <div ref={viewRef} className={`presentation-view${laserEnabled ? ' presentation-view--laser' : ''}`}>
      {videoUrl ? (
        <VideoEmbed url={videoUrl} className="presentation-video" />
      ) : (
        <div
          className="presentation-stage"
          onClick={() => goToPage(state.currentPage + 1)}
          onContextMenu={(e) => {
            e.preventDefault();
            goToPage(state.currentPage - 1);
          }}
        >
          <SlideCanvas
            doc={doc}
            pageNumber={state.currentPage}
            className="presentation-canvas"
            renderScale={MAIN_CANVAS_RENDER_SCALE}
          />
          <PenOverlay
            ref={penOverlayRef}
            enabled={penEnabled}
            color={penColor}
            pageNumber={state.currentPage}
            className="pen-overlay"
          />
        </div>
      )}
      {laserEnabled && laserPos && (
        <div
          className="laser-dot"
          style={{
            left: laserPos.x,
            top: laserPos.y,
            width: laserSize * 2,
            height: laserSize * 2,
            background: `radial-gradient(circle, ${laserColor}e6 0%, ${laserColor}59 70%, transparent 100%)`,
          }}
        />
      )}
      <div className={`presentation-toolbar${toolbarVisible ? '' : ' presentation-toolbar--hidden'}`}>
        <button type="button" onClick={() => goToPage(state.currentPage - 1)} aria-label="前のスライド">
          ‹
        </button>
        <span className="presentation-page-count">
          {state.currentPage} / {state.numPages}
        </span>
        <button type="button" onClick={() => goToPage(state.currentPage + 1)} aria-label="次のスライド">
          ›
        </button>
        <button
          type="button"
          className={`presentation-presenter-btn${laserEnabled ? ' presentation-presenter-btn--active' : ''}`}
          onClick={() => setLaserEnabled((v) => !v)}
        >
          🔴 レーザー
        </button>
        {laserEnabled && (
          <>
            <input
              type="range"
              min={MIN_LASER_SIZE}
              max={MAX_LASER_SIZE}
              value={laserSize}
              onChange={(e) => setLaserSize(Number(e.target.value))}
              className="presentation-laser-slider"
              aria-label="レーザーポインタのサイズ"
            />
            <div className="color-swatches">
              {LASER_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-swatch${color === laserColor ? ' color-swatch--active' : ''}`}
                  style={{ background: color }}
                  aria-label={`レーザーの色を${color}にする`}
                  onClick={() => setLaserColor(color)}
                />
              ))}
            </div>
          </>
        )}
        <button
          type="button"
          className={`presentation-presenter-btn${penEnabled ? ' presentation-presenter-btn--active' : ''}`}
          onClick={() => setPenEnabled((v) => !v)}
        >
          ✏️ ペン
        </button>
        {penEnabled && (
          <>
            <div className="color-swatches">
              {PEN_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-swatch${color === penColor ? ' color-swatch--active' : ''}`}
                  style={{ background: color }}
                  aria-label={`ペンの色を${color}にする`}
                  onClick={() => setPenColor(color)}
                />
              ))}
            </div>
            <button
              type="button"
              className="presentation-presenter-btn"
              onClick={() => penOverlayRef.current?.clearPage(state.currentPage)}
            >
              🗑 消去
            </button>
          </>
        )}
        <button type="button" className="presentation-presenter-btn" onClick={() => void toggleFullscreen()}>
          {isFullscreen ? '⤡ 元に戻す' : '⤢ フルスクリーン'}
        </button>
        {isReactionsConfigured && state.sessionCode && (
          <button type="button" className="presentation-presenter-btn" onClick={() => setQrVisible((v) => !v)}>
            参加用QR
          </button>
        )}
        <button type="button" className="presentation-presenter-btn" onClick={() => void handleOpenPresenterView()}>
          発表者ビューを開く（Tab）
        </button>
        <button
          type="button"
          className="presentation-presenter-btn"
          onClick={() => {
            if (window.confirm('PDFを閉じてトップ画面に戻りますか？（現在のメモ・タイマー・書き込みは破棄されます）')) {
              closePresentation();
            }
          }}
        >
          📁 PDFを閉じる
        </button>
      </div>
      {qrVisible && state.sessionCode && <QrJoinPanel sessionCode={state.sessionCode} />}
    </div>
  );
}
