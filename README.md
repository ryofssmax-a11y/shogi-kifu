# 将棋カメラ棋譜

スマホのカメラで盤面を撮りながら将棋の棋譜を記録するWebアプリ（試作）。

https://ryofssmax-a11y.github.io/shogi-kifu/

## 詰将棋道場

一手詰・三手詰の詰将棋40問。初代iPad mini（iOS 9 Safari）でも動く1ファイル構成。

https://ryofssmax-a11y.github.io/shogi-kifu/tsume/

## 成り駒おとし

同じ駒を3つ以上つなげると一つ上の駒に出世する、将棋の駒の落ちものパズル。初代iPad mini（iOS 9 Safari）でも動く1ファイル構成。

https://ryofssmax-a11y.github.io/shogi-kifu/narikoma/

## 開発

ビルド不要の静的サイトです。`python -m http.server 8765` で http://localhost:8765/ を開けば動きます。
構成・決まりごと（公開時の `sw.js` バージョン更新など）・テストの流し方は [CLAUDE.md](CLAUDE.md) にまとめています。
