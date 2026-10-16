// ===== AI表示（すべて表示 / 非表示 / 評価値バーのみ） =====
const AIV_DEF={view:'all',place:'h-above',label:false,bg:true};
// バーは横向きのみ（左が▲先手・右が△後手で固定）。旧設定の縦置きは盤の上に読み替える
const aiOpt=()=>{const o={...AIV_DEF,...(st.ai||{})};if(!o.place.startsWith('h'))o.place='h-above';return o;};
// 対局中の📊ボタンで切り替える表示状態（未設定なら「評価値バーのみ」設定に従う）
const evShow=()=>st.evShow!=null?!!st.evShow:aiOpt().view==='bar';
const EB={evals:{},cur:null,busy:null,
 key:p=>toSFEN(p).replace(/ \d+$/,''),
 put(p,inf){if(!inf)return;const sv=senteVal(inf,p.turn);if(sv)this.evals[this.key(p)]=Math.max(-30000,Math.min(30000,sv.cp));},
 vw(){return 0;},
 // 評価値を出せる状況か（検討中、AI対局中、AIを有効にした人対人）
 active(){if(PLAY.on&&PLAY.opt)return PLAY.opt.mode!=='human'||!!PLAY.opt.hints||(evShow()&&KT.ready);return !!(KT.open&&KT.ready);},
 value(){ // 先手から見た評価値（なければ null）
  if(!PLAY.on&&KT.open&&KT.info[1]&&(!KT.cur||KT.cur.ply===view)){const sv=senteVal(KT.info[1],pos().turn);if(sv)return sv.cp;}
  if(!PLAY.on&&KT.open){const k=this.key(pos());return this.evals[k]??null;}
  for(let i=game.moves.length;i>=0;i--){const v=this.evals[this.key(ps[i])];if(v!=null)return v;if(game.moves.length-i>2)break;}return null;},
 toAnalysis(){const ev=[];for(let i=0;i<=game.moves.length;i++){const v=this.evals[this.key(ps[i])];if(v==null)return;ev.push(v);}game.analysis={evals:ev,per:0.7,engine:EV.name+'（対局中の裏解析）',date:Date.now()};save();}};
window.EB=EB;
// 検討で出た値も覚えておく
setInterval(()=>{if(!PLAY.on&&KT.open&&KT.info[1]&&KT.cur&&KT.cur.ply===view&&KT.info[1].depth>=8)EB.put(pos(),KT.info[1]);},500);
// ---------- 裏で解析（対局中） ----------
setInterval(()=>{const o=aiOpt();if(!PLAY.on||PLAY.result||!KT.ready||!EB.active())return;if(!(o.view==='bar'||(o.view==='hide'&&o.bg)||o.view==='all'))return;
 if(KT.searching||KT.pending||PLAY.thinking||EB.busy!=null)return;const ply=game.moves.length,p=ps[ply];if(EB.evals[EB.key(p)]!=null||!S.legal(p).length)return;
 EB.busy=ply;search({ply,multipv:1,go:'go btime 0 wtime 0 byoyomi 700',done:inf=>{EB.busy=null;if(inf[1]&&inf[1].depth>=4&&ps[ply]===p)EB.put(p,inf[1]);}});},300);
// ---------- バーの描画 ----------
function ensureBars(){const o=aiOpt(),show=EB.active()&&(PLAY.on?evShow():o.view==='bar');let h=$('#evbarH');const v=$('#evbarV');if(v)v.remove();
 if(show){if(!h){h=document.createElement('div');h.id='evbarH';h.className='evbar h';h.innerHTML='<i></i><span class="l"></span><span class="r"></span><em></em>';}const at=o.place==='h-below'?$('#hand0'):$('#hand1');
  if(o.place==='h-below'){if(at.nextSibling!==h)at.after(h);}else if(at.previousSibling!==h)at.before(h);}else if(h)h.remove();
 document.body.classList.remove('evv','evv-l','evv-r');document.body.style.setProperty('--evw','0px');
 document.body.classList.toggle('aiv-hide',o.view!=='all');document.body.classList.toggle('aiv-lbl',!!o.label);
 return show;}
