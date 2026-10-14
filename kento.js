// ===== AI 検討（やねうら王 WASM ＋ つようら王11mini 評価関数） =====
const EV={name:'つようら王11mini',arch:'SFNN_ka2_4096_8_64_progress8',date:'2026-10-03',files:[['nn.bin',7711372],['progress.bin',1003104],['eval_options.txt',12]],base:'engine/eval/',cache:'sk-eval-tuyo11mini-20261003'};
const ENGINE_BYTES=705377+48295+2921,EVAL_BYTES=EV.files.reduce((a,f)=>a+f[1],0);
const MB=b=>(b/1048576).toFixed(1)+'MB';
const KT={w:null,ready:false,searching:false,pending:null,info:{},job:null,open:false,on:false,time:+(st.ktTime||0),multipv:+(st.ktMulti||3),lastStat:null,graph:null,lines:[]};window.KT=KT;
// ---------- SFEN / USI ----------
const SF={P:'P',L:'L',N:'N',S:'S',G:'G',B:'B',R:'R',K:'K'};
function toSFEN(p){let s='';for(let r=0;r<9;r++){let e=0;for(let c=0;c<9;c++){const x=p.b[r][c];if(!x){e++;continue;}if(e){s+=e;e=0;}const ch=x.o?x.k.toLowerCase():x.k;s+=(x.p?'+':'')+ch;}if(e)s+=e;if(r<8)s+='/';}
 let h='';for(const o of[0,1])for(const k of S.HAND_ORDER){const n=p.h[o][k];if(n)h+=(n>1?n:'')+(o?k.toLowerCase():k);}
 return s+' '+(p.turn?'w':'b')+' '+(h||'-')+' 1';}
const sqU=(r,c)=>(9-c)+'abcdefghi'[r];
const usi=m=>m.drop?m.k+'*'+sqU(m.tr,m.tc):sqU(m.fr,m.fc)+sqU(m.tr,m.tc)+(m.promote?'+':'');
function positionCmd(ply){return 'position sfen '+toSFEN(ps[0])+(ply?' moves '+game.moves.slice(0,ply).map(usi).join(' '):'');}
function pvToJa(p,tokens,prev,max=10){const out=[];for(const t of tokens.slice(0,max)){const m=S.legal(p).find(x=>usi(x)===t);if(!m)break;out.push(S.notation(p,m,prev));p=S.apply(p,m);prev=m;}return out;}
// 評価値（先手から見た値）と勝率
const winRate=cp=>1/(1+Math.exp(-cp/600));
function evalLabel(cp,mate){if(mate!=null)return(mate>0?'先手':'後手')+'の勝ち（詰みあり '+Math.abs(mate)+'手）';const a=Math.abs(cp),side=cp>0?'先手':'後手',sign=(cp>0?'+':'−')+a;
 return a<200?'互角 '+sign:(a<600?side+'やや有利 ':a<1500?side+'有利 ':side+'優勢 ')+sign;}
// ---------- エンジン起動 ----------
async function evalCached(){try{const c=await caches.open(EV.cache);for(const[f]of EV.files)if(!await c.match(EV.base+f))return false;return true;}catch(e){return false;}}
async function downloadEval(onProg){const c=await caches.open(EV.cache);let done=0;
 for(const[f]of EV.files){const r=await fetch(EV.base+f);if(!r.ok)throw new Error(f+' '+r.status);const rd=r.body.getReader(),chunks=[];
  for(;;){const{done:d,value}=await rd.read();if(d)break;chunks.push(value);done+=value.length;onProg(done/EVAL_BYTES);}
  await c.put(EV.base+f,new Response(new Blob(chunks)));}}
function startEngine(){return new Promise(async(res,rej)=>{if(KT.w&&KT.ready)return res();
 const c=await caches.open(EV.cache),files={},tr=[];for(const[f]of EV.files){const b=await (await c.match(EV.base+f)).arrayBuffer();files[f]=b;tr.push(b);}
 const th=Math.max(1,Math.min(4,(navigator.hardwareConcurrency||2)-1));KT.threads=th;
 KT.w=new Worker('engine/engine-worker.js');const base=new URL('engine/',location.href).href;
 KT.w.onmessage=e=>{const d=e.data;if(d.type==='error'){rej(new Error(d.message));return;}if(d.type!=='line')return;const l=d.line;
  if(/^id name/.test(l))KT.engineName=l.slice(8);if(l==='readyok'){KT.ready=true;res();}onLine(l);};
 KT.w.onerror=e=>rej(new Error(e.message||'worker error'));
 KT.w.postMessage({type:'init',base,files,threads:th,hash:64},tr);});}
