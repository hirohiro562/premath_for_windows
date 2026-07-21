import { useCallback, useRef, useState } from 'react';
import { loadPdf } from '../lib/actions';
import { loadPdfDocument } from '../lib/pdf';
import { savePdfFile } from '../lib/pdfFileStore';
import { useTranslation, type TranslationKey } from '../lib/i18n';
import { LanguageToggle } from './LanguageToggle';

const MANUAL_ITEMS: { icon: string; titleKey: TranslationKey; bodyKey: TranslationKey }[] = [
  { icon: '⌨️', titleKey: 'upload.manual.keyboard.title', bodyKey: 'upload.manual.keyboard.body' },
  { icon: '🖥️', titleKey: 'upload.manual.presenter.title', bodyKey: 'upload.manual.presenter.body' },
  { icon: '🔴', titleKey: 'upload.manual.laser.title', bodyKey: 'upload.manual.laser.body' },
  { icon: '📱', titleKey: 'upload.manual.reactions.title', bodyKey: 'upload.manual.reactions.body' },
];

export function UploadScreen() {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      if (file.type !== 'application/pdf') {
        setError(t('upload.error.notPdf'));
        return;
      }
      setError(null);
      setIsLoading(true);
      const url = URL.createObjectURL(file);
      try {
        const doc = await loadPdfDocument(url);
        await savePdfFile(file);
        loadPdf(url, file.name, doc.numPages);
      } catch (err) {
        console.error(err);
        setError(t('upload.error.loadFailed'));
        URL.revokeObjectURL(url);
      } finally {
        setIsLoading(false);
      }
    },
    [t],
  );

  return (
    <div className="upload-screen">
      <LanguageToggle className="language-toggle--floating" />
      <div className="upload-hero">
        <p className="upload-eyebrow">
          <span className="logo">
            <span className="logo-d">T</span>ENSOR
          </span>
        </p>
        <h1 className="upload-title">{t('upload.title')}</h1>
        <p className="upload-subtitle">{t('upload.subtitle')}</p>
      </div>

      <div
        className={`dropzone${isDragging ? ' dropzone--active' : ''}${isLoading ? ' dropzone--loading' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          void handleFile(e.dataTransfer.files[0]);
        }}
      >
        <svg className="dropzone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M12 3v12m0-12 4 4m-4-4-4 4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="dropzone-title">{isLoading ? t('upload.dropzone.loading') : t('upload.dropzone.title')}</p>
        <p className="dropzone-sub">{t('upload.dropzone.sub')}</p>
      </div>
      {error && <p className="upload-error">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        hidden
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      <div className="upload-manual">
        <p className="upload-manual-title">{t('upload.manual.title')}</p>
        <div className="upload-manual-grid">
          {MANUAL_ITEMS.map((item) => (
            <div key={item.titleKey} className="upload-manual-card">
              <span className="upload-manual-icon" aria-hidden="true">
                {item.icon}
              </span>
              <p className="upload-manual-card-title">{t(item.titleKey)}</p>
              <p className="upload-manual-card-body">{t(item.bodyKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
