# PROGRESS.md — Dangi Windowsデスクトップ化 進捗メモ

このファイルは、Windowsデスクトップアプリ化（Tauri）作業を別セッション/別フォルダで再開するための引き継ぎメモ。次回はまずこのファイルを読むこと。

## ゴール

`pdf-presenter`（表示名Dangi、Web版はVercelにデプロイ済み）を、Windowsでネイティブ起動できるデスクトップアプリにし、最終的にGitHubで配布する。

## これまでの経緯・決定事項

1. **[ABSTRUCT.md](ABSTRUCT.md)を作成**（このリポジトリ直下）。pdf-presenterの技術スタック・画面構成・状態同期の仕組み・実装済み機能・ディレクトリ構成をまとめたもの。デスクトップ化の設計インプット。

2. **デスクトップシェルはElectronではなくTauri（Rust）を選択**。理由: 配布サイズ・メモリ使用量が小さい、デフォルトでセキュリティが強い（明示的な権限allowlist方式）。GitHubでの配布・セキュリティを重視するユーザーの意向に合致。

3. **プラン策定時に以下4点をユーザーと合意（すべて実施済み）**:
   - 観客リアクション機能（QRコード・JoinScreen）はデスクトップ版では無効化（`.env.tauri`で空値）。
   - `window.open`/`BroadcastChannel`はTauriネイティブAPI（WebviewWindow + イベントシステム）に置き換え。
   - コード署名なし。未署名配布・SmartScreen警告は許容。
   - GitHub Actionsでリリース自動化（`.github/workflows/release.yml`）。

4. **詳細な実装プラン**: `C:\Users\Onohi\.claude\plans\merry-scribbling-crayon.md`（内容は実施済み。差分は本ファイルに記載）。

5. **新しいフォルダに独立プロジェクトとして作業**。
   - pdf-presenter（別リポジトリ）はWeb版（Vercelデプロイ）としてこのまま変更せず維持する。
   - デスクトップ版は`c:\Users\Onohi\projects\premath_for_windows`で新しいgitリポジトリとして開始（git init済み、**コミットはまだ**）。

6. **Nice to haveの新規機能要望: 数式に強い発表環境**（実装・実機確認済み）。
   - 発表者ビューのノート欄でLaTeX数式が使えるようにしたい、という要望。
   - 決定事項: レンダリングライブラリはKaTeX、UIは表示専用（編集⇄プレビュー切替）、デスクトップ版（premath_for_windows）限定・Web版（pdf-presenter/Vercel）には展開しない。
   - 実装内容:
     - `npm install katex`（`katex/dist/katex.min.css`を`src/main.tsx`でimport。フォントもビルド時に`dist/assets`へ同梱され`self`オリジンから配信されるため、CSPの`font-src 'self'`のまま変更不要）。
     - `src/lib/mathRender.ts`: ノートのプレーンテキストを`$$...$$`（display）/`$...$`（inline）で区切ってセグメント化し`katex.renderToString`でHTML化するユーティリティ。
     - `src/components/NotePreview.tsx`: セグメントを描画する表示専用コンポーネント。
     - `src/components/PresenterView.tsx`のノート欄に「プレビュー」トグルボタンを追加、`isNotePreview`のstateで編集用`textarea`とプレビューを切り替え。
     - `src/App.css`に`.presenter-notes-header`/`.note-toggle`/`.note-preview`/`.note-math`系のスタイルを追加。
   - `npm run build`（型チェック含む）・`npm run tauri dev`実機起動・ユーザーによる目視確認（数式レンダリング含む）まで完了。

## 実装・検証済みの内容（Rust環境整備後、実機で動作確認まで完了）

### スキャフォールド・設定
- `premath_for_windows`に`src/`・設定ファイル一式をコピーし、`npm install`済み。`.env`（Supabase実資格情報）はコピーせず`.env.example`のみ。
- `git init`済み・全ファイルステージ済み（**コミットは未実施** — ユーザーの明示的な指示があるまで行わない方針）。
- `package.json`の`name`を`premath-for-windows`に変更。
- `@tauri-apps/cli@^2`・`@tauri-apps/api@^2`導入、`npx tauri init --ci`でスキャフォールド生成。
- `package.json`に`dev:tauri`/`build:tauri`/`tauri`スクリプト追加。`vite.config.ts`に`clearScreen: false`・`server.port=5173`・`strictPort: true`、および**`server.watch.ignored: ['**/src-tauri/**']`**を追加（後述の理由で必須）。
- `src-tauri/tauri.conf.json`: `productName: "Dangi"`, `identifier: "com.hirohiro562.dangi"`, `main`ラベルのウィンドウ1つ、`bundle.targets: ["nsis"]`、`webviewInstallMode: downloadBootstrapper`。CSPは下記参照。