let lastLay='';
// 盤の向き・手番に関係なく、左＝▲先手（黒）・右＝△後手（白）。先手が有利なほど黒が右へ伸びる
function tickBar(){const show=ensureBars(),lay=[show,aiOpt().place,st.flip].join();if(lay!==lastLay){lastLay=lay;if(typeof fitBoard==='function')setTimeout(fitBoard,0);}if(!show)return;
 const cp=EB.value(),wr=cp==null?.5:winRate(Math.max(-3000,Math.min(3000,cp))),num=aiOpt().view==='all'&&cp!=null,pc=Math.round(wr*100);
 const a=Math.abs(cp||0),lbl=cp==null?'…':a<300?'互角':(cp>0?'▲':'△')+(a<2000?'優勢':'勝勢');
 const el=$('#evbarH');if(!el)return;el.querySelector('i').style.width=(wr*100).toFixed(1)+'%';
 el.querySelector('.l').textContent='▲先手'+(num?' '+pc+'%':'');el.querySelector('.r').textContent=(num?(100-pc)+'% ':'')+'後手△';el.querySelector('em').textContent=lbl;}
// キャラが盤・持ち駒・バーに重なる位置にいる間は隠す（スクロールで重ならなくなれば戻す）
function charaAvoid(){const ch=$('#chara');if(!ch||st.hideChara)return;ch.classList.remove('avoid');const c=ch.getBoundingClientRect();if(!c.width)return;
 const hit=['#hand0','#hand1','#board','#evbarH','#evbarV','#playbar','#playtop'].some(s=>{const e=$(s);if(!e||!e.offsetParent)return false;const r=e.getBoundingClientRect();return Math.min(r.right,c.right)-Math.max(r.left,c.left)>1&&Math.min(r.bottom,c.bottom)-Math.max(r.top,c.top)>1;});
 ch.classList.toggle('avoid',hit);}
setInterval(()=>{tickBar();charaAvoid();},250);addEventListener('scroll',charaAvoid,{passive:true});
// ---------- 隠すもの: 検討パネル・悪手マーク・グラフ ----------
const _marks=marks;marks=function(){return aiOpt().view==='all'?_marks():{};};
const _paint=paint;paint=async function(){await _paint();const el=$('#kento');if(!el||!KT.open)return;let c=$('#aivCtl');
 if(!c){el.insertAdjacentHTML('beforeend','<div id="aivCtl"></div>');c=$('#aivCtl');}if(!c.dataset.on){c.innerHTML=aiViewHTML('k');bindAIView('k');c.dataset.on=1;}
 const o=aiOpt();let n=$('#aivNote');if(o.view!=='all'){if(!n){el.insertAdjacentHTML('afterbegin','<p class="hint" id="aivNote"></p>');n=$('#aivNote');}n.textContent=o.view==='hide'?'AI表示: 非表示（評価値・候補手・グラフは隠しています）':'AI表示: 評価値バーのみ（盤の横のバー）';}else if(n)n.remove();};
// ---------- 設定UI（検討パネル・対局設定・設定から共通） ----------
function aiViewHTML(p){const o=aiOpt(),opt=(v,t,cur)=>`<option value="${v}"${v===cur?' selected':''}>${t}</option>`;
 return `<div class="aiv"><label>AI表示</label><select id="${p}AivV">${opt('all','すべて表示（評価値・勝率・候補手）',o.view)}${opt('hide','非表示（ヒントだけ使える）',o.view)}${opt('bar','評価値バーのみ（数字・手は出さない）',o.view)}</select>
 <div class="row ${o.view==='bar'?'':'hidden'}" id="${p}AivBar"><select id="${p}AivP">${opt('h-above','盤の上',o.place)}${opt('h-below','盤の下',o.place)}</select><label class="chk"><input type="checkbox" id="${p}AivL"${o.label?' checked':''}>互角/優勢/勝勢を表示</label></div>
 <label class="chk ${o.view==='hide'?'':'hidden'}" id="${p}AivBgW"><input type="checkbox" id="${p}AivBg"${o.bg?' checked':''}>対局中も裏で解析を続ける（終局後すぐに形勢グラフを見られる）</label></div>`;}
function bindAIView(p){const g=i=>document.getElementById(p+i);const upd=()=>{st.ai={view:g('AivV').value,place:g('AivP').value,label:g('AivL').checked,bg:g('AivBg').checked};save();
  g('AivBar').classList.toggle('hidden',st.ai.view!=='bar');g('AivBgW').classList.toggle('hidden',st.ai.view!=='hide');tickBar();render();};
 ['AivV','AivP','AivL','AivBg'].forEach(i=>g(i).onchange=upd);}
