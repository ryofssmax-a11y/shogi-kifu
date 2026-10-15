// ===== 対局モード（やねうら王＋つようら王11mini と指す） =====
// 強さの調整（PLAY.md に詳しく）: 低いレベルほど 探索ノード数を絞り、MultiPV で複数の候補手を読ませ、
// 最善手からの評価値の損（cp）が「許容量」以内の手から、損が小さいほど選ばれやすい重み exp(-損/温度) でランダムに選ぶ。
const LEVELS=[
 {n:'入門',go:'go nodes 300',mpv:8,loss:900,blunder:.25,mateP:.5},
 {n:'初級',go:'go nodes 1000',mpv:7,loss:550,blunder:.12,mateP:.7},
 {n:'初級＋',go:'go nodes 3000',mpv:6,loss:350,blunder:.05,mateP:1},
 {n:'中級',go:'go nodes 10000',mpv:5,loss:220,blunder:0,mateP:1},
 {n:'中級＋',go:'go nodes 30000',mpv:4,loss:140,blunder:0,mateP:1},
 {n:'上級',go:'go nodes 100000',mpv:3,loss:80,blunder:0,mateP:1},
 {n:'有段',go:'go nodes 300000',mpv:3,loss:40,blunder:0,mateP:1},
 {n:'三段',time:1000,mpv:2,loss:15,blunder:0,mateP:1},
 {n:'五段',time:3000,mpv:1,loss:0,blunder:0,mateP:1},
 {n:'最強',time:0,mpv:1,loss:0,blunder:0,mateP:1}]; // 最強 = 設定した思考時間をすべて使う
const PLAY={on:false,gen:0,result:null,thinking:false,hint:null,await:null,lowCount:0,clock:null,opt:null};window.PLAY=PLAY;window.LEVELS=LEVELS;
const lvName=l=>`やねうら王 Lv.${l}（${LEVELS[l-1].n}）`;
const posKey=p=>toSFEN(p).replace(/ \d+$/,'');
const eng=()=>PLAY.opt.engineSide;
// ---------- 候補手から選ぶ ----------
function pickMove(info,p,lv,rnd=Math.random){const L=LEVELS[lv-1],lg=S.legal(p),c=[];
 for(const k of Object.keys(info).sort((a,b)=>a-b)){const inf=info[k];if(!inf||!inf.pv||!inf.pv.length)continue;const m=lg.find(x=>usi(x)===inf.pv[0]);if(!m||c.some(x=>x.m===m))continue;
  c.push({m,v:inf.mate!=null?(inf.mate>0?30000-inf.mate:-30000-inf.mate):inf.cp,mate:inf.mate});}
 if(!c.length)return{m:lg[Math.floor(rnd()*lg.length)],v:0,why:'random'};
 c.sort((a,b)=>b.v-a.v);const best=c[0];
 if(best.mate>0&&rnd()<L.mateP)return{...best,why:'mate'};
 const safe=c.filter(x=>!(x.mate!=null&&x.mate<0)),pool0=safe.length?safe:c;
 if(L.blunder&&rnd()<L.blunder){const x=pool0[Math.floor(rnd()*pool0.length)];return{...x,why:'blunder',loss:best.v-x.v};}
 const pool=pool0.filter(x=>best.v-x.v<=L.loss);if(pool.length<=1||!L.loss)return{...pool[0]||best,why:'best',loss:0};
 const T=L.loss/2,w=pool.map(x=>Math.exp(-(best.v-x.v)/T)),sum=w.reduce((a,b)=>a+b,0);let r=rnd()*sum;
 for(let i=0;i<pool.length;i++){r-=w[i];if(r<=0)return{...pool[i],why:'weighted',loss:best.v-pool[i].v};}return{...pool[0],why:'weighted',loss:0};}
function goCmd(lv,sideToMove){const L=LEVELS[lv-1];if(L.go)return L.go;let t=L.time||PLAY.opt.think;
 const ck=PLAY.clock;if(ck){const rem=ck.rem[sideToMove];t=rem>0?Math.min(t,rem/25+ck.byo*.8):Math.min(t,Math.max(300,ck.byo-800));t=Math.max(200,Math.round(t));}
 return 'go btime 0 wtime 0 byoyomi '+t;}
