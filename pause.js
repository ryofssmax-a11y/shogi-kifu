// ===== 対局の中断・保存と再開 =====
// 対局中は操作バーを描き直すたび（＝1手ごと）に、対局の状態（設定・持ち時間の残り・ヒント回数）を棋譜の game.pause に保存する。
// アプリを閉じても、メニューの「対局を再開」や📂保存した棋譜から続きを指せる。ヘッダーの💾で明示的に保存・中断もできる。終局したら game.pause は消す。
(()=>{
function snap(){if(!PLAY.on||!PLAY.opt||!game)return;if(PLAY.result){if(game.pause){delete game.pause;save();}return;}
 const ck=PLAY.clock;game.pause={opt:PLAY.opt,clock:ck?{rem:[0,1].map(o=>Math.max(0,clockLeft(o).r)),byo:ck.byo}:null,hints:PLAY.hints||0,at:Date.now()};save();}
const _pb=paintBar;paintBar=function(){document.body.classList.toggle('plive',!!(PLAY.on&&!PLAY.result));_pb();snap();};
addEventListener('pagehide',snap);document.addEventListener('visibilitychange',()=>{if(document.hidden)snap();});
const desc=g=>{const o=g.pause.opt;return (o.mode==='ai'?`vs やねうら王 Lv.${o.level}`:'ふたりで対局')+`・${g.moves.length}手`;};
window.pauseDesc=desc;
// ---------- 💾 保存（中断） ----------
$('#bFlip').insertAdjacentHTML('beforebegin','<button id="bPause" class="ic" aria-label="対局を保存・中断">💾</button>');
$('#bPause').onclick=()=>{if(!PLAY.on||PLAY.result)return;const ck=PLAY.clock,side=ck?ck.side:null;if(ck&&side!=null)clockStop(); // 画面を開いている間は時計を止める
 snap();const n=game.moves.length;
 openSheet('💾 対局を保存しました',`<p>ここまでの棋譜（${n}手）と、対局の設定・持ち時間の残りを保存しました。</p>
 <p class="hint">中断しても、あとでメニューの「▶ 対局を再開」か「📂 保存した棋譜」から続きを指せます。対局中は1手ごとに自動でも保存しています。</p>
 <button class="pri" id="psGo" style="width:100%;min-height:52px">▶ 対局を続ける</button><button id="psQuit" style="width:100%;margin-top:8px">⏸ 中断してメニューへ</button>`);
 let done=false;const cont=()=>{if(done)return;done=true;if(ck&&side!=null&&PLAY.on&&!PLAY.result)clockStart(side);};
 $('#psGo').onclick=()=>{cont();closeSheet();};$('#shClose').addEventListener('click',cont,{once:true});$('#sheet').addEventListener('click',e=>{if(e.target.id==='sheet')cont();},{once:true});
 $('#psQuit').onclick=()=>{done=true;quit();};};
function quit(){PLAY.gen++;stopSearch();PLAY.thinking=false;PLAY.await=null;$('#chara').classList.remove('think');PLAY.on=false;closeSheet();paintBar();render();toast('対局を中断して保存しました');showMenu();}
// ---------- 再開 ----------
async function resumePlay(id){const g=st.games[id];if(!g||!g.pause)return;const z=g.pause,o=z.opt;
 if(o.mode==='ai'&&!(self.crossOriginIsolated&&await evalCached())){toast('再開するにはAIの準備が必要です');openSetup('ai');return;}
 if(PLAY.on){PLAY.on=false;PLAY.gen++;stopSearch();}
 hideMenu();closeSheet();st.cur=id;save();load();
 if(o.mode==='ai'&&!KT.ready){$('#playbar').classList.remove('hidden');$('#playbar').innerHTML='<p class="hint">エンジンを起動しています…</p>';try{await startEngine();}catch(e){toast('エンジンを起動できませんでした: '+e.message);return;}}
 if(o.mode==='human'&&o.hints&&!KT.ready&&self.crossOriginIsolated&&await evalCached()){try{await startEngine();}catch(e){}}
 KT.on=false;KT.open=false;$('#kento').classList.add('hidden');stopSearch();
 Object.assign(PLAY,{on:true,result:null,hint:null,await:null,lowCount:0,thinking:false,hints:z.hints||0,opt:{...o},gameId:id,clock:z.clock?{rem:z.clock.rem.slice(),byo:z.clock.byo,side:null}:null});PLAY.gen++;
 say('対局を再開します。続きからどうぞ',true);clockStart();paintBar();render();
 if(o.camera){await openAuto();if(o.mode==='ai')showAwait();}
 if(o.mode==='ai'&&pos().turn===eng())engineTurn();}
window.resumePlay=resumePlay;
// 保存した棋譜の一覧：中断中の対局はタップで再開
const _sg=showGames;showGames=function(){_sg();document.querySelectorAll('#shBody [data-open]').forEach(b=>{const g=st.games[b.dataset.open];if(!g||!g.pause)return;
 b.insertAdjacentHTML('beforeend','<br><small class="pz">⏸ 中断中の対局・タップで再開</small>');b.onclick=()=>resumePlay(g.id);});};
$('#bGames').onclick=()=>showGames();
})();
