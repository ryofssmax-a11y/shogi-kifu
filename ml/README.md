# 駒認識モデル（端末内CNN）

- 入力: 1マス＋周囲15%を32x32 RGBにしたもの。出力: 29クラス（empty、先手b／後手w × 歩香桂銀金角飛玉と杏圭全馬龍）。
- 約14.8万パラメータ。BatchNormを畳み込みに統合し、int8（出力チャネルごとのスケール）で量子化。`model/piece-model.bin` は約150KB。推論は `recog.js` の自前JS実装で、ライブラリは使っていない。
- 学習データは `gen.py` で作った合成画像だけ。駒の絵柄は次のCC0素材と、Noto Serif/Sans CJK・BIZ UDP明朝・DotGothic16のフォントで描いたもの。
  - sunfish-shogi/shogi-images（CC0 1.0） https://github.com/sunfish-shogi/shogi-images
  - Zahajki/shogi-piece-images 楷書A（CC0 1.0） https://github.com/Zahajki/shogi-piece-images
- 結果は `eval.json`（in＝同じ絵柄の別サンプル、hold＝学習に使っていない絵柄「hitomoji_wood」とゴシック体）。

## 自分の盤で微調整する
アプリの「学習データをzipで書き出す」で作った `shogi-cells.zip` を使います。
```
python gen.py 360 0 1 tr1.npz   # 合成データ（複数作ると良い）
python gen.py 300 0 99 test_in.npz; python gen.py 300 1 98 test_hold.npz
FINETUNE=1 REAL_ZIP=shogi-cells.zip python train.py 4
```
作られた `piece-model.bin` と `piece-model.json` を `model/` に置き換えます。
