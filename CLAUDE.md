# 将棋カメラ棋譜 — 開発の引き継ぎメモ

公開URL: https://ryofssmax-a11y.github.io/shogi-kifu/
リポジトリ: https://github.com/ryofssmax-a11y/shogi-kifu （`main` に push すると GitHub Pages に自動公開）

スマホのカメラで盤面を撮りながら棋譜を記録する PWA。**ビルド工程なし**の素の HTML/CSS/JS で、ファイルをそのまま配信している。
`package.json` はテスト用（puppeteer-core）だけで、アプリ本体は npm に依存しない。

## ローカルで動かす

```
python -m http.server 8765
```
→ http://localhost:8765/ を開く（Claude Code では `.claude/launch.json` の `shogi-kifu` で preview_start できる）。
カメラは `localhost` か https でしか使えない。スマホ実機で試すときは公開URLを使う。

## ファイル構成

| ファイル | 役割 |
|---|---|
| `index.html` | 画面の骨組み。下の JS をこの順番で読み込む |
| `shogi.js` | ルールエンジン（`Shogi`）。合法手・指し手適用・KIF/BOD 入出力・駒落ち。DOM 非依存で Node でもテストできる |
| `vision.js` | 射影変換で盤を正面化・マスごとの差分検出（`Vision`） |
| `griddetect.js` | 写真から 9x9 のマス目を自動検出 |
| `app.js` | アプリ本体。状態 `st`（localStorage `sk-state`）、写真（IndexedDB `shogi-kifu`）、盤の描画 `render()`、手入力、撮影、KIF 書き出し、対局一覧 |
| `auto.js` | 🎥自動記録（動き検出→静止したら差分から手を推定） |
| `recog.js` / `recog-ui.js` | 駒認識 CNN（int8・約150KB、自前の JS 推論）と、その画面（局面読み取り・再同期・学習データ zip 書き出し） |
| `kento.js` | AI 検討（やねうら王 WASM＋つようら王11mini）。評価関数は同意後に別キャッシュ `sk-eval-tuyo11mini-20261003` へ保存 |
| `taikyoku.js` | ⚔️対局モード（AI 10段階／人対人・時計・待った・投了・入玉宣言・千日手）。強さの設計は `PLAY.md` |
| `menu.js` | 起動時のモード選択メニュー（やねうら王と対局／棋譜をカメラで記録）。ヘッダーの🏠で再表示。最後に読み込む |
| `evalbar.js` | AI 表示設定（すべて/非表示/評価値バーのみ）、評価値バー、大駒強調 |
| `sw.js` | Service Worker：オフラインキャッシュ＋COOP/COEP ヘッダー付与（GitHub Pages で SharedArrayBuffer を使うため。WASM エンジンのスレッドに必須） |
| `engine/` | やねうら王 WASM ビルド一式と評価関数。作り方は `engine/BUILD.md`（GPLv3） |
| `model/` | 駒認識モデル（`piece-model.bin/json`）。学習スクリプトは `ml/`（`ml/README.md`） |
| `endai/` `tsume/` `narikoma/` | 独立したおまけアプリ（縁台将棋・詰将棋道場・成り駒おとし）。**各1ファイル完結・iOS 9 Safari 対応** |
| `tests/` | テスト（下記） |
| `screenshots/` | テストが書き出す確認用スクリーンショット |

## 守るべき決まり

1. **公開するときは `sw.js` の `V='sk-vNN'` を1つ上げる。** 上げないと利用者の端末に古いファイルが残る。コミットメッセージ末尾に `SW sk-vNN` と書く慣習。
   新しい JS/CSS を足したら `sw.js` の `F=[...]` と `index.html` の `<script>` の両方に追加する。
2. **後から読み込む JS が前の関数を上書きして機能を足す方式。** 例: `const _render=render; render=function(){_render(); ...}`。
   既存の上書きチェーン: `render`（app → kento → taikyoku → evalbar）、`stopCam`、`commit`、`legalNow`、`load`、`showGames`、`storePhoto`、`marks`、`paint`、`openPlay`、`openAIView`。
   読み込み順を変えると壊れるので、新機能は新しいファイルにして最後に読み込むのが安全。
3. グローバル共有の変数: `st`（保存される状態）・`game`・`ps`・`view`・`S`(=Shogi)・`$`。状態を変えたら `save()`。
4. **`endai/` `tsume/` `narikoma/` は初代 iPad mini（iOS 9）で動くことが条件。** JS は ES5 のみ（`var`、アロー関数・`let/const`・テンプレート文字列・`class` は不可）、CSS は Grid・`gap`・CSS変数・`aspect-ratio` 不可（各ファイル冒頭のコメント参照）。本体アプリにはこの制限はない。
5. スマホ縦画面（390x844 と 375x667）で1画面に収まることを確認してから公開する。
6. コードは1行に詰めた短い書き方。周囲に合わせる。コメント・UI 文言は日本語。

## テスト

- `node tests/engine.js` — ルールエンジンの単体テスト（Node だけで動く。現在 12 件すべて PASS）。
- それ以外の `tests/*.js` は puppeteer-core で Chrome を動かす画面テスト。準備:
  ```
  npm install
  python -m http.server 8765        # 別ターミナルで
  set CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe
  node tests/test.js
  ```
  `CHROME` を省くと Linux の `/usr/bin/google-chrome` を使う。`URL` 環境変数で接続先を変えられるテストもある（`PART` は playtest.js の部分実行）。
  結果のスクリーンショットは `screenshots/` に上書きされる。
- `tests/recog_parity.js` は PyTorch 側の参照出力 `ref_in.npy` / `ref_out.npy`（リポジトリには無い）が必要。`ML_REF` でその場所を指定する。

## これまでの経緯

2026-10-15〜16 に作成（`git log` 参照）。試作版 → 自動記録 → 駒認識 CNN → AI検討 → おまけ3アプリ → 盤の自動検出 → 対局モード → AI表示設定 → 大駒強調（sk-v12）→ 起動時メニュー・「戻る」ボタン（sk-v13）の順。
テストは元々 Linux 環境（`/workspace/shogi-kifu-app`）で書かれていたため、パスを相対化して Windows でも動くようにした。

## 次にやれそうなこと（未着手）

- README に本体機能の説明（自動記録・対局・検討）を追記
- 実機写真での駒認識の精度確認と微調整（`ml/README.md` の手順）
- 画面テストを1コマンドでまとめて流すスクリプト
