# やねうら王 WebAssembly ビルド（このアプリ同梱分）

- ソース: https://github.com/yaneurao/YaneuraOu （GPLv3）コミット c1b80ea（2026-09-14）
- コンパイラ: Emscripten 3.1.43
- 変更点: `source/Makefile` の `-s PTHREAD_POOL_SIZE=32` を `6` に変更（スマホでの起動時のワーカー数・メモリを減らすため）。それ以外は無改変。
- ビルドコマンド（source/ で実行）:
```
make tournament COMPILER=em++ TARGET_CPU=WASM PYTHON=python3 \
  YANEURAOU_EDITION=YANEURAOU_ENGINE_SFNN_ka2_4096_8_64_progress8 \
  TARGET=../build/mini/yaneuraou.js EM_EXPORT_NAME=YaneuraOu \
  EM_INITIAL_MEMORY_SIZE=167772160 ENGINE_NAME=YaneuraOu-Tuyo11mini
```
- 生成物: yaneuraou.js / yaneuraou.wasm / yaneuraou.worker.js（このフォルダ）
- 評価関数: eval/ つようら王11mini（MIT、eval/LICENSE-TuyouraOu11mini.txt を参照）
