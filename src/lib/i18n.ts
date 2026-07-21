import { useCallback, useSyncExternalStore } from 'react';
import { emit, listen } from '@tauri-apps/api/event';

export type Language = 'ja' | 'en';

const STORAGE_KEY = 'tensor-language';
const EVENT_NAME = 'tensor-language-sync';
const instanceId = crypto.randomUUID();

interface LanguageMessage {
  sourceId: string;
  language: Language;
}

function loadInitial(): Language {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'ja' || raw === 'en') return raw;
  } catch {
    return 'ja';
  }
  return 'ja';
}

let language: Language = loadInitial();
const listeners = new Set<() => void>();

void listen<LanguageMessage>(EVENT_NAME, (event) => {
  if (event.payload.sourceId === instanceId) return;
  language = event.payload.language;
  listeners.forEach((listener) => listener());
});

export function getLanguage(): Language {
  return language;
}

export function subscribeLanguage(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setLanguage(next: Language): void {
  language = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // localStorage may be unavailable (e.g. private mode) — this window still updates
  }
  void emit(EVENT_NAME, { sourceId: instanceId, language: next });
  listeners.forEach((listener) => listener());
}

const dict = {
  ja: {
    'upload.title': '研究の話を、もっと気軽に。',
    'upload.subtitle': 'PDFを開くだけで発表者ビュー、レーザーポインター、観客リアクションが使えます。',
    'upload.error.notPdf': 'PDFファイルを選択してください',
    'upload.error.loadFailed': 'PDFを読み込めませんでした',
    'upload.dropzone.loading': '読み込み中…',
    'upload.dropzone.title': 'PDFをドラッグ&ドロップ',
    'upload.dropzone.sub': 'またはクリックして選択',
    'upload.manual.title': '使い方',
    'upload.manual.keyboard.title': 'キーボードで操作',
    'upload.manual.keyboard.body':
      '→ / ↓ / Space / Enter で次へ、← / ↑ / Backspace で前へ。Home/Endで最初・最後のスライドへ。',
    'upload.manual.presenter.title': '発表者ビュー',
    'upload.manual.presenter.body':
      '別ウィンドウで開き、次のスライド・経過時間・手元メモを確認しながら発表できます。',
    'upload.manual.laser.title': 'レーザーポインター / ペン',
    'upload.manual.laser.body': 'ツールバーからON/OFF。ペンは投影画面に直接書き込めます。色も選べます。',
    'upload.manual.reactions.title': '観客リアクション',
    'upload.manual.reactions.body': 'QRコードを表示すると、観客がスマホから絵文字リアクションを送信できます。',

    'nav.prev': '前のスライド',
    'nav.next': '次のスライド',

    'presenter.empty.noPdf': 'メイン画面でPDFを読み込んでください',
    'presenter.empty.loadError': 'PDFを読み込めませんでした。メイン画面を再読み込みしてください',
    'presenter.singleScreen.banner':
      '2台目のディスプレイが見つかりません。投影画面とこの発表者ビューを切り替えて使用します。',
    'presenter.singleScreen.back': '▶ 投影画面に戻る（Tab）',
    'presenter.slideCount': 'スライド {current} / {total}',
    'presenter.play.pause': '一時停止',
    'presenter.play.start': '開始',
    'presenter.timer.slide': 'このスライド',
    'presenter.timer.overall': '全体',
    'presenter.tag.current': '現在',
    'presenter.tag.videoPlaying': '🎬 投影中',
    'presenter.next.label': '次のスライド',
    'presenter.next.empty': '最後のスライドです',
    'presenter.video.label': '動画URL（このスライドで再生）',
    'presenter.notes.label': 'ノート',
    'presenter.notes.edit': '編集',
    'presenter.notes.preview': 'プレビュー',
    'presenter.notes.placeholder':
      'このスライドのノートを入力（数式は $x^2$ や $$\\int f(x)\\,dx$$ のように記述）',

    'toolbar.laser': '🔴 レーザー',
    'toolbar.laser.sizeAria': 'レーザーポインタのサイズ',
    'toolbar.laser.colorAria': 'レーザーの色を{color}にする',
    'toolbar.pen': '✏️ ペン',
    'toolbar.pen.colorAria': 'ペンの色を{color}にする',
    'toolbar.pen.clear': '🗑 消去',
    'toolbar.fullscreen.enter': '⤢ フルスクリーン',
    'toolbar.fullscreen.exit': '⤡ 元に戻す',
    'toolbar.joinQr': '参加用QR',
    'toolbar.openPresenter': '発表者ビューを開く（Tab）',
    'toolbar.closePdf': '📁 PDFを閉じる',
    'confirm.closePdf': 'PDFを閉じてトップ画面に戻りますか？（現在のメモ・タイマー・書き込みは破棄されます）',

    'join.unavailable': 'リアクション機能は現在利用できません',
    'join.session': 'セッション {code}',
    'join.title': 'リアクションを送ろう',

    'qr.hint': 'スキャンしてリアクションに参加',

    'video.title': '動画',

    'note.empty': 'プレビューする内容がありません',

    'language.toggle': 'EN',
  },
  en: {
    'upload.title': 'Make research talks more casual.',
    'upload.subtitle': 'Open a PDF to get a presenter view, laser pointer, and live audience reactions.',
    'upload.error.notPdf': 'Please select a PDF file',
    'upload.error.loadFailed': "Couldn't load the PDF",
    'upload.dropzone.loading': 'Loading…',
    'upload.dropzone.title': 'Drag & drop a PDF',
    'upload.dropzone.sub': 'or click to select',
    'upload.manual.title': 'How to use',
    'upload.manual.keyboard.title': 'Keyboard controls',
    'upload.manual.keyboard.body':
      'Next: → / ↓ / Space / Enter. Previous: ← / ↑ / Backspace. Home/End for the first/last slide.',
    'upload.manual.presenter.title': 'Presenter view',
    'upload.manual.presenter.body':
      'Opens in a separate window with the next slide, elapsed time, and your notes while you present.',
    'upload.manual.laser.title': 'Laser pointer / pen',
    'upload.manual.laser.body': 'Toggle from the toolbar. The pen draws directly on the stage — pick any color.',
    'upload.manual.reactions.title': 'Audience reactions',
    'upload.manual.reactions.body': 'Show a QR code so the audience can send emoji reactions from their phones.',

    'nav.prev': 'Previous slide',
    'nav.next': 'Next slide',

    'presenter.empty.noPdf': 'Load a PDF from the main window',
    'presenter.empty.loadError': "Couldn't load the PDF. Please reload the main window",
    'presenter.singleScreen.banner':
      'No second display detected. Switch between the presentation and this presenter view instead.',
    'presenter.singleScreen.back': '▶ Back to presentation (Tab)',
    'presenter.slideCount': 'Slide {current} / {total}',
    'presenter.play.pause': 'Pause',
    'presenter.play.start': 'Start',
    'presenter.timer.slide': 'This slide',
    'presenter.timer.overall': 'Total',
    'presenter.tag.current': 'Current',
    'presenter.tag.videoPlaying': '🎬 Playing',
    'presenter.next.label': 'Next slide',
    'presenter.next.empty': 'This is the last slide',
    'presenter.video.label': 'Video URL (plays on this slide)',
    'presenter.notes.label': 'Notes',
    'presenter.notes.edit': 'Edit',
    'presenter.notes.preview': 'Preview',
    'presenter.notes.placeholder': 'Type notes for this slide (use $x^2$ or $$\\int f(x)\\,dx$$ for math)',

    'toolbar.laser': '🔴 Laser',
    'toolbar.laser.sizeAria': 'Laser pointer size',
    'toolbar.laser.colorAria': 'Set laser color to {color}',
    'toolbar.pen': '✏️ Pen',
    'toolbar.pen.colorAria': 'Set pen color to {color}',
    'toolbar.pen.clear': '🗑 Clear',
    'toolbar.fullscreen.enter': '⤢ Fullscreen',
    'toolbar.fullscreen.exit': '⤡ Exit fullscreen',
    'toolbar.joinQr': 'Join QR',
    'toolbar.openPresenter': 'Open presenter view (Tab)',
    'toolbar.closePdf': '📁 Close PDF',
    'confirm.closePdf': 'Close the PDF and return to the start screen? (Notes, timers, and annotations will be discarded)',

    'join.unavailable': "Reactions aren't available right now",
    'join.session': 'Session {code}',
    'join.title': 'Send a reaction',

    'qr.hint': 'Scan to join and react',

    'video.title': 'Video',

    'note.empty': 'Nothing to preview',

    'language.toggle': 'JA',
  },
} as const satisfies Record<Language, Record<string, string>>;

export type TranslationKey = keyof (typeof dict)['ja'];

function translate(lang: Language, key: TranslationKey, vars?: Record<string, string | number>): string {
  let str: string = dict[lang][key] ?? dict.ja[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      str = str.replaceAll(`{${name}}`, String(value));
    }
  }
  return str;
}

export function toggleLanguage(): void {
  setLanguage(language === 'ja' ? 'en' : 'ja');
}

export function useTranslation() {
  const currentLanguage = useSyncExternalStore(subscribeLanguage, getLanguage);
  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => translate(currentLanguage, key, vars),
    [currentLanguage],
  );
  return { language: currentLanguage, t };
}