function think(lv,ply){return new Promise(res=>search({ply,multipv:LEVELS[lv-1].mpv,go:goCmd(lv,ps[ply].turn),done:inf=>res(JSON.parse(JSON.stringify(inf)))}));}
window.pickMove=pickMove;window.thinkLv=think;
// ---------- 勝敗の判定 ----------
function inCamp(o,r){return o?r>=6:r<=2;}
function canDeclare(p,o){let kr=-1,kc=-1;for(let r=0;r<9;r++)for(let c=0;c<9;c++){const x=p.b[r][c];if(x&&x.k==='K'&&x.o===o){kr=r;kc=c;}}
 if(kr<0||!inCamp(o,kr)||S.inCheck(p,o))return false;let n=0,pt=0;
 for(let r=0;r<9;r++)for(let c=0;c<9;c++){const x=p.b[r][c];if(x&&x.o===o&&x.k!=='K'&&inCamp(o,r)){n++;pt+=x.k==='B'||x.k==='R'?5:1;}}
 for(const k of S.HAND_ORDER)pt+=(p.h[o][k]||0)*(k==='B'||k==='R'?5:1);
 return n>=10&&pt>=(o?27:28);}
function checkResult(){const N=game.moves.length,p=ps[N];
 if(!S.legal(p).length)return{winner:1-p.turn,reason:'詰み'};
 const key=posKey(p),hits=[];for(let i=0;i<=N;i++)if(posKey(ps[i])===key)hits.push(i);
 if(hits.length>=4){const a=hits[0];const chk=[true,true];for(let i=a;i<N;i++){const mover=ps[i].turn;if(!S.inCheck(ps[i+1],1-mover))chk[mover]=false;}
  if(chk[0]!==chk[1])return{winner:chk[0]?1:0,reason:'連続王手'};return{winner:null,reason:'千日手'};}
 return null;}
// ---------- 時計 ----------
function clockStart(){const ck=PLAY.clock;if(!ck)return;ck.side=pos().turn;ck.t0=performance.now();}
function clockStop(){const ck=PLAY.clock;if(!ck||ck.side==null)return true;const used=performance.now()-ck.t0,o=ck.side;ck.side=null;
 if(ck.rem[o]>0){ck.rem[o]-=used;if(ck.rem[o]<0){if(-ck.rem[o]>ck.byo){ck.rem[o]=0;return false;}ck.rem[o]=0;}}else if(used>ck.byo)return false;return true;}