const cmd=c=>KT.w.postMessage({type:'cmd',cmd:c});
// ---------- 探索の開始・停止（bestmove を待ってから次へ） ----------
function search(req){KT.pending=req;if(KT.searching){cmd('stop');return;}runPending();}
function runPending(){const r=KT.pending;KT.pending=null;if(!r)return;KT.info={};KT.cur=r;KT.searching=true;KT.t0=performance.now();
 cmd('setoption name MultiPV value '+r.multipv);cmd('usinewgame');cmd(positionCmd(r.ply));cmd(r.time?'go btime 0 wtime 0 byoyomi '+r.time:'go infinite');paintSoon();}
function stopSearch(){KT.pending=null;if(KT.searching)cmd('stop');}
function onLine(l){if(l.startsWith('info ')&&/ pv /.test(l)&&KT.cur){const t=l.split(' '),g=k=>{const i=t.indexOf(k);return i<0?null:t[i+1]};
  if(t.includes('lowerbound')||t.includes('upperbound'))return;
  const mpv=+(g('multipv')||1),sc=t.indexOf('score'),kind=t[sc+1],v=+t[sc+2],pv=t.slice(t.indexOf('pv')+1);
  KT.info[mpv]={depth:+g('depth'),seldepth:+g('seldepth'),nodes:+g('nodes'),nps:+g('nps'),time:+g('time'),cp:kind==='cp'?v:null,mate:kind==='mate'?(String(t[sc+2]).startsWith('-')?-1:1)*(parseInt(String(t[sc+2]).replace(/[+-]/,''))||1):null,pv};
  paintSoon();return;}
 if(l.startsWith('bestmove')){KT.searching=false;const r=KT.cur;KT.cur=null;if(r&&r.done)r.done(KT.info,l);if(KT.pending)runPending();else paintSoon();}}
