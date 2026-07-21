import { useEffect, useState } from 'react';
import { usePdfDocument, usePresentationState, useTicker } from '../lib/hooks';
import { goToPage, setNote, setVideoUrl, toggleTimer } from '../lib/actions';
import { formatDuration } from '../lib/format';
import { useReactionFeed } from '../lib/reactions';
import { useTranslation } from '../lib/i18n';
import { SlideCanvas } from './SlideCanvas';
import { NotePreview } from './NotePreview';
import { LanguageToggle } from './LanguageToggle';

interface PresenterViewProps {
  singleScreenMode?: boolean;
  onExitSingleScreen?: () => void;
}

export function PresenterView({ singleScreenMode = false, onExitSingleScreen }: PresenterViewProps = {}) {
  const { t } = useTranslation();
  const state = usePresentationState();
  const { doc, loadError } = usePdfDocument(state.pdfBlobUrl);
  const reactions = useReactionFeed(state.sessionCode);
  const [isNotePreview, setIsNotePreview] = useState(false);
  useTicker(state.isRunning);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      switch (e.key) {
        case 'Tab':
        case 'Escape':
          if (singleScreenMode && onExitSingleScreen) {
            e.preventDefault();
            onExitSingleScreen();
          }
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
        default:
          break;
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.currentPage, singleScreenMode, onExitSingleScreen]);

  if (!state.pdfBlobUrl) {
    return <div className="presenter-empty">{t('presenter.empty.noPdf')}</div>;
  }

  if (loadError) {
    return <div className="presenter-empty">{t('presenter.empty.loadError')}</div>;
  }

  const overallMs =
    state.overallElapsedMs + (state.isRunning && state.overallStartedAt ? Date.now() - state.overallStartedAt : 0);
  const slideMs =
    state.slideElapsedMs + (state.isRunning && state.slideStartedAt ? Date.now() - state.slideStartedAt : 0);

  return (
    <div className="presenter-view">
      {singleScreenMode && (
        <div className="presenter-single-screen-banner">
          <span>{t('presenter.singleScreen.banner')}</span>
          <button type="button" className="presenter-exit-single" onClick={onExitSingleScreen}>
            {t('presenter.singleScreen.back')}
          </button>
        </div>
      )}
      <div className="presenter-topbar">
        <div className="presenter-nav">
          <button type="button" onClick={() => goToPage(state.currentPage - 1)} aria-label={t('nav.prev')}>
            ‹
          </button>
          <span>{t('presenter.slideCount', { current: state.currentPage, total: state.numPages })}</span>
          <button type="button" onClick={() => goToPage(state.currentPage + 1)} aria-label={t('nav.next')}>
            ›
          </button>
        </div>
        <div className="presenter-timers">
          <button
            type="button"
            className="presenter-play"
            onClick={toggleTimer}
            aria-label={state.isRunning ? t('presenter.play.pause') : t('presenter.play.start')}
          >
            {state.isRunning ? '⏸' : '▶'}
          </button>
          <div className="timer-block">
            <span className="timer-label">{t('presenter.timer.slide')}</span>
            <span className="timer-value">{formatDuration(slideMs)}</span>
          </div>
          <div className="timer-divider" />
          <div className="timer-block">
            <span className="timer-label">{t('presenter.timer.overall')}</span>
            <span className="timer-value">{formatDuration(overallMs)}</span>
          </div>
          <LanguageToggle />
        </div>
      </div>

      <div className="presenter-body">
        <div className="presenter-current">
          <span className="presenter-tag">{t('presenter.tag.current')}</span>
          {state.videosByPage[state.currentPage] && (
            <span className="presenter-tag presenter-tag--video">{t('presenter.tag.videoPlaying')}</span>
          )}
          <SlideCanvas doc={doc} pageNumber={state.currentPage} className="presenter-current-canvas" />
          <div className="reaction-overlay">
            {reactions.map((r) => (
              <span key={r.id} className="reaction-bubble" style={{ left: `calc(50% + ${r.offset}px)` }}>
                {r.emoji}
              </span>
            ))}
          </div>
        </div>
        <div className="presenter-side">
          <div className="presenter-next">
            <span className="presenter-label">{t('presenter.next.label')}</span>
            {state.currentPage < state.numPages ? (
              <SlideCanvas doc={doc} pageNumber={state.currentPage + 1} className="presenter-next-canvas" />
            ) : (
              <div className="presenter-next-empty">{t('presenter.next.empty')}</div>
            )}
          </div>
          <div className="presenter-video-input">
            <span className="presenter-label">{t('presenter.video.label')}</span>
            <input
              type="url"
              value={state.videosByPage[state.currentPage] ?? ''}
              onChange={(e) => setVideoUrl(state.currentPage, e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>
          <div className="presenter-notes">
            <div className="presenter-notes-header">
              <span className="presenter-label">{t('presenter.notes.label')}</span>
              <button type="button" className="note-toggle" onClick={() => setIsNotePreview((v) => !v)}>
                {isNotePreview ? t('presenter.notes.edit') : t('presenter.notes.preview')}
              </button>
            </div>
            {isNotePreview ? (
              <NotePreview text={state.notesByPage[state.currentPage] ?? ''} />
            ) : (
              <textarea
                value={state.notesByPage[state.currentPage] ?? ''}
                onChange={(e) => setNote(state.currentPage, e.target.value)}
                placeholder={t('presenter.notes.placeholder')}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
