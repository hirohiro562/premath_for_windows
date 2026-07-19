# ABSTRUCT.md — pdf-presenter（Dangi）概要

このファイルは、Windows上で起動できるアプリを作る際の設計インプットとして、現行の`pdf-presenter`（表示名: **Dangi/談義**）の内容をまとめたもの。詳細な経緯・デザイン仕様・既知の問題は[SETUP.md](SETUP.md)を参照。

## これは何か

Beamer/PDFでスライドを作る研究者向けの、ブラウザ完結型プレゼンテーションツール。pdfpc・BeamerPresenterの代替として、環境構築不要（ブラウザで開くだけ）・モダンなUIを目指している。現状はVercelにデプロイされたWebアプリ（https://pdf-presenter-nu.vercel.app）。

## 技術スタック

- **フロントエンド**: React 19 + TypeScript + Vite 8（サーバー不要、フロントエンドのみで完結するSPA）
- **PDF描画**: `pdfjs-dist`（ブラウザ内でパース、サーバーへのアップロード不要）
- **QRコード生成**: `qrcode`
- **リアルタイム通信**: `@supabase/supabase-js`（観客リアクションのSupabase Realtime Broadcastでのみ使用。DBテーブル・RLSは未使用）
- **状態永続化**: IndexedDB（PDF本体）、localStorage（ノート・タイマー・ページ位置）
- **Lint**: oxlint

## 画面構成（`App.tsx`のルーティング）

URLクエリパラメータで4画面を出し分けている（別ルーターは未導入）。

| 条件 | 画面 | コンポーネント |
|---|---|---|
| `?join=<code>` | 観客用リアクション送信画面 | `JoinScreen.tsx` |
| `?presenter` | 発表者ビュー（第2ウィンドウ） | `PresenterView.tsx` |
| PDF読み込み済み | 投影用フルスクリーン画面 | `PresentationView.tsx` |
| 上記いずれでもない | PDFアップロード画面 | `UploadScreen.tsx` |

## 状態管理・画面間同期

- **メイン画面 ⇔ 発表者ビュー**: `BroadcastChannel` + `localStorage`（`lib/syncStore.ts`）。同一ブラウザ内のタブ/ウィンドウ間のみで完結し、サーバーを介さない。
- **状態の型定義**（`types.ts`の`SyncState`）: `pdfBlobUrl`, `fileName`, `sessionCode`, `numPages`, `currentPage`, `notesByPage`, `videosByPage`, `isRunning`, `overallElapsedMs`/`overallStartedAt`, `slideElapsedMs`/`slideStartedAt`
- **PDF本体の永続化**: `lib/pdfFileStore.ts`でIndexedDBに保存。blob URLがタブのリロード等で失効しても復旧できる（`lib/hooks.ts`の`usePdfDocument`）
- **観客リアクション**: Supabase Realtime Broadcast（`reactions:<セッションコード>`チャンネル）経由。DB不要・接続情報未設定でもクラッシュせずQRボタンが非表示になるだけ

## 実装済み機能

**Must have**
- PDFのドラッグ&ドロップ読み込み
- フルスクリーン発表モード（pdfpc/PowerPoint準拠のキーボードショートカット、クリックでページ送り、自動的に隠れるツールバー）
- 発表者ビュー（現在/次スライド、手動ノート、スライド別・全体の経過時間タイマー、対応ブラウザでは第2ディスプレイへ自動配置＝Window Management API）
- レーザーポインター（色・サイズ可変）、ペン（手書き注釈、色選択・ページごと保持・消去）
- リロード・誤ってタブを閉じた場合の復旧（ノート・タイマー・ページ位置を維持）

**Nice to have（実装済み）**
- 観客リアクション：投影画面にQRコード＋セッションコードを表示 → 観客が別端末（スマホ等）から絵文字を送信 → 発表者ビューにのみ浮かび上がって表示
- スライド別動画再生：発表者ビューで特定スライドに動画URL（YouTube/Vimeo/直リンク）を紐付け → 投影画面がそのページに来ると動画に切り替わる

**Nice to have（未着手）**
- ノートのAI自動生成
- 手書き注釈のPDF書き出し

## ディレクトリ構成（`src/`）

```
src/
├─ App.tsx                     # 画面ルーティング
├─ types.ts                    # SyncStateの型定義
├─ components/
│  ├─ UploadScreen.tsx         # PDFアップロード画面
│  ├─ PresentationView.tsx     # 投影用フルスクリーン画面
│  ├─ PresenterView.tsx        # 発表者ビュー
│  ├─ JoinScreen.tsx           # 観客用リアクション送信画面
│  ├─ QrJoinPanel.tsx          # QRコード＋セッションコード表示
│  ├─ SlideCanvas.tsx          # pdf.jsによるスライド描画
│  ├─ PenOverlay.tsx           # 手書き注釈オーバーレイ
│  └─ VideoEmbed.tsx           # スライド別動画埋め込み
└─ lib/
   ├─ hooks.ts                 # usePresentationState / usePdfDocument等
   ├─ syncStore.ts             # BroadcastChannel + localStorage同期
   ├─ actions.ts               # 状態更新アクション
   ├─ pdf.ts                   # pdf.jsラッパー
   ├─ pdfFileStore.ts          # IndexedDBへのPDF永続化
   ├─ reactions.ts             # Supabase Realtime Broadcast連携
   ├─ supabase.ts              # Supabaseクライアント初期化
   ├─ video.ts                 # 動画URL（YouTube/Vimeo等）判定・埋め込み
   ├─ screenPlacement.ts       # 第2ディスプレイ自動配置
   └─ format.ts                # 時間フォーマット等
```

## デプロイ・外部サービス（現行Web版）

| サービス | 内容 |
|---|---|
| GitHub | https://github.com/hirohiro562/pdf-presenter （Private） |
| Vercel | `master`へのpushで自動デプロイ |
| Supabase | Realtime Broadcastのみ使用。環境変数`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`が必要（未設定時は観客リアクション機能のみ無効化） |

## Windowsアプリ化にあたっての論点（要検討）

現行実装はブラウザのAPIに依存している箇所があるため、Windows単体アプリ（Electron/Tauri等）にする際は以下を確認・移植方針の検討が必要。

- **BroadcastChannel + localStorage**（メイン⇔発表者ビュー同期）: Electronなら複数`BrowserWindow`間でも標準Web APIとして動作する見込みだが、Tauriの場合は要確認。マルチウィンドウ構成自体は維持できるかがポイント。
- **Window Management API**（第2ディスプレイ自動配置）: Chromium系ブラウザ限定の機能。Electronの`screen`モジュール等ネイティブAPIへの置き換えが必要になる可能性が高い。
- **IndexedDB / localStorage**: Electron（Chromiumベース）ならそのまま動作する見込み。
- **Supabase接続**（観客リアクション）: インターネット接続が前提の機能。オフライン利用時は無効化される現行の挙動を踏襲するか、要検討。
- **フルスクリーン/キーボードショートカット**: OSネイティブのフルスクリーン制御・ショートカット競合（特にWindowsのシステムショートカット）の確認が必要。
- **配布形態**: インストーラー（.exe/.msi）か、ポータブル実行形式かは未決定。
