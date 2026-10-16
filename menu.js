// ===== 起動時のモード選択メニュー（🏠ボタンでいつでも開ける） =====
(()=>{
document.body.insertAdjacentHTML('beforeend',`<div id="menu" class="menu"><div class="mbox">
 <div class="mhd"><img src="icon.svg" alt=""><b>将棋カメラ棋譜</b><small>モードを選んでください</small></div>
 <button class="mcard" id="mPlay"><span class="mi">🤖</span><span class="mt"><b>やねうら王と対局</b><small>スマホ・PCの画面でAIと対局（実際の盤をカメラで使う設定も可）</small></span></button>
 <button class="mcard" id="mRec"><span class="mi">📷</span><span class="mt"><b>棋譜をカメラで記録</b><small>実戦の盤を撮影して、指し手を棋譜に残す</small></span></button>
 <button class="mback" id="mBack">前回の画面を見る</button></div></div>`);
$('header').insertAdjacentHTML('afterbegin','<button id="bHome" class="ic" aria-label="メニュー">🏠</button>');
const show=()=>{closeSheet();$('#menu').classList.add('on');document.body.classList.add('menuon');},hide=()=>{$('#menu').classList.remove('on');document.body.classList.remove('menuon');};
$('#bHome').onclick=show;$('#mBack').onclick=hide;
// 対局：画面で指すのが標準。カメラ（実際の盤で指す）は対局設定のチェックで選ぶ
$('#mPlay').onclick=()=>{hide();st.playOpt={...(st.playOpt||{}),mode:'ai',camera:false};save();openPlay();};
// 記録：手が進んでいる棋譜や対局の続きなら新しい棋譜にしてから自動記録を開く
$('#mRec').onclick=()=>{hide();if(game.moves.length||game.vsAI||game.vsHuman)newGame();openAuto();};
window.showMenu=show;show();
})();
