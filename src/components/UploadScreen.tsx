import { useCallback, useRef, useState } from 'react';
import { loadPdf } from '../lib/actions';
import { loadPdfDocument } from '../lib/pdf';
import { savePdfFile } from '../lib/pdfFileStore';

const MANUAL_ITEMS = [
  {
    icon: '⌨️',
    title: 'キーボードで操作',
    body: '→ / ↓ / Space / Enter で次へ、← / ↑ / Backspace で前へ。Home/Endで最初・最後のスライドへ。',
  },
  {
    icon: '🖥️',
    title: '発表者ビュー',
    body: '別ウィンドウで開き、次のスライド・経過時間・手元メモを確認しながら発表できます。',
  },
  {
    icon: '🔴',
    title: 'レーザーポインター / ペン',
    body: 'ツールバーからON/OFF。ペンは投影画面に直接書き込めます。色も選べます。',
  },
  {
    icon: '📱',
    title: '観客リアクション',
    body: 'QRコードを表示すると、観客がスマホから絵文字リアクションを送信できます。',
  },
];

export function UploadScreen() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('PDFファイルを選択してください');
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
      setError('PDFを読み込めませんでした');
      URL.revokeObjectURL(url);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="upload-screen">
      <div className="upload-hero">
        <p className="upload-eyebrow">
          <span className="logo">
            <span className="logo-d">D</span>angi
          </span>
        </p>
        <h1 className="upload-title">研究の話を、もっと気軽に。</h1>
        <p className="upload-name-note">
          「談義（だんぎ）」は、かしこまらない気軽な話し合いという意味の言葉です。学会の壇上だけでなく、輪読会や勉強会のような、インフォーマルだけど密なコミュニケーションが必要な場でこそ使ってほしい——そんな思いでこの名前にしました。
        </p>
        <p className="upload-subtitle">
          インストール不要・アップロード不要。PDFを開くだけで発表者ビュー、レーザーポインター、観客リアクションが使えます。
        </p>
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
        <p className="dropzone-title">{isLoading ? '読み込み中…' : 'PDFをドラッグ&ドロップ'}</p>
        <p className="dropzone-sub">またはクリックして選択</p>
        <p className="dropzone-note">ブラウザ内で処理・アップロードなし</p>
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
        <p className="upload-manual-title">使い方</p>
        <div className="upload-manual-grid">
          {MANUAL_ITEMS.map((item) => (
            <div key={item.title} className="upload-manual-card">
              <span className="upload-manual-icon" aria-hidden="true">
                {item.icon}
              </span>
              <p className="upload-manual-card-title">{item.title}</p>
              <p className="upload-manual-card-body">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