### コード書き換え（`getState`/`subscribe`/`updateState`等の既存シグネチャは維持）
- `src/lib/syncStore.ts`: `BroadcastChannel` → `@tauri-apps/api/event`の`emit`/`listen`。Tauriの`emit`はループバックするため`sourceId`（`crypto.randomUUID()`）で自window宛を無視。
- `src/lib/screenPlacement.ts`: `window.getScreenDetails()` → `currentMonitor()`/`availableMonitors()`。`.toLogical(scaleFactor)`で論理ピクセルに変換。
- `src/lib/actions.ts`: `openPresenterWindow()`を`WebviewWindow.getByLabel('presenter')`→存在すれば`setFocus()`、なければ新規作成する形に変更。
- `src/lib/pdf.ts`: **ページ送り時の点滅を修正**。pdf.jsの`page.render()`はキャンバスを白で塗ってから内容を描くため、複雑なページで描画に数フレームかかると白フラッシュが見えていた。オフスクリーンキャンバスに描画完了させてから`drawImage()`で表示用キャンバスに一括転写する方式に変更し、解消済み（実機確認済み）。

### CSP（重要な学び）
`src-tauri/tauri.conf.json`の`app.security.csp`は最終的に以下:
```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; font-src 'self' https://fonts.gstatic.com; worker-src 'self' blob:; connect-src 'self' blob: ipc: http://ipc.localhost; media-src 'self' blob: https:; frame-src https:;
```
- フォントはGoogle Fonts CDNのまま維持することにした（下記参照）ので`style-src`/`font-src`にCDNホストを追加。
- **`connect-src`に`blob:`が必須**: PDFはIndexedDBに保存したFileから`URL.createObjectURL()`で作ったblob URLをpdf.jsの`getDocument({ url })`で読み込んでいる。pdf.jsは内部でこのURLを`fetch()`するため`connect-src`の対象になる。当初`blob:`を入れ忘れており、**`npm run tauri dev`では問題が起きなかったが、`npm run tauri build`でパッケージ化・インストールした版ではPDFが読み込めない**という不具合が発生した。原因は「Tauriのdevモード（`devUrl`経由でVite dev serverを見ている場合）はCSPをHTMLに注入しない一方、`frontendDist`をTauri自身の独自プロトコルで配信する本番ビルドでは実際にCSPが強制される」という差。**つまりdevで動いてもbuildでは壊れうる、CSP関連の変更は必ずbuild版でも実機確認すること。**

### フォント方針
Google FontsのCSS2 APIを実際に取得したところ、`M PLUS Rounded 1c`+`Zen Maru Gothic`の2書体で**622個**のwoff2ファイル（CJK文字のUnicode範囲分割）が必要と判明。任意の漢字が入力されうる用途のため全チャンクが必要になり自前ホスティングは非現実的と判断。ユーザーに確認し、**index.htmlのGoogle Fonts CDN読み込みを維持し、CSPにCDNホストを追加**する方針に決定・実施済み。

### アイコン・CI
- `npx tauri icon public/favicon.svg`でアイコン一式生成（`icon.ico`含む）。iOS/Android向け生成物は不要なため削除済み。
- その後、ユーザー提供の`Dangi_icon.png`（1024x1024、リポジトリ直下に保持・今後のアイコン再生成用ソース）に差し替え、`npx tauri icon Dangi_icon.png`で再生成。iOS/Android/Appx（Square*Logo.png・StoreLogo.png）向け生成物は同様に削除し、Windows向け7ファイル（`32x32.png`/`64x64.png`/`128x128.png`/`128x128@2x.png`/`icon.icns`/`icon.ico`/`icon.png`）のみ残す運用を継続。
- `.github/workflows/release.yml`: `v*.*.*`タグpushで`windows-latest`上でNode 24 + Rust stable(msvc)をセットアップし、`tauri-apps/tauri-action@v1`で`releaseDraft: true`のドラフトリリースを作成。署名用シークレットなし。**未検証**（テストタグをまだpushしていない）。

