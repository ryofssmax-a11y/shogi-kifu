// ===== AI表示（すべて表示 / 非表示 / 評価値バーのみ） =====
const AIV_DEF={view:'all',place:'v-left',label:false,bg:true};
const aiOpt=()=>({...AIV_DEF,...(st.ai||{})});
const EB={evals:{},cur:null,busy:null,
 key:p=>toSFEN(p).replace(/ \d+$/,''),
 put(p,inf){if(!inf)return;const sv=senteVal(inf,p.turn);if(sv)this.evals[this.key(p)]=Math.max(-30000,Math.min(30000,sv.cp));},
 vw(){const o=aiOpt();return o.view==='bar'&&o.place.startsWith('v')&&this.active()?20:0;},
 // 評価値を出せる状況か（検討中、AI対局中、AIを有効にした人対人）
 active(){if(PLAY.on&&PLAY.opt)return PLAY.opt.mode!=='human'||!!PLAY.opt.hints;return !!(KT.open&&KT.ready);},
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
function ensureBars(){const o=aiOpt(),show=o.view==='bar'&&EB.active();let h=$('#evbarH'),v=$('#evbarV');
 const wantH=show&&o.place.startsWith('h'),wantV=show&&o.place.startsWith('v');
 if(wantH){if(!h){h=document.createElement('div');h.id='evbarH';h.className='evbar h';h.innerHTML='<i></i><em></em>';}const at=o.place==='h-below'?$('#hand0'):$('#hand1');
  if(o.place==='h-below'){if(at.nextSibling!==h)at.after(h);}else if(at.previousSibling!==h)at.before(h);}else if(h)h.remove();
 if(wantV){if(!v){v=document.createElement('div');v.id='evbarV';v.className='evbar v';v.innerHTML='<i></i><em></em>';}const bw=$('.bw2');
  if(o.place==='v-left'){if(bw.firstChild!==v)bw.prepend(v);}else if(bw.lastChild!==v)bw.append(v);}else if(v)v.remove();
 document.body.classList.toggle('evv',wantV);document.body.classList.toggle('evv-l',wantV&&o.place==='v-left');document.body.classList.toggle('evv-r',wantV&&o.place==='v-right');
 document.body.style.setProperty('--evw',wantV?'20px':'0px');
 document.body.classList.toggle('aiv-hide',o.view!=='all');document.body.classList.toggle('aiv-lbl',!!o.label);
 return show;}
let lastLay='';
function tickBar(){const show=ensureBars(),lay=[show,aiOpt().place,st.flip].join();if(lay!==lastLay){lastLay=lay;if(typeof fitBoard==='function')setTimeout(fitBoard,0);}if(!show)return;
 const cp=EB.value(),wr=cp==null?.5:winRate(Math.max(-3000,Math.min(3000,cp))),bottom=st.flip?1-wr:wr; // 下側の対局者の勝率
 const a=Math.abs(cp||0),lbl=cp==null?'…':a<300?'互角':(cp>0?'▲':'△')+(a<2000?'優勢':'勝勢');
 for(const el of[$('#evbarH'),$('#evbarV')]){if(!el)continue;const f=el.querySelector('i');if(el.classList.contains('v'))f.style.height=(bottom*100).toFixed(1)+'%';else f.style.width=(bottom*100).toFixed(1)+'%';
  el.querySelector('em').textContent=lbl;el.classList.toggle('flip',!!st.flip);el.title='';}}
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
 <div class="row ${o.view==='bar'?'':'hidden'}" id="${p}AivBar"><select id="${p}AivP">${opt('v-left','縦・盤の左',o.place)}${opt('v-right','縦・盤の右',o.place)}${opt('h-above','横・盤の上',o.place)}${opt('h-below','横・盤の下',o.place)}</select><label class="chk"><input type="checkbox" id="${p}AivL"${o.label?' checked':''}>互角/優勢/勝勢を表示</label></div>
 <label class="chk ${o.view==='hide'?'':'hidden'}" id="${p}AivBgW"><input type="checkbox" id="${p}AivBg"${o.bg?' checked':''}>対局中も裏で解析を続ける（終局後すぐに形勢グラフを見られる）</label></div>`;}
function bindAIView(p){const g=i=>document.getElementById(p+i);const upd=()=>{st.ai={view:g('AivV').value,place:g('AivP').value,label:g('AivL').checked,bg:g('AivBg').checked};save();
  g('AivBar').classList.toggle('hidden',st.ai.view!=='bar');g('AivBgW').classList.toggle('hidden',st.ai.view!=='hide');tickBar();render();};
 ['AivV','AivP','AivL','AivBg'].forEach(i=>g(i).onchange=upd);}
function openAIView(){openSheet('AI表示の設定',aiViewHTML('s')+'<p class="hint">「非表示」では評価値・勝率・候補手・悪手マーク・形勢グラフ・キャラの形勢コメントを出しません。ヒントボタンを押したときだけ手を示します。「評価値バーのみ」は数字や手を出さずに形勢をバーで示します（下側の対局者が有利なほど伸びます）。</p>');bindAIView('s');}
window.openAIView=openAIView;
// 対局設定に差し込む
const _openPlay=openPlay;openPlay=async function(){await _openPlay();const go=$('#poGo');if(go&&!$('#pAiv')){go.insertAdjacentHTML('beforebegin','<div id="pAiv"></div>');$('#pAiv').innerHTML=aiViewHTML('p');bindAIView('p');}};
$('#bPlay').onclick=()=>openPlay();