// 手番側の値 → 先手から見た値
function senteVal(info,turn){if(!info)return null;if(info.mate!=null){const m=turn?-info.mate:info.mate;return{cp:m>0?30000:-30000,mate:m};}return{cp:turn?-info.cp:info.cp,mate:null};}
// ---------- 画面 ----------
const nav=$('.nav');nav.insertAdjacentHTML('beforeend','<button id="bKento" aria-label="AI検討">🧠</button>');
nav.insertAdjacentHTML('afterend',`<div id="kento" class="kento hidden"></div>`);
$('#bKento').onclick=()=>{KT.open=!KT.open;$('#kento').classList.toggle('hidden',!KT.open);if(!KT.open){KT.on=false;stopSearch();}paint();};
let paintT=null;const paintSoon=()=>{if(!paintT)paintT=setTimeout(()=>{paintT=null;paint();},150);};
async function paint(){const el=$('#kento');if(!KT.open)return;
 if(!self.crossOriginIsolated){el.innerHTML=`<p class="hint">AI検討の準備のため、一度ページを読み込み直します（初回のみ）。</p><button class="pri" id="ktReload" style="width:100%">読み込み直す</button>`;$('#ktReload').onclick=()=>location.reload();return;}
 if(!KT.ready&&!KT.loading){if(!(await evalCached())){el.innerHTML=`<b>AI検討を使うには、エンジンのダウンロードが必要です</b>
  <p class="hint">思考エンジン やねうら王（${MB(ENGINE_BYTES)}）＋ 評価関数 ${EV.name}（${MB(EVAL_BYTES)}）＝合計 約${MB(ENGINE_BYTES+EVAL_BYTES)}。<br>一度ダウンロードすると端末に保存され、次回からは通信しません。Wi-Fiでのダウンロードをおすすめします。</p>
  <div class="row"><button class="pri" id="ktDl">ダウンロードする（${MB(ENGINE_BYTES+EVAL_BYTES)}）</button><button id="ktAbout">ⓘ について</button></div><div class="ktbar hidden" id="ktProg"><i></i></div>`;
  $('#ktAbout').onclick=about;$('#ktDl').onclick=async()=>{$('#ktDl').disabled=true;$('#ktProg').classList.remove('hidden');
   try{await downloadEval(f=>{$('#ktProg i').style.width=(f*100).toFixed(1)+'%';$('#ktDl').textContent=`ダウンロード中… ${Math.round(f*100)}%`;});}catch(e){alert('ダウンロードに失敗しました: '+e.message);$('#ktDl').disabled=false;return;}paint();};return;}
  KT.loading=true;el.innerHTML='<p class="hint">エンジンを起動しています…</p>';try{await startEngine();}catch(e){KT.loading=false;el.innerHTML=`<p class="hint">エンジンを起動できませんでした: ${e.message}</p>`;return;}KT.loading=false;KT.on=true;analyzeHere();return;}
 if(KT.loading)return;
 const p=pos(),i1=KT.info[1],sv=senteVal(i1,p.turn),cp=sv?sv.cp:0,wr=winRate(Math.max(-3000,Math.min(3000,cp)));
 const lines=Object.keys(KT.info).sort((a,b)=>a-b).slice(0,KT.multipv).map(k=>{const inf=KT.info[k],s=senteVal(inf,p.turn);const ja=pvToJa(p,inf.pv,game.moves[view-1],8);
  return`<div class="pvl"><b>${k}</b><span class="pvs">${s.mate!=null?(s.mate>0?'+詰':'−詰'):(s.cp>0?'+':'')+s.cp}</span><span class="pvm">${ja.join(' ')}</span></div>`;}).join('');
 el.innerHTML=`<div class="ktop"><b id="ktEval">${sv?evalLabel(sv.cp,sv.mate):(KT.searching?'考え中…':'—')}</b><span class="ktst">${i1?`深さ${i1.depth}・${(i1.nodes/1e4).toFixed(0)}万局面・${(i1.nps/1e3).toFixed(0)}k/秒`:''}</span></div>
 <div class="wr"><i style="width:${(wr*100).toFixed(1)}%"></i><span class="l">▲${(wr*100).toFixed(0)}%</span><span class="r">△${(100-wr*100).toFixed(0)}%</span></div>
 <div id="ktLines">${lines||'<p class="hint">'+(S.legal(p).length?'':'詰みの局面です')+'</p>'}</div>
 <div class="row"><button id="ktGo" class="${KT.on?'':'pri'}">${KT.on?'■ 停止':'▶ 検討'}</button>
 <select id="ktTime">${[[0,'時間: 無制限'],[1000,'1秒'],[3000,'3秒'],[10000,'10秒']].map(([v,t])=>`<option value="${v}"${v===KT.time?' selected':''}>${t}</option>`).join('')}</select>
 <select id="ktMulti">${[1,3].map(v=>`<option value="${v}"${v===KT.multipv?' selected':''}>候補${v}手</option>`).join('')}</select></div>
 <div class="row"><button id="ktAll">📈 全体を解析</button><button id="ktAbout">ⓘ エンジン</button></div><div id="ktGraph"></div>`;
 $('#ktGo').onclick=()=>{KT.on=!KT.on;if(KT.on)analyzeHere();else stopSearch();paint();};
 $('#ktTime').onchange=e=>{KT.time=+e.target.value;st.ktTime=KT.time;save();if(KT.on)analyzeHere();};
 $('#ktMulti').onchange=e=>{KT.multipv=+e.target.value;st.ktMulti=KT.multipv;save();if(KT.on)analyzeHere();};
 $('#ktAll').onclick=analyzeGame;$('#ktAbout').onclick=about;drawGraph();}
function analyzeHere(){if(!KT.ready||!KT.on||KT.job)return;if(!S.legal(pos()).length){stopSearch();KT.info={};paintSoon();return;}search({ply:view,time:KT.time,multipv:KT.multipv});}
// 局面を移動したら検討し直す
const _render=render;let navT=null;render=function(){_render();decorateMoves();if(KT.open&&KT.on&&KT.ready&&!KT.job){clearTimeout(navT);navT=setTimeout(analyzeHere,250);KT.info={};paintSoon();}};
// ---------- 全体解析と形勢グラフ ----------
async function analyzeGame(){if(!KT.ready)return;const N=game.moves.length;if(!N){toast('まだ指し手がありません');return;}
 const per=+(prompt(`全${N}手を解析します。1手あたりの時間（秒）`,'1')||0);if(KT.job)return;if(!per)return;
 KT.on=false;stopSearch();const ev=[];KT.job={n:0,N};const b=$('#ktAll');
 for(let i=0;i<=N;i++){if(!KT.job)break;const p=ps[i];
  if(!S.legal(p).length){ev.push(p.turn?30000:-30000);continue;}
  const info=await new Promise(res=>search({ply:i,time:Math.round(per*1000),multipv:1,done:inf=>res(inf[1])}));
  const s=senteVal(info,p.turn);ev.push(s?s.cp:(ev[i-1]||0));KT.job&&(KT.job.n=i);const bb=$('#ktAll');if(bb)bb.textContent=`解析中… ${i}/${N}（タップで中止）`;
  game.analysis={evals:ev.slice(),per,engine:EV.name,date:Date.now()};drawGraph();}
 KT.job=null;save();render();paint();toast('全体の解析が終わりました');}