### セカンドディスプレイ非検出時のフォールバック実装（2026-07-19）
- **課題**: `openPresenterWindow()`（`src/lib/actions.ts`）は`getSecondaryScreenPlacement()`が`null`（2台目のモニタが見つからない）を返しても、`width:1000/height:700`の通常ウィンドウとして同じ画面上に発表者ビューを開いてしまい、投影中のフルスクリーン画面と重なって発表が成立しなくなる問題があった（コード上、単一モニタ時の代替UI・警告は皆無だったことをgrepで確認済み）。
- **対応**: `openPresenterWindow()`を`Promise<boolean>`に変更し、2台目のモニタが無い場合はウィンドウを開かず`false`を返すのみにした。呼び出し元（`App.tsx`/`PresentationView.tsx`）で`false`が返ったときに、**別ウィンドウを開く代わりに同じウィンドウ内で投影画面⇔発表者ビューを切り替える**フォールバックモードに入るようにした。
  - `App.tsx`: `singleScreenPresenter`という同一ウィンドウ限定のローカルstateを追加し、trueなら`<PresenterView singleScreenMode onExitSingleScreen={...}>`、falseなら`<PresentationView onPresenterFallback={...}>`を出し分け。
  - `PresentationView.tsx`: 「発表者ビューを開く」ボタン（`Tab`キーでも同じ動作）→`openPresenterWindow()`が`false`を返したら`onPresenterFallback()`を呼んでフォールバックモードに入る。
  - `PresenterView.tsx`: `singleScreenMode`時のみ「2台目のディスプレイが見つかりません」バナー＋「▶ 投影画面に戻る（Tab）」ボタンを表示。`Tab`/`Escape`キーでも同様に投影画面へ戻れる。
  - 2台目のモニタがある通常運用時の挙動（別ウィンドウをそのモニタ上に自動配置）は変更なし。
- **状態**: `npm run build`で型チェック・ビルドは通過済み。**実機での目視確認は未実施**（シングルモニタ環境で「投影画面が表示された状態で発表者ビューを開く→フォールバックバナーが出て発表者ビューに切り替わる→Tab/戻るボタンで投影画面に戻る」の一連の流れを確認する必要あり）。

### ユーザーフィードバックへの対応（2026-07-19）
- **初回起動時に前回PDFが残る問題**: `syncStore.ts`はセッション状態（PDFのblob URL含む）を`localStorage`に永続化しており、メインウィンドウが起動するたびにそれを読み込んで復元していたため、前回の発表で使ったPDFが次回起動時にも残ってしまっていた。ユーザーと相談し「常に新規アップロード画面から始める」方針に決定。メインウィンドウ（`?presenter`クエリなし）の初期化時は`localStorage`を読まず常に空状態から始まるよう`loadInitial()`を変更。発表者ウィンドウ（`?presenter=1`、同一セッション中にメインウィンドウから開かれる）は従来通り`localStorage`経由でメインウィンドウの現在の状態に同期する（この経路は残す必要がある——不用意に両方止めると発表者ウィンドウがメインと同期しなくなる）。
- **投影画面の解像度**: `pdf.ts`の`renderPageToCanvas`は「表示先ボックスサイズ×devicePixelRatio」ちょうどのネイティブ等倍で描画していた。観客に見せるメイン投影画面（`PresentationView`）のみ、`renderScale`パラメータ経由で1.5倍のオーバーサンプリングを追加（`MAIN_CANVAS_RENDER_SCALE`定数、`PresentationView.tsx`）。発表者ビューのサムネイル（`PresenterView.tsx`）は据え置き（`renderScale`未指定＝デフォルト1倍）。
- **アプリアイコンの差し替え**: 上記「アイコン・CI」参照。

### 実機動作確認（Rust/VS環境整備後に完了したもの）
- Rust 1.97.1 / VS Community 2026（C++デスクトップ開発ワークロード込み）を導入済み。
  - 注意: `rustup`/`cargo`をインストールした直後は、既存のターミナルセッションのPATHには反映されない（新しいシェルを開くか、PATHに`~/.cargo/bin`を明示的に足す必要がある）。
- `npm run tauri dev`でネイティブウィンドウ起動 — **確認済み**。
  - 初回試行時、Viteのファイル監視がRustのビルド成果物`src-tauri/target/`まで監視してしまい、cargoが書き込み中のDLLをロック競合で`EBUSY`クラッシュを起こした。`vite.config.ts`の`server.watch.ignored`で`src-tauri/**`を除外して解決。Tauri+Vite構成での既知の落とし穴。
- PDFアップロード・`PresentationView`描画 — **確認済み（devモード）**。
- 発表者ウィンドウの起動・ページ送り/タイマー同期 — **確認済み、問題なし**。
- 観客リアクション関連UIが表示されないこと — **確認済み**。
- ページ送り時の点滅 — **発見・修正・再確認済み**（上記参照）。
- `npm run tauri build`でNSISインストーラー生成 — **確認済み**（`src-tauri/target/release/bundle/nsis/Dangi_0.1.0_x64-setup.exe`、約2.4MB）。
- インストーラー実行・インストール — **確認済み**（SmartScreen警告を経て正常にインストール）。
- インストール版でのPDF読み込み — **当初失敗 → CSP修正（`connect-src`に`blob:`追加）→ 再ビルド・再インストールで解消、確認済み**。