function openAIView(){openSheet('AI表示の設定',aiViewHTML('s')+'<p class="hint">「非表示」では評価値・勝率・候補手・悪手マーク・形勢グラフ・キャラの形勢コメントを出しません。ヒントボタンを押したときだけ手を示します。「評価値バーのみ」は数字や手を出さずに形勢をバーで示します。バーは盤の向きに関係なく左が▲先手（黒）・右が△後手（白）で、先手が有利なほど黒い部分が右へ伸びます。対局中は📊ボタンでいつでも表示・非表示を切り替えられます。</p>');bindAIView('s');}
window.openAIView=openAIView;
// 対局設定に差し込む
const _openPlay=openPlay;openPlay=async function(){await _openPlay();const go=$('#poGo');if(go&&!$('#pAiv')){go.insertAdjacentHTML('beforebegin','<div id="pAiv"></div>');$('#pAiv').innerHTML=aiViewHTML('p');bindAIView('p');}};
$('#bPlay').onclick=()=>openPlay();
// ---------- 対局中の📊ボタン（評価値バーの表示/非表示。人と対局中でも使える） ----------
async function toggleEv(){const on=!evShow();st.evShow=on;save();
 if(on&&PLAY.on&&!KT.ready){if(!(self.crossOriginIsolated&&await evalCached())){st.evShow=false;save();paintBar();toast('評価値の表示にはAIエンジン（約9MB）が必要です。対局のあと🧠AI検討からダウンロードできます');return;}
  toast('AIエンジンを起動しています…');try{await startEngine();}catch(e){st.evShow=false;save();paintBar();toast('エンジンを起動できませんでした: '+e.message);return;}}
 paintBar();tickBar();toast(on?'📊 評価値を表示（左が▲先手・右が△後手）':'評価値を隠しました');}
window.toggleEv=toggleEv;
const _paintBar=paintBar;paintBar=function(){_paintBar();if(!PLAY.on)return;const row=$('#playbar .row'),d=$('#pDecl'),ex=$('#pEv');if(ex){ex.classList.toggle('on',evShow());return;}if(!row)return;
 const hu=PLAY.opt&&PLAY.opt.mode==='human',b=document.createElement('button');b.id='pEv';if(hu)b.className='sm';b.setAttribute('aria-label','評価値の表示切替');
 b.textContent=hu?'📊':'📊 評価値';b.classList.toggle('on',evShow());b.onclick=toggleEv;if(d)row.insertBefore(b,d);else row.append(b);};
// ===== 大駒を強調（飛・角・龍・馬、玉/王） =====
const BIGP_DEF={on:true,size:'std',king:true},BIGP_SC={std:1.1,l:1.15,xl:1.2};
const bigOpt=()=>({...BIGP_DEF,...(st.bigp||{})});
function applyBig(){const o=bigOpt();document.body.classList.toggle('bigp',o.on);document.body.classList.toggle('bigk',o.on&&o.king);document.body.style.setProperty('--bps',BIGP_SC[o.size]||1.1);
 if(!o.on)return;const p=pos();document.querySelectorAll('#board .cell').forEach(c=>{const x=p.b[+c.dataset.r][+c.dataset.c];c.classList.toggle('big',!!x&&(x.k==='R'||x.k==='B'));c.classList.toggle('kg',!!x&&x.k==='K');});
 document.querySelectorAll('.hand .hp').forEach(b=>b.classList.toggle('big',b.dataset.k==='R'||b.dataset.k==='B'));}
const _render3=render;render=function(){_render3();applyBig();};
function bigHTML(){const o=bigOpt();return `<div class="aiv"><label class="chk"><input type="checkbox" id="bgOn"${o.on?' checked':''}> 大駒を強調（飛・角・龍・馬を少し大きく太字に）</label>
 <div class="row"><select id="bgSz">${[['std','標準（+10%）'],['l','大（+15%）'],['xl','特大（+20%）']].map(([v,t])=>`<option value="${v}"${v===o.size?' selected':''}>${t}</option>`).join('')}</select><label class="chk"><input type="checkbox" id="bgK"${o.king?' checked':''}> 玉/王も強調</label></div></div>`;}
function bindBig(){const u=()=>{st.bigp={on:$('#bgOn').checked,size:$('#bgSz').value,king:$('#bgK').checked};save();render();};['bgOn','bgSz','bgK'].forEach(i=>$('#'+i).onchange=u);}
const _openAIView=openAIView;openAIView=function(){_openAIView();$('#shBody').insertAdjacentHTML('beforeend','<b>駒の表示</b>'+bigHTML());bindBig();};window.openAIView=openAIView;
window.openPieceView=()=>{openSheet('駒の表示',bigHTML());bindBig();};
applyBig();