// 悪手・疑問手: 指した側から見た勝率の下がり幅
function marks(){const a=game.analysis;if(!a)return{};const out={};for(let i=1;i<a.evals.length&&i<=game.moves.length;i++){const o=ps[i-1].turn,w0=winRate(a.evals[i-1]),w1=winRate(a.evals[i]),drop=o?w1-w0:w0-w1;
 if(drop>=.2)out[i]='悪手';else if(drop>=.1)out[i]='疑問手';}return out;}
function decorateMoves(){const mk=marks();document.querySelectorAll('#moves .mv').forEach(r=>{const i=+r.dataset.i;if(mk[i]){const t=r.querySelector('.t');t.insertAdjacentHTML('beforeend',` <em class="mk ${mk[i]==='悪手'?'bad':'dub'}">${mk[i]==='悪手'?'??':'?'} ${mk[i]}</em>`);}});}
function drawGraph(){const el=$('#ktGraph');const a=game.analysis;if(!el||!a)return;const n=a.evals.length,W=340,H=120,X=i=>8+i*(W-16)/Math.max(1,game.moves.length),Y=cp=>H/2-(winRate(Math.max(-3000,Math.min(3000,cp)))-.5)*(H-16);
 const mk=marks();const pts=a.evals.map((v,i)=>`${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
 el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" class="graph"><rect x="0" y="0" width="${W}" height="${H/2}" fill="rgba(255,138,61,.08)"/><line x1="0" x2="${W}" y1="${H/2}" y2="${H/2}" stroke="#999" stroke-dasharray="3 3"/>
 <line x1="${X(view)}" x2="${X(view)}" y1="0" y2="${H}" stroke="var(--sel)" stroke-width="2"/><polyline points="${pts}" fill="none" stroke="var(--acc)" stroke-width="2"/>
 ${a.evals.map((v,i)=>mk[i]?`<circle cx="${X(i)}" cy="${Y(v)}" r="5" fill="${mk[i]==='悪手'?'#e53935':'#fb8c00'}" data-i="${i}"/>`:'').join('')}
 <text x="4" y="12" font-size="10" fill="var(--sub)">先手有利</text><text x="4" y="${H-4}" font-size="10" fill="var(--sub)">後手有利</text></svg>
 <p class="hint">グラフをタップするとその手に移動します。${Object.keys(mk).length?`悪手 ${Object.values(mk).filter(x=>x==='悪手').length}・疑問手 ${Object.values(mk).filter(x=>x==='疑問手').length}`:''}（${a.engine}・1手${a.per}秒）</p>`;
 el.querySelector('svg').onclick=e=>{const r=e.currentTarget.getBoundingClientRect(),x=(e.clientX-r.left)*W/r.width;go(Math.round((x-8)/((W-16)/Math.max(1,game.moves.length))));};}
document.addEventListener('click',e=>{if(e.target.id==='ktAll'&&KT.job){KT.job=null;stopSearch();e.stopImmediatePropagation();e.preventDefault();}},true);
// ---------- クレジット ----------
function about(){openSheet('AIエンジンについて',`<p><b>思考エンジン: やねうら王</b>（${KT.engineName||'YaneuraOu'}）<br>やねうら王プロジェクト／GPLv3。<a href="https://github.com/yaneurao/YaneuraOu" target="_blank" rel="noopener">ソースコード</a>（コミット c1b80ea、2026-09-14）を Emscripten 3.1.43 で WebAssembly にビルドしました。変更点とビルド方法: <a href="engine/BUILD.md" target="_blank">BUILD.md</a>／<a href="engine/LICENSE-YaneuraOu-GPLv3.txt" target="_blank">ライセンス全文</a></p>
 <p><b>評価関数: ${EV.name}</b>（${EV.arch}、${EV.date}版）<br>やねうら王プロジェクト／MIT License。水匠5より R150〜200 ほど強いとされる、2026年10月14日公開の小型評価関数です。<a href="https://yaneuraou.yaneu.com/2026/10/14/tsuyou-11-mini-micro-released-under-mit-license/" target="_blank" rel="noopener">公開のお知らせ</a>／<a href="https://yaneurao.fanbox.cc/posts/12761272" target="_blank" rel="noopener">配布ページ</a>／<a href="engine/eval/LICENSE-TuyouraOu11mini.txt" target="_blank">ライセンス</a></p>
 <p class="hint">エンジンは端末内（ブラウザの中）で動き、局面がどこかに送られることはありません。スレッド数 ${KT.threads||'-'}・置換表 64MB。定跡は使っていません。勝率は評価値から計算した目安です。</p>`);}