## 残っている作業

- [x] `src-tauri/capabilities/default.json`の権限識別子が正しいか — **確認済み**。`gen/schemas/desktop-schema.json`と実際のTauri API呼び出し（`WebviewWindow`のconstructor/`getByLabel`/`setFocus`、`@tauri-apps/api/event`の`emit`/`listen`、`@tauri-apps/api/window`の`currentMonitor`/`availableMonitors`）を突き合わせ、`core:default`（`core:window:default`が`current-monitor`/`available-monitors`/`get-all-windows`をカバー、`core:webview:default`が`get-all-webviews`をカバー）＋明示的な`core:webview:allow-create-webview-window`・`core:window:allow-set-focus`・`core:event:default`で過不足なし。
- [ ] プロセス再起動時に常に新規アップロード画面から始まることの確認（上記「ユーザーフィードバックへの対応」参照。以前の「IndexedDBからのPDF自動復元確認」から方針変更）— **未実施**。あわせて、発表者ウィンドウをメインウィンドウから開いた際に現在のPDF・ページ位置・タイマーへ正しく同期することも回帰確認する。
- [ ] 第2モニタがある環境での自動配置確認 — **未実施**。開発機は現状シングルモニタ（1920×1080）構成のため、確認には複数モニタ環境が別途必要。
- [ ] フルスクリーン切り替えの動作確認 — **未実施**。
- [ ] YouTube URL・直接mp4 URLの動画埋め込み確認（CSPの`frame-src`/`media-src`まわりの回帰確認）— **未実施**。
- [ ] シングルモニタ環境でのフォールバック動作確認（上記「セカンドディスプレイ非検出時のフォールバック実装」参照）— **未実施**。開発機がシングルモニタのため本来は確認しやすいはずだが、まだ`npm run tauri dev`上での目視確認をしていない。「発表者ビューを開く」→バナー表示→発表者ビューに切り替わる→Tab/戻るボタンで投影画面に戻る、の一連を確認すること。

（上記4項目はネイティブウィンドウでの目視操作が必要。WindowsのフォアグラウンドウィンドウAPI制限によりバックグラウンドプロセスからの自動UI操作・スクリーンショット確認は本セッションでは断念、次回は実機で手動確認する）
- [x] git commit・GitHubリモートリポジトリ作成 — **完了**。初回コミット（55ファイル）を作成し、`gh repo create premath_for_windows --public --source=. --remote=origin --push`でhttps://github.com/hirohiro562/premath_for_windows にpush済み。git設定はこのリポジトリ限定（`user.name=hirohiro562`, `user.email=hiroki2270.kagawa@gmail.com`、`--global`ではない）。
- [x] GitHub Actionsの動作確認（テストタグpush）— **完了（2026-07-19）**。`v0.1.0-test1`をpushして`release.yml`を実行 → Rustビルド・NSISインストーラー生成は成功したが、最後のGitHubリリース作成ステップが`Resource not accessible by integration`で失敗。原因はデフォルト`GITHUB_TOKEN`が読み取り専用だったこと。`release.yml`に`permissions: contents: write`を追加（コミット`b14d585`）してタグを付け直し再実行 → ドラフトリリース作成・`Dangi_0.1.0_x64-setup.exe`アセット添付まで成功を確認。確認後、テスト用ドラフトリリースとタグ（リモート・ローカル双方）は削除済み。
- [x] LaTeX数式ノート機能 — **実装・実機確認済み**（上記6.参照）。

## 次回セッションでやること

残っているのは実機での目視操作が必要な検証のみ（前回セッションではバックグラウンドプロセスからの自動UI操作・スクリーンショット確認を断念済み）。

1. `npm run tauri dev`でアプリを起動し、以下を目視確認:
   - プロセス再起動時に常に新規アップロード画面から始まること（発表者ウィンドウをメインから開いた際の同期も回帰確認）
   - フルスクリーン切り替えの動作
   - YouTube URL・直接mp4 URLの動画埋め込み（CSPの`frame-src`/`media-src`回帰確認）
2. 第2モニタがある環境での自動配置確認（開発機がシングルモニタのため別途複数モニタ環境が必要）。
3. 本番リリースを行う際は、今回の`permissions: contents: write`修正が効いているので通常のバージョンタグ（例: `v0.1.0`）push一発でドラフトリリースが作成できるはず。
