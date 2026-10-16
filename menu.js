// ===== 起動時メニューと、各モードの準備画面（対局の設定・カメラ記録の案内）。🏠でいつでも開く =====
// 流れ: メニュー →［やねうら王と対局／ふたりで対局］→ 準備画面（AIの準備もここで）→ 対局 → 終局 → メニュー
//              →［実際の盤を記録］→ 案内画面（自動記録／1手ずつ撮影／タップ入力）→ 記録
(()=>{
const lastPlay=()=>({mode:'ai',side:'sente',h:'平手',level:3,think:3000,resign:2500,main:0,byo:0,camera:false,voice:false,bName:'',wName:'',clockSwitch:'auto',face:true,hints:false,...(st.playOpt||{})});
const sel=(id,opts,v)=>`<select id="${id}">${opts.map(([x,t])=>`<option value="${x}"${String(x)===String(v)?' selected':''}>${t}</option>`).join('')}</select>`;
const seg=(id,opts,v)=>`<div class="seg" id="${id}">${opts.map(([x,t])=>`<button data-v="${x}"${String(x)===String(v)?' class="on"':''}>${t}</button>`).join('')}</div>`;
const bindSeg=(id,cb)=>document.querySelectorAll(`#${id} button`).forEach(b=>b.onclick=()=>{document.querySelectorAll(`#${id} button`).forEach(x=>x.classList.toggle('on',x===b));cb&&cb(b.dataset.v);});
const segVal=id=>{const b=document.querySelector(`#${id} button.on`);return b?b.dataset.v:null;};
const chk=(id,on,t)=>`<label class="chk"><input type="checkbox" id="${id}"${on?' checked':''}> ${t}</label>`;
// ---------- メニュー ----------
document.body.insertAdjacentHTML('beforeend',`<div id="menu" class="menu"><div class="mbox">
 <div class="mhd"><img src="icon.svg" alt=""><b>将棋カメラ棋譜</b></div>
 <div id="mCont"></div>
 <div class="msec">対局する</div>
 <button class="mcard" id="mAI"><span class="mi">🤖</span><span class="mt"><b>やねうら王と対局</b><small>スマホ・PCの画面で指す｜強さ10段階</small></span><span class="mgo">›</span></button>
 <button class="mcard" id="mHU"><span class="mi">👥</span><span class="mt"><b>ふたりで対局</b><small>1台を向かい合って使う｜対局時計つき</small></span><span class="mgo">›</span></button>
 <div class="msec">記録する</div>
 <button class="mcard" id="mRec"><span class="mi">📷</span><span class="mt"><b>実際の盤を記録</b><small>盤をカメラで映して、指し手を棋譜に残す</small></span><span class="mgo">›</span></button>
 <div class="mlinks"><button id="mGames">📂 保存した棋譜</button><button id="mKento">🧠 AIで検討</button><button id="mSet">⚙ 設定</button></div></div></div>`);
$('header').insertAdjacentHTML('afterbegin','<button id="bHome" class="ic" aria-label="メニュー">🏠</button>');
const hide=()=>{$('#menu').classList.remove('on');document.body.classList.remove('menuon');};
function show(){closeSheet();const c=$('#mCont'),live=PLAY.on&&!PLAY.result,n=game?game.moves.length:0;
 c.innerHTML=live||n?`<button class="mcard mcont" id="mGoOn"><span class="mi">▶</span><span class="mt"><b>${live?'対局に戻る':'続きから'}</b><small>${game.name}・${n}手</small></span><span class="mgo">›</span></button>`:'';
 if($('#mGoOn'))$('#mGoOn').onclick=hide;$('#menu').classList.add('on');document.body.classList.add('menuon');}
const back=()=>{const b=$('#suMenu');if(b)b.onclick=show;};
$('#bHome').onclick=show;
$('#mAI').onclick=()=>{hide();openSetup('ai');};$('#mHU').onclick=()=>{hide();openSetup('human');};$('#mRec').onclick=()=>{hide();openRecord();};
$('#mGames').onclick=()=>{hide();showGames();};$('#mSet').onclick=()=>{hide();openAIView();};
$('#mKento').onclick=()=>{hide();if(!KT.open)$('#bKento').onclick();setTimeout(()=>$('#kento').scrollIntoView({behavior:'smooth',block:'start'}),100);};
// ---------- 対局の準備画面（やねうら王／ふたり） ----------
async function openSetup(mode){const o=lastPlay();if(mode==='ai'||mode==='human')o.mode=mode;const ai=o.mode==='ai';
 const coi=self.crossOriginIsolated,ok=!ai||(coi&&await evalCached());let lv=o.level;
 openSheet(ai?'🤖 やねうら王と対局':'👥 ふたりで対局',`<div class="setup">
 ${ai?`<div id="suEng"></div>
  <div class="sust"><span>1</span>強さを選ぶ</div><div class="lvgrid">${LEVELS.map((L,i)=>`<button data-lv="${i+1}"><b>${i+1}</b><small>${L.n}</small></button>`).join('')}</div>
  <div class="sust"><span>2</span>手番を選ぶ</div>${seg('suSide',[['sente','▲先手で指す'],['gote','△後手で指す'],['furi','振り駒']],o.side)}`
 :`<div class="sust"><span>1</span>対局者の名前<small>（空欄でもOK）</small></div><div class="row"><input type="text" id="suBN" placeholder="▲先手（手前）" value="${o.bName}"><input type="text" id="suWN" placeholder="△後手（向こう側）" value="${o.wName}"></div>
  <div class="sust"><span>2</span>持ち時間</div>${seg('suMain',[[0,'なし'],[5,'5分'],[10,'10分'],[30,'30分']],[0,5,10,30].includes(+o.main)?o.main:0)}`}
 <button class="pri sugo" id="suGo"></button>
 <details class="sudet"><summary>詳細設定（手合割・秒読み・カメラなど）</summary>
  <label>手合割</label>${sel('suH',S.HANDICAPS.map(h=>[h,h]),o.h)}<p class="hint">駒落ちは上手（△）から指します。</p>
  ${ai?`<label>持ち時間</label>${sel('suMain',[[0,'なし'],[1,'1分'],[5,'5分'],[10,'10分'],[30,'30分']],o.main)}`:''}
  <label>秒読み</label>${sel('suByo',[[0,'なし'],[10,'10秒'],[30,'30秒'],[60,'60秒']],o.byo)}
  ${ai?`<label>AIの思考時間（Lv.8〜10）</label>${sel('suT',[[1000,'1秒'],[3000,'3秒'],[5000,'5秒'],[10000,'10秒']],o.think)}
  <label>AIの投了</label>${sel('suR',[[0,'投了しない（詰むまで指す）'],[1500,'評価値 −1500 で投了'],[2500,'評価値 −2500 で投了'],[4000,'評価値 −4000 で投了']],o.resign)}
  ${chk('suVoice',o.voice,'AIの手を読み上げる')}`
  :`<label>時計の切り替え</label>${sel('suSw',[['auto','指したら自動で切り替え'],['tap','自分の時計ボタンを押して切り替え']],o.clockSwitch)}
  ${chk('suFace',o.face,'向かい側の時計・ボタンを180°回転（対面用）')}${chk('suHint',o.hints,'AIのヒントを使えるようにする（AIエンジンが必要）')}`}
  ${chk('suCam',o.camera,'📷 カメラモード：実際の盤で指し、カメラで手を検出して記録')}
  <div id="pAiv"></div>
 </details>
 <button class="mback" id="suMenu">‹ メニューに戻る</button></div>`);
 back();if(window.aiViewHTML){$('#pAiv').innerHTML=aiViewHTML('p');bindAIView('p');}
 const upd=()=>{const g=$('#suGo');if(ai){document.querySelectorAll('.setup .lvgrid button').forEach(b=>b.classList.toggle('on',+b.dataset.lv===lv));g.textContent=`やねうら王 Lv.${lv}（${LEVELS[lv-1].n}）と対局開始`;g.disabled=!ok;}else g.textContent='対局開始';};
 if(ai){document.querySelectorAll('.setup .lvgrid button').forEach(b=>b.onclick=()=>{lv=+b.dataset.lv;upd();});bindSeg('suSide');}else bindSeg('suMain');upd();
 // AIの準備（初回のみ）：読み込み直し → ダウンロード をこの画面の中で済ませる
 if(ai&&!ok){const e=$('#suEng');
  if(!coi){e.innerHTML=`<div class="sueng"><b>はじめにAIの準備をします（初回のみ）</b><p>準備のため、ページを一度読み込み直します。読み込み後にこの画面へ戻ります。</p><button class="pri" id="suRl">読み込み直す</button></div>`;$('#suRl').onclick=()=>{st.menuNext='ai';save();location.reload();};}
  else{e.innerHTML=`<div class="sueng"><b>AIエンジンのダウンロード（約9MB・初回のみ）</b><p>一度ダウンロードすると端末に保存され、次回からは通信しません。Wi-Fiでのダウンロードがおすすめです。</p><button class="pri" id="suDl">ダウンロードする</button><div class="ktbar hidden" id="suProg"><i></i></div></div>`;
   $('#suDl').onclick=async()=>{$('#suDl').disabled=true;$('#suProg').classList.remove('hidden');
    try{await downloadEval(f=>{$('#suProg i').style.width=(f*100).toFixed(1)+'%';$('#suDl').textContent=`ダウンロード中… ${Math.round(f*100)}%`;});}catch(er){alert('ダウンロードに失敗しました: '+er.message);$('#suDl').disabled=false;$('#suDl').textContent='もう一度ダウンロード';return;}
    toast('AIの準備ができました');openSetup('ai');};}}
 $('#suGo').onclick=async()=>{const g=i=>$('#'+i),main=ai?+g('suMain').value:+segVal('suMain');
  const v={...o,mode:o.mode,h:g('suH').value,main,byo:+g('suByo').value,camera:g('suCam').checked};
  if(ai)Object.assign(v,{level:lv,side:segVal('suSide')||'sente',think:+g('suT').value,resign:+g('suR').value,voice:g('suVoice').checked});
  else Object.assign(v,{bName:g('suBN').value.trim(),wName:g('suWN').value.trim(),clockSwitch:g('suSw').value,face:g('suFace').checked,hints:g('suHint').checked});
  st.playOpt=v;save();await startPlay(v);};}
// ⚔️ボタン・「もう一局」など、対局設定を開く入口はすべてこの準備画面にする
openPlay=()=>openSetup();window.openPlay=openPlay;
// ---------- 実際の盤を記録：案内画面 ----------
function openRecord(){const has=!!(game&&game.moves.length&&!game.vsAI&&!game.vsHuman);
 openSheet('📷 実際の盤を記録',`<div class="setup">
 <ol class="steps"><li><b>スマホを盤の真上に固定する</b><small>スタンドなどで、盤全体が画面に入る高さに</small></li>
 <li><b>画面の枠に盤の四隅を合わせる</b><small>${st.corners?'前回の位置を覚えています。ずれていたら合わせ直せます':'最初の1回だけ。次からは前回の位置を使います'}</small></li>
 <li><b>あとは普通に指すだけ</b><small>駒を動かして手を離すと、少し待って自動で棋譜になります</small></li></ol>
 ${has?`<div class="sust">どの棋譜に記録しますか</div>${seg('rWhich',[['new','新しい棋譜'],['cont','前回の続き']],'new')}<p class="hint">前回: ${game.name}・${game.moves.length}手</p>`:''}
 <div id="rNew"><label>手合割</label>${sel('rH',S.HANDICAPS.map(h=>[h,h]),'平手')}</div>
 <button class="pri sugo" id="rAuto">🎥 自動で記録をはじめる</button>
 <div class="row"><button id="rShot">📷 1手ずつ撮影</button><button id="rTap">✋ タップで入力</button></div>
 <p class="hint">「1手ずつ撮影」は指すたびに📷撮影ボタンで撮る方法、「タップで入力」はカメラを使わず画面の駒を動かす方法です。</p>
 <button class="mback" id="suMenu">‹ メニューに戻る</button></div>`);
 back();if(has)bindSeg('rWhich',w=>$('#rNew').classList.toggle('hidden',w==='cont'));
 const prep=()=>{if(!has||segVal('rWhich')!=='cont')newGame($('#rH').value);};
 $('#rAuto').onclick=()=>{prep();openAuto();};
 $('#rShot').onclick=()=>{prep();closeSheet();openCam();};
 $('#rTap').onclick=()=>{prep();closeSheet();toast('駒をタップして、動かす先をタップすると記録されます');};}
window.showMenu=show;window.openSetup=openSetup;window.openRecord=openRecord;
// ---------- 対局中の画面：カメラを使わない対局では、記録用の下ボタン（自動記録・撮影・戻る）を隠す ----------
const _pb=paintBar;paintBar=function(){document.body.classList.toggle('pnc',!!(PLAY.on&&!PLAY.result&&PLAY.opt&&!PLAY.opt.camera));_pb();};
// 終局画面からメニューへ
const _fin=finish;finish=function(r){const was=PLAY.result;_fin(r);const c=$('#peClose');if(!was&&c&&!$('#peMenu')){c.insertAdjacentHTML('beforebegin','<button id="peMenu">🏠 メニュー</button>');$('#peMenu').onclick=show;}};
// ---------- 起動 ----------
if(st.menuNext){const m=st.menuNext;delete st.menuNext;save();openSetup(m);}else show();
})();