function clockLeft(o){const ck=PLAY.clock;let r=ck.rem[o],b=ck.byo;if(ck.side===o){const u=performance.now()-ck.t0;if(r>0){r-=u;if(r<0){b+=r;r=0;}}else b-=u;}return{r,b};}
const fmt=ms=>{ms=Math.max(0,ms);const s=Math.ceil(ms/1000);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
setInterval(()=>{if(!PLAY.on||PLAY.result||!PLAY.clock)return;for(const o of[0,1]){const el=$('#pc'+o);const{r,b}=clockLeft(o);if(PLAY.clock.side===o&&r<=0&&b<=0){finish({winner:1-o,reason:'切れ負け'});return;}if(!el)continue;
 el.textContent=(r>0?fmt(r):'秒読み '+Math.max(0,Math.ceil(b/1000)))+'';el.classList.toggle('on',PLAY.clock.side===o);el.classList.toggle('low',r<=0&&b<10000);
 if(PLAY.clock.side===o&&r<=0&&b<=0){finish({winner:1-o,reason:'切れ負け'});}}},200);
// ---------- 進行 ----------
const _commit=commit;
commit=async function(m,photo){
 if(PLAY.on&&!PLAY.result&&!PLAY.engineMoving){const p=pos();
  if(view!==game.moves.length){toast('対局中は最新の局面で指してください');go(1e9);return;}
  if(p.turn===eng()){if(PLAY.await&&sameMove(m,PLAY.await)){PLAY.engineMoving=true;try{await _commit(m,photo);}finally{PLAY.engineMoving=false;}PLAY.await=null;afterMove(true);return;}
   toast(PLAY.await?`やねうら王の手「${PLAY.awaitTxt}」を盤で指してください`:'やねうら王の番です');render();return;}
  await _commit(m,photo);afterMove(false);return;}
 return _commit(m,photo);};
async function afterMove(byEngine){if(!PLAY.on||PLAY.result)return;
 if(!clockStop()){finish({winner:1-ps[game.moves.length-1].turn,reason:'切れ負け'});return;}
 PLAY.hint=null;const r=checkResult();if(r){finish(r);return;}
 clockStart();paintBar();if(pos().turn===eng())engineTurn();}
async function engineTurn(){const gen=++PLAY.gen,lv=PLAY.opt.level,ply=game.moves.length,p=ps[ply],t0=performance.now();
 if(canDeclare(p,eng())){finish({winner:eng(),reason:'入玉宣言'});return;}
 PLAY.thinking=true;paintBar();$('#chara').classList.add('think');say('うーん、考え中…');
 const info=await think(lv,ply);if(gen!==PLAY.gen||!PLAY.on||PLAY.result)return;
 const ch=pickMove(info,p,lv);const bestInf=info[1];
 // 投了: 自分から見て評価値が閾値より悪い状態が2手続いたら（または詰まされる読み筋）
 const myV=bestInf?(bestInf.mate!=null?(bestInf.mate>0?30000:-30000):bestInf.cp):0;PLAY.lastEval=myV;
 if(PLAY.opt.resign&&(myV<=-PLAY.opt.resign||(bestInf&&bestInf.mate!=null&&bestInf.mate<0&&-bestInf.mate<=5))){PLAY.lowCount++;if(PLAY.lowCount>=2||(bestInf.mate!=null&&bestInf.mate<0)){PLAY.thinking=false;$('#chara').classList.remove('think');finish({winner:1-eng(),reason:'投了'});return;}}else PLAY.lowCount=0;
 const wait=Math.max(0,500-(performance.now()-t0));if(wait)await new Promise(r=>setTimeout(r,wait));if(gen!==PLAY.gen||PLAY.result)return;
 PLAY.thinking=false;$('#chara').classList.remove('think');PLAY.lastPick=ch;
 const txt=S.notation(p,ch.m,game.moves[ply-1]);
 const mood=myV>1500?'ピンチかも…がんばって！':myV>600?'ちょっと苦しいかな？':myV<-1500?'いい感じ！このまま押し切ろう':myV<-600?'優勢だよ！':'';
 if(PLAY.opt.camera){PLAY.await=ch.m;PLAY.awaitTxt=txt;paintBar();say(`やねうら王: ${txt}。実際の盤で指してね`,true);speak([txt]);showAwait();return;}
 PLAY.engineMoving=true;try{await _commit(ch.m);}finally{PLAY.engineMoving=false;}
 if(PLAY.opt.voice)speak([txt]);if(mood)setTimeout(()=>say(mood,true),900);afterMove(true);}
function showAwait(){const sb=$('#shBody');if(!sb||!$('#avid'))return;let el=$('#playAwait');if(!el){sb.insertAdjacentHTML('afterbegin','<div id="playAwait" class="pawait"></div>');el=$('#playAwait');}
 el.innerHTML=PLAY.await?`<b>やねうら王の手: ${PLAY.awaitTxt}</b><br><small>実際の盤でこの手を指してください。検出すると記録して、あなたの番になります。</small><div class="row"><button id="paDone">指した（手動で確定）</button></div>`:(PLAY.result?'':'<small>あなたの番です。盤で指してください。</small>');
 const b=$('#paDone');if(b)b.onclick=()=>commit(PLAY.await);}
// カメラ対局中は、やねうら王の手を待つ間だけ候補をその手に絞る（検出を確実にする）
const _legalNow=legalNow;legalNow=function(){const l=_legalNow();if(PLAY.on&&PLAY.await&&window.AUTO&&AUTO.on)return l.filter(m=>sameMove(m,PLAY.await));return l;};
function finish(r){if(PLAY.result)return;PLAY.gen++;stopSearch();PLAY.thinking=false;PLAY.await=null;$('#chara').classList.remove('think');
 if(PLAY.clock)PLAY.clock.side=null;PLAY.result=r;game.result=r;save();
 const ho=game.handicap!=='平手',you=1-eng(),txt=r.winner==null?'千日手（引き分け）':(r.winner===you?'あなたの勝ち':'やねうら王の勝ち');
 const why={'詰み':'詰み','投了':r.winner===you?'やねうら王が投了':'あなたが投了','千日手':'同一局面4回','連続王手':'連続王手の千日手','入玉宣言':'入玉宣言','切れ負け':'時間切れ'}[r.reason];
 render();paintBar();say(r.winner===you?'やったね！勝ちだよ🎉':r.winner==null?'引き分け！いい勝負だったね':'残念…次は勝とう！',true);
 openSheet('対局終了',`<p style="font-size:20px"><b>${txt}</b>（${why}・${game.moves.length}手）</p><p class="hint">棋譜は通常の対局として保存されました（KIF に対局者名と結果が入ります）。</p>
 <div class="row"><button class="pri" id="peAna">📈 全体を解析</button><button id="peNew">もう一局</button></div><div class="row"><button id="peClose">閉じる</button></div>`);
 $('#peAna').onclick=()=>{closeSheet();PLAY.on=false;paintBar();KT.open=true;$('#kento').classList.remove('hidden');paint().then(()=>analyzeGame());};
 $('#peNew').onclick=()=>openPlay();$('#peClose').onclick=closeSheet;}
// ---------- 操作 ----------
function matta(){if(!PLAY.on||PLAY.result)return;PLAY.gen++;stopSearch();PLAY.thinking=false;PLAY.await=null;$('#chara').classList.remove('think');
 const you=1-eng();let n=0;const pop=()=>{const k=game.moves.length;game.moves.pop();if(game.photos.includes(k)){idb.del(game.id+':'+k);game.photos=game.photos.filter(x=>x!==k);delete refImgs[k];}ps=S.positions(game.handicap,game.moves,game.start);view=game.moves.length;n++;};
 if(game.moves.length)pop();while(game.moves.length&&pos().turn!==you)pop();
 if(pos().turn!==you){save();sel=null;render();clockStart();paintBar();engineTurn();return;}
 PLAY.lowCount=0;save();sel=null;changed=[];render();if(PLAY.clock)clockStart();paintBar();toast(`待った（${n}手戻しました）`);say('待ったね。じっくり考えよう');
 if(PLAY.opt.camera&&window.AUTO){AUTO.ref=null;toast('実際の盤も戻してください（静止した盤面を新しい基準にします）');}}
async function hint(){if(!PLAY.on||PLAY.result||PLAY.thinking||pos().turn===eng())return;const gen=PLAY.gen,ply=game.moves.length;$('#pHint').disabled=true;say('ヒントを考え中…');
 const info=await new Promise(res=>search({ply,multipv:1,go:'go btime 0 wtime 0 byoyomi 1000',done:i=>res(i)}));$('#pHint')&&($('#pHint').disabled=false);
 if(gen!==PLAY.gen||ply!==game.moves.length||!info[1])return;const m=S.legal(pos()).find(x=>usi(x)===info[1].pv[0]);if(!m)return;
 PLAY.hint=m;PLAY.hints=(PLAY.hints||0)+1;render();const t=S.notation(pos(),m,game.moves[ply-1]);say(`ヒント: ${t} はどう？`,true);toast('ヒント: '+t);}
function resign(){if(!PLAY.on||PLAY.result)return;if(!confirm('投了しますか？'))return;finish({winner:eng(),reason:'投了'});}
function declare(){if(!PLAY.on||PLAY.result)return;const you=1-eng();if(pos().turn!==you){toast('自分の手番で宣言してください');return;}
 if(canDeclare(pos(),you))finish({winner:you,reason:'入玉宣言'});else toast('入玉宣言の条件を満たしていません（玉が敵陣・敵陣に10枚以上・点数 先手28/後手27以上・王手されていない）');}
window.playOps={matta,hint,resign,declare,checkResult,canDeclare,finish};
// ヒントのマスを強調
const _render2=render;render=function(){_render2();const h=PLAY.hint;if(h&&PLAY.on){document.querySelectorAll('#board .cell').forEach(c=>{const r=+c.dataset.r,cc=+c.dataset.c;if((!h.drop&&r===h.fr&&cc===h.fc)||(r===h.tr&&cc===h.tc))c.classList.add('hint');});}};
// ---------- 画面 ----------
$('.nav').insertAdjacentHTML('beforeend','<button id="bPlay" aria-label="AIと対局">⚔️</button>');
$('.nav').insertAdjacentHTML('afterend','<div id="playbar" class="playbar hidden"></div>');
$('#bPlay').onclick=()=>openPlay();
function paintBar(){const el=$('#playbar');setTimeout(()=>{const on=PLAY.on&&!el.classList.contains('hidden');document.body.classList.toggle('playing',on);if(on)document.documentElement.style.setProperty('--pbh',el.offsetHeight+'px');},0);if(!PLAY.on&&!PLAY.result){el.classList.add('hidden');return;}el.classList.toggle('hidden',!PLAY.on);if(!PLAY.on)return;
 const e=eng(),ho=game.handicap!=='平手',nm=o=>o===e?`🤖 ${lvName(PLAY.opt.level)}`:'🙂 あなた',mk=o=>o?'△':'▲';
 const st_=PLAY.result?'終局':PLAY.thinking?'<span class="spin"></span> やねうら王が考え中…':PLAY.await?`盤で「${PLAY.awaitTxt}」を指してください`:pos().turn===e?'やねうら王の番':'あなたの番です';
 el.innerHTML=`<div class="prow"><span>${mk(1)} ${nm(1)}</span>${PLAY.clock?'<b class="pclk" id="pc1"></b>':''}</div><div class="prow"><span>${mk(0)} ${nm(0)}</span>${PLAY.clock?'<b class="pclk" id="pc0"></b>':''}</div>
 <div class="pst" id="pSt">${st_}</div><div class="row"><button id="pMatta">↶ 待った</button><button id="pHint">💡 ヒント</button><button id="pDecl">入玉宣言</button><button id="pResign">🏳 投了</button></div>`;
 $('#pMatta').onclick=matta;$('#pHint').onclick=hint;$('#pResign').onclick=resign;$('#pDecl').onclick=declare;
 const busy=!!PLAY.result;['pMatta','pHint','pResign','pDecl'].forEach(i=>$('#'+i).disabled=busy);if(PLAY.thinking||pos().turn===e)$('#pHint').disabled=true;
 if($('#avid'))showAwait();}
async function openPlay(){const o=st.playOpt||{side:'sente',h:'平手',level:3,think:3000,resign:2500,main:0,byo:0,camera:false,voice:false};
 const ok=self.crossOriginIsolated&&await evalCached();
 openSheet('AIと対局（対局モード）',`${ok?'':`<p class="hint" style="color:var(--acc)">対局にはAIエンジン（約9MB）が必要です。🧠 AI検討からダウンロードしてください。</p><button id="pDl" style="width:100%">🧠 AI検討を開いてダウンロード</button>`}
 <label>手番</label><select id="poSide"><option value="sente">先手（下手）で指す</option><option value="gote">後手（上手）で指す</option><option value="furi">振り駒で決める</option></select>
 <label>手合割</label><select id="poH">${S.HANDICAPS.map(h=>`<option>${h}</option>`).join('')}</select>
 <label>強さ</label><select id="poLv">${LEVELS.map((L,i)=>`<option value="${i+1}">Lv.${i+1} ${L.n}</option>`).join('')}</select>
 <label>思考時間（Lv.8〜10）</label><select id="poT">${[[1000,'1秒'],[3000,'3秒'],[5000,'5秒'],[10000,'10秒']].map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select>
 <label>AIの投了</label><select id="poR">${[[0,'投了しない（詰むまで指す）'],[1500,'評価値 −1500 で投了'],[2500,'評価値 −2500 で投了'],[4000,'評価値 −4000 で投了']].map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select>
 <label>対局時計</label><div class="row"><select id="poMain">${[[0,'持ち時間なし'],[1,'1分'],[5,'5分'],[10,'10分'],[30,'30分']].map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select><select id="poByo">${[[0,'秒読みなし'],[10,'秒読み10秒'],[30,'秒読み30秒'],[60,'秒読み60秒']].map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></div>
 <label class="chk"><input type="checkbox" id="poCam"> 実際の盤で指す（カメラの自動記録で手を検出。AIの手は読み上げるので盤に並べてください）</label>
 <label class="chk"><input type="checkbox" id="poVoice"> AIの手を読み上げる</label>
 <button class="pri" id="poGo" style="width:100%;min-height:56px" ${ok?'':'disabled'}>対局開始</button>
 <p class="hint">強さは探索量の制限と「わざと少し損な手を選ぶ」ランダム性で調整しています（Lv.1〜7: 探索ノード数、Lv.8〜10: 思考時間）。待った・ヒントはいつでも使えます。</p>`);
 $('#poSide').value=o.side;$('#poH').value=o.h;$('#poLv').value=o.level;$('#poT').value=o.think;$('#poR').value=o.resign;$('#poMain').value=o.main;$('#poByo').value=o.byo;$('#poCam').checked=o.camera;$('#poVoice').checked=o.voice;
 if($('#pDl'))$('#pDl').onclick=()=>{closeSheet();KT.open=true;$('#kento').classList.remove('hidden');paint();};
 $('#poGo').onclick=async()=>{const v={side:$('#poSide').value,h:$('#poH').value,level:+$('#poLv').value,think:+$('#poT').value,resign:+$('#poR').value,main:+$('#poMain').value,byo:+$('#poByo').value,camera:$('#poCam').checked,voice:$('#poVoice').checked};st.playOpt=v;save();await startPlay(v);};}
async function startPlay(v){let side=v.side;if(side==='furi'){const tosses=[...Array(5)].map(()=>Math.random()<.5);side=tosses.filter(Boolean).length>=3?'sente':'gote';toast(`振り駒: 歩が${tosses.filter(Boolean).length}枚 → あなたは${side==='sente'?'先手':'後手'}`);}
 const you=side==='sente'?0:1;closeSheet();
 if(!KT.ready){$('#playbar').classList.remove('hidden');$('#playbar').innerHTML='<p class="hint">エンジンを起動しています…</p>';try{await startEngine();}catch(e){toast('エンジンを起動できませんでした: '+e.message);return;}}
 KT.on=false;KT.open=false;$('#kento').classList.add('hidden');stopSearch();
 const name=lvName(v.level);newGame(v.h,you===0?'あなた':name,you===1?'あなた':name);game.vsAI={level:v.level,you};
 PLAY.on=true;PLAY.result=null;PLAY.gen++;PLAY.hint=null;PLAY.await=null;PLAY.lowCount=0;PLAY.hints=0;
 PLAY.opt={...v,engineSide:1-you};PLAY.clock=(v.main||v.byo)?{rem:[v.main*60000,v.main*60000],byo:v.byo*1000,side:null}:null;save();
 say(`よろしくお願いします！ あなたは${you?(v.h==='平手'?'後手':'上手'):(v.h==='平手'?'先手':'下手')}だよ`,true);
 clockStart();paintBar();render();
 if(v.camera){await openAuto();showAwait();}
 if(pos().turn===eng())engineTurn();}
window.startPlay=startPlay;window.clockStartT=clockStart;window.openPlay=openPlay;
// 別の対局を開いたら対局モードを抜ける
const _load=load;load=function(){if(PLAY.on&&st.cur!==PLAY.gameId){PLAY.on=false;PLAY.gen++;stopSearch();}_load();PLAY.gameId=st.cur;paintBar();};
