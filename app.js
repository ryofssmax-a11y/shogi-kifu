// ===== 将棋カメラ棋譜 アプリ本体 =====
const $=s=>document.querySelector(s),S=Shogi,V=Vision,RS=270;
const idb=(()=>{let p;const open=()=>p||(p=new Promise((res,rej)=>{const r=indexedDB.open('shogi-kifu',1);r.onupgradeneeded=()=>r.result.createObjectStore('photos');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}));
 const tx=(mode,fn)=>open().then(db=>new Promise((res,rej)=>{const t=db.transaction('photos',mode);const r=fn(t.objectStore('photos'));t.oncomplete=()=>res(r&&r.result);t.onerror=()=>rej(t.error)}));
 return{get:k=>tx('readonly',s=>s.get(k)),put:(k,v)=>tx('readwrite',s=>s.put(v,k)),del:k=>tx('readwrite',s=>s.delete(k))}})();
let st=JSON.parse(localStorage.getItem('sk-state')||'null')||{games:{},cur:null,theme:null,flip:false,corners:null,hideChara:false};
const save=()=>localStorage.setItem('sk-state',JSON.stringify(st));
let game,ps,view=0,sel=null,legalCache=null,changed=[],pendingPhoto=null;const refImgs={};
function newGame(h='平手',black='',white='',moves=[]){const id='g'+Date.now();const d=new Date();
 st.games[id]={id,handicap:h,black,white,moves,photos:[],created:Date.now(),name:`${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} ${h}`};
 st.cur=id;save();load();}
function load(){game=st.games[st.cur];if(!game)return newGame();ps=S.positions(game.handicap,game.moves);view=game.moves.length;sel=null;changed=[];legalCache=null;render();}
const pos=()=>ps[view];
function legalNow(){if(!legalCache||legalCache.v!==view||legalCache.n!==game.moves.length)legalCache={v:view,n:game.moves.length,l:S.legal(pos())};return legalCache.l;}
const toast=t=>{const e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('on'),2200)};
const sideName=o=>{const ho=game.handicap!=='平手';return o?(ho?'△上手':'△後手'):(ho?'▲下手':'▲先手')};
const notationAt=i=>S.notation(ps[i],game.moves[i],game.moves[i-1]);
// ---------- 描画 ----------
function render(){const p=pos(),fl=st.flip,last=view?game.moves[view-1]:null,lg=sel?legalNow().filter(m=>sel.drop?m.drop&&m.k===sel.k:!m.drop&&m.fr===sel.r&&m.fc===sel.c):[];
 $('#gName').textContent=game.name;$('#gInfo').textContent=`${game.handicap}・${game.moves.length}手${game.photos.length?'・📷'+game.photos.length:''}`;
 $('#files').innerHTML=[...Array(9)].map((_,i)=>`<span>${fl?i+1:9-i}</span>`).join('');
 $('#ranks').innerHTML=[...Array(9)].map((_,i)=>`<span>${S.KAN[fl?9-i:i+1]}</span>`).join('');
 let h='';for(let i=0;i<9;i++)for(let j=0;j<9;j++){const r=fl?8-i:i,c=fl?8-j:j,x=p.b[r][c],cls=['cell'];
  if(x&&(x.o===1)!==fl)cls.push('g');if(x&&x.p)cls.push('pr');
  if(last&&last.tr===r&&last.tc===c)cls.push('last');if(sel&&!sel.drop&&sel.r===r&&sel.c===c)cls.push('sel');
  if(lg.some(m=>m.tr===r&&m.tc===c))cls.push('tg',x?'cap':'');if(changed.includes(r*9+c))cls.push('chg');
  h+=`<div class="${cls.join(' ')}" data-r="${r}" data-c="${c}">${x?`<span>${x.p?S.CH1[x.k]:x.k==='K'&&x.o===1?'王':S.NAME[x.k]}</span>`:''}</div>`;}
 $('#board').innerHTML=h;
 for(const o of[0,1]){const el=$((o===1)!==fl?'#hand1':'#hand0');
  el.innerHTML=`<span class="lbl">${sideName(o)}${p.turn===o?' ●':''}</span>`+S.HAND_ORDER.filter(k=>p.h[o][k]).map(k=>`<button class="hp${(o===1)!==fl?' gh':''}${sel&&sel.drop&&sel.k===k&&p.turn===o?' sel':''}" data-o="${o}" data-k="${k}"><span>${S.NAME[k]}</span>${p.h[o][k]>1?`<sub>${p.h[o][k]}</sub>`:''}</button>`).join('');
}
 const lgAll=legalNow();
 $('#status').textContent=view<game.moves.length?`${view}手目の局面を表示中（ここから指すと以降の手は消えます）`:lgAll.length===0?`${sideName(p.turn)}の負け（詰み）`:`${sideName(p.turn)}の番${S.inCheck(p,p.turn)?'・王手！':''}`;
 $('#nPly').textContent=`${view}/${game.moves.length}手`;
 $('#moves').innerHTML=`<div class="mv${view===0?' on':''}" data-i="0"><span class="n">0</span><span class="t">開始局面（${game.handicap}）</span>${game.photos.includes(0)?'<img data-ph="0">':''}</div>`+
  game.moves.map((m,i)=>`<div class="mv${view===i+1?' on':''}" data-i="${i+1}"><span class="n">${i+1}</span><span class="t">${notationAt(i)}</span>${game.photos.includes(i+1)?`<img data-ph="${i+1}">`:''}</div>`).join('');
 document.querySelectorAll('#moves img[data-ph]').forEach(im=>idb.get(game.id+':'+im.dataset.ph).then(u=>{if(u)im.src=u}));
 const on=$('#moves .on'),mb=$('#moves');if(on){const t=on.offsetTop-mb.offsetTop;if(t<mb.scrollTop||t+on.offsetHeight>mb.scrollTop+mb.clientHeight)mb.scrollTop=t-mb.clientHeight+on.offsetHeight+4;}
 $('#chara').classList.toggle('hidden',!!st.hideChara);}
// ---------- 手入力 ----------
function truncateOk(){return view===game.moves.length||confirm(`${view}手目から指し直しますか？\n${view+1}手目以降（${game.moves.length-view}手）は消えます。`);}
$('#board').addEventListener('click',e=>{const cell=e.target.closest('.cell');if(!cell)return;const r=+cell.dataset.r,c=+cell.dataset.c,p=pos();
 if(sel){const ms=legalNow().filter(m=>m.tr===r&&m.tc===c&&(sel.drop?m.drop&&m.k===sel.k:!m.drop&&m.fr===sel.r&&m.fc===sel.c));
  if(ms.length){sel=null;choosePromotion(ms);return;}}
 const x=p.b[r][c];sel=x&&x.o===p.turn?{r,c}:null;changed=[];render();});
document.addEventListener('click',e=>{const b=e.target.closest('.hp');if(!b)return;const o=+b.dataset.o,k=b.dataset.k;
 if(o!==pos().turn){toast('相手の持ち駒です');return;}sel=sel&&sel.drop&&sel.k===k?null:{drop:true,k};render();});
function choosePromotion(ms,photo){if(ms.length===1)return commit(ms[0],photo);
 const p=ms.find(m=>m.promote),n=ms.find(m=>!m.promote);
 openSheet('成りますか？',`<div class="row"><button class="pri" id="pY" style="min-height:64px;font-size:20px">成る（${S.PNAME[p.k]}）</button><button id="pN" style="min-height:64px;font-size:20px">成らない</button></div>`);
 $('#pY').onclick=()=>{closeSheet();commit(p,photo)};$('#pN').onclick=()=>{closeSheet();commit(n,photo)};}
async function commit(m,photo){if(!truncateOk()){render();return;}
 const removed=game.moves.length>view;
 if(removed){for(const k of game.photos.filter(k=>k>view))idb.del(game.id+':'+k);game.photos=game.photos.filter(k=>k<=view);for(const k in refImgs)if(+k>view)delete refImgs[k];}
 game.moves=game.moves.slice(0,view);game.moves.push(m);ps=S.positions(game.handicap,game.moves);view=game.moves.length;sel=null;
 photo=photo||pendingPhoto;pendingPhoto=null;
 if(photo){await storePhoto(view,photo);}
 save();changed=[];render();
 const n=notationAt(view-1);const lg=legalNow();
 say(lg.length===0?`${n}！ 詰みです。お疲れさま！`:S.inCheck(pos(),pos().turn)?`${n}、王手！`:m.cap?`${n}、駒を取ったね！`:m.promote?`${n}、成った！`:n,true);}
async function storePhoto(ply,img){refImgs[ply]=img;const cv=document.createElement('canvas');cv.width=cv.height=RS;cv.getContext('2d').putImageData(img,0,0);
 await idb.put(game.id+':'+ply,cv.toDataURL('image/jpeg',.88));if(!game.photos.includes(ply))game.photos.push(ply);save();}
async function getRef(ply){if(refImgs[ply])return refImgs[ply];const u=await idb.get(game.id+':'+ply);if(!u)return null;
 const im=new Image();await new Promise(r=>{im.onload=r;im.src=u});const cv=document.createElement('canvas');cv.width=cv.height=RS;const x=cv.getContext('2d');x.drawImage(im,0,0,RS,RS);return refImgs[ply]=x.getImageData(0,0,RS,RS);}
// ---------- ナビ ----------
const go=v=>{view=Math.max(0,Math.min(game.moves.length,v));sel=null;changed=[];render();};
$('#nFirst').onclick=()=>go(0);$('#nPrev').onclick=()=>go(view-1);$('#nNext').onclick=()=>go(view+1);$('#nLast').onclick=()=>go(1e9);
$('#moves').addEventListener('click',e=>{const im=e.target.closest('img');if(im&&im.src){openSheet(`${im.dataset.ph}手目の写真`,`<img src="${im.src}" style="width:100%;border-radius:10px">`);return;}const r=e.target.closest('.mv');if(r)go(+r.dataset.i);});
$('#bUndo').onclick=()=>{if(!game.moves.length)return;if(view<game.moves.length){go(view-1);return;}
 const n=game.moves.length;game.moves.pop();if(game.photos.includes(n)){idb.del(game.id+':'+n);game.photos=game.photos.filter(k=>k!==n);delete refImgs[n];}
 ps=S.positions(game.handicap,game.moves);view=game.moves.length;save();sel=null;changed=[];render();toast('1手戻しました');};
$('#bFlip').onclick=()=>{st.flip=!st.flip;save();render();};
function applyTheme(){const t=st.theme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=t;$('#bTheme').textContent=t==='dark'?'☀️':'🌙';}
$('#bTheme').onclick=()=>{st.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';save();applyTheme();};
// ---------- シート ----------
function openSheet(t,h){$('#shTitle').textContent=t;$('#shBody').innerHTML=h;$('#sheet').classList.add('on');}
function closeSheet(){$('#sheet').classList.remove('on');stopCam();}
$('#shClose').onclick=closeSheet;$('#sheet').addEventListener('click',e=>{if(e.target.id==='sheet')closeSheet()});
// ---------- 対局一覧 ----------
$('#bGames').onclick=showGames;
function showGames(){const gs=Object.values(st.games).sort((a,b)=>b.created-a.created);
 openSheet('対局',`<b>新しい対局</b><select id="ngH">${S.HANDICAPS.map(h=>`<option>${h}</option>`).join('')}</select>
 <div class="row"><input type="text" id="ngB" placeholder="先手（下手）の名前"><input type="text" id="ngW" placeholder="後手（上手）の名前"></div>
 <button class="pri" id="ngGo" style="width:100%">対局を始める</button><p class="hint">駒落ちは上手（△）から指します。</p>
 <b>保存した対局</b>${gs.map(g=>`<div class="gm"><button data-open="${g.id}">${g.id===st.cur?'▶ ':''}${g.name}<br><small>${g.black||'先手'} vs ${g.white||'後手'}・${g.moves.length}手${g.photos.length?'・📷'+g.photos.length:''}</small></button><button class="ic" data-del="${g.id}">🗑</button></div>`).join('')}
 <div class="row"><button id="tgChara">${st.hideChara?'キャラクターを表示':'キャラクターを隠す'}</button></div>`);
 $('#ngGo').onclick=()=>{closeSheet();newGame($('#ngH').value,$('#ngB').value,$('#ngW').value);say('新しい対局だよ。最初に盤面を撮ると、写真で手を読み取れるよ',true)};
 $('#tgChara').onclick=()=>{st.hideChara=!st.hideChara;save();render();closeSheet();};
 $('#shBody').querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{st.cur=b.dataset.open;save();closeSheet();load();});
 $('#shBody').querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{const g=st.games[b.dataset.del];if(!confirm(`「${g.name}」を削除しますか？`))return;
  g.photos.forEach(k=>idb.del(g.id+':'+k));delete st.games[g.id];if(st.cur===g.id){st.cur=null;}save();if(!st.cur){const r=Object.keys(st.games)[0];if(r){st.cur=r;load();}else newGame();}showGames();});}
// ---------- KIF ----------
$('#bKif').onclick=()=>{const k=S.toKIF(game);
 openSheet('棋譜（KIF形式）',`<textarea id="kifT" readonly>${k}</textarea><div class="row"><button class="pri" id="kCopy">コピー</button><button id="kDl">保存</button></div>
 <b>KIFを読み込む</b><textarea id="kifIn" placeholder="ここにKIFを貼り付け" style="min-height:110px"></textarea>
 <div class="row"><button id="kLoad">貼り付けた棋譜を開く</button><button id="kFile">ファイルから</button></div><input type="file" id="kFileIn" accept=".kif,.kifu,.txt" hidden>`);
 $('#kCopy').onclick=async()=>{try{await navigator.clipboard.writeText(k)}catch(e){$('#kifT').select();document.execCommand('copy')}toast('棋譜をコピーしました')};
 $('#kDl').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([k],{type:'text/plain'}));a.download=`kifu_${game.name.replace(/[\/: ]/g,'_')}.kifu`;a.click();};
 const imp=t=>{try{const g=S.parseKIF(t);closeSheet();newGame(g.handicap,g.black,g.white,g.moves);game.name='読込 '+game.name;save();render();toast(`${g.moves.length}手を読み込みました`)}catch(e){alert('読み込めませんでした: '+e.message)}};
 $('#kLoad').onclick=()=>imp($('#kifIn').value);$('#kFile').onclick=()=>$('#kFileIn').click();
 $('#kFileIn').onchange=async e=>{const f=e.target.files[0];if(!f)return;const buf=await f.arrayBuffer();let t=new TextDecoder('utf-8').decode(buf);if(t.includes('\uFFFD'))t=new TextDecoder('shift_jis').decode(buf);imp(t);};};
// ---------- カメラ ----------
let stream=null,shot=null,corners=null;
function stopCam(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}}
const GUIDE_AR=1.09; // 盤は少し縦長
function guideCorners(w,h){let gw=Math.min(w*.92,h*.92/GUIDE_AR),gh=gw*GUIDE_AR;const x=(w-gw)/2,y=(h-gh)/2;return[[x,y],[x+gw,y],[x+gw,y+gh],[x,y+gh]];}
$('#bCam').onclick=openCam;
async function openCam(){const hasRef=!!(await getRef(view));
 openSheet('盤面を撮影',`<div class="camwrap" id="cw"><video id="vid" playsinline muted autoplay></video><div class="guide" id="guide"></div></div>
 <p class="hint">${hasRef?'駒を動かしたあとの盤面を、前回と同じ位置から撮ってください。変わったマスから手を推定します。':'まず<b>今の局面</b>を撮って基準にします。黄色の枠に盤（9×9のマス）を合わせてください。'}</p>
 <div class="row"><button class="pri" id="cShot" style="min-height:56px">撮影</button><button id="cFile">写真を選ぶ</button></div><input type="file" id="cFileIn" accept="image/*" hidden>`);
 $('#cFile').onclick=()=>$('#cFileIn').click();
 $('#cFileIn').onchange=e=>{const f=e.target.files[0];if(!f)return;const im=new Image();im.onload=()=>{const sc=Math.min(1,1600/Math.max(im.width,im.height)),cv=document.createElement('canvas');cv.width=im.width*sc;cv.height=im.height*sc;cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);stopCam();toAdjust(cv);};im.src=URL.createObjectURL(f);};
 try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false});
  const v=$('#vid');v.srcObject=stream;await v.play();v.onloadedmetadata=placeGuide;placeGuide();
 }catch(e){if($('#cw'))$('#cw').innerHTML=`<p style="color:#fff;padding:20px">カメラを使えませんでした（${e.name||e}）。<br>「写真を選ぶ」から撮影・選択できます。</p>`;if($('#cShot'))$('#cShot').disabled=true;}
 if($('#cShot'))$('#cShot').onclick=()=>{const v=$('#vid');if(!v||!v.videoWidth)return;const cv=document.createElement('canvas');const sc=Math.min(1,1600/Math.max(v.videoWidth,v.videoHeight));cv.width=v.videoWidth*sc;cv.height=v.videoHeight*sc;cv.getContext('2d').drawImage(v,0,0,cv.width,cv.height);stopCam();toAdjust(cv,true);};}
function placeGuide(){const v=$('#vid'),g=$('#guide');if(!v||!g||!v.videoWidth)return;const w=v.clientWidth,h=v.clientHeight,c=guideCorners(w,h);Object.assign(g.style,{left:c[0][0]+'px',top:c[0][1]+'px',width:c[1][0]-c[0][0]+'px',height:c[3][1]-c[0][1]+'px'});}
function toAdjust(cv,fromGuide){shot=cv;const w=cv.width,h=cv.height;
 corners=st.corners?st.corners.map(([x,y])=>[x*w,y*h]):guideCorners(w,h);
 openSheet('盤の四隅を合わせる',`<div class="camwrap"><canvas id="adj"></canvas></div><p class="hint">オレンジの丸を盤の四隅（マスの外枠）までドラッグしてください。「タップで指定」なら左上→右上→右下→左下の順にタップします。</p>
 <div class="row"><button id="aTap">タップで指定</button><button id="aGuide">枠に戻す</button></div><button class="pri" id="aOk" style="width:100%;min-height:56px">この範囲で読み取る</button>`);
 const c=$('#adj');c.width=w;c.height=h;let drag=-1,tapMode=-1;
 const draw=()=>{const x=c.getContext('2d');x.drawImage(shot,0,0);x.strokeStyle='#ffeb3b';x.lineWidth=Math.max(2,w/300);
  const H=V.homography([[0,0],[9,0],[9,9],[0,9]],corners);x.beginPath();for(let i=0;i<=9;i++){let a=V.mapPt(H,i,0),b=V.mapPt(H,i,9);x.moveTo(...a);x.lineTo(...b);a=V.mapPt(H,0,i);b=V.mapPt(H,9,i);x.moveTo(...a);x.lineTo(...b);}x.stroke();
  corners.forEach(([px,py],i)=>{x.fillStyle=i===tapMode?'#4fa3ff':'rgba(255,138,61,.9)';x.beginPath();x.arc(px,py,w/40,0,7);x.fill();});};
 draw();const pt=e=>{const r=c.getBoundingClientRect();return[(e.clientX-r.left)*w/r.width,(e.clientY-r.top)*h/r.height]};
 c.onpointerdown=e=>{const p=pt(e);if(tapMode>=0){corners[tapMode]=p;tapMode=tapMode<3?tapMode+1:-1;draw();return;}
  let best=-1,bd=1e9;corners.forEach((q,i)=>{const d=Math.hypot(q[0]-p[0],q[1]-p[1]);if(d<bd){bd=d;best=i}});if(bd<w/6){drag=best;c.setPointerCapture(e.pointerId);}};
 c.onpointermove=e=>{if(drag<0)return;corners[drag]=pt(e);draw();};c.onpointerup=()=>{drag=-1};
 $('#aTap').onclick=()=>{tapMode=0;draw();toast('左上の角をタップ');};$('#aGuide').onclick=()=>{corners=guideCorners(w,h);draw();};
 $('#aOk').onclick=()=>{st.corners=corners.map(([x,y])=>[x/w,y/h]);save();
  const img=V.rectify(shot.getContext('2d').getImageData(0,0,w,h),corners,RS);analyze(img);};}
async function analyze(img){const ref=await getRef(view);
 if(!ref){await storePhoto(view,img);closeSheet();render();say(`${view}手目の局面を基準として保存したよ。指したらまた撮ってね`,true);return;}
 const diff=V.cellDiff(ref,img),lg=legalNow(),R=V.rankMoves(lg,diff);changed=R.changed.slice(0,6);
 const seen=new Set(),cands=[];for(const s of R.scored){const n=S.notation(pos(),s.m,game.moves[view-1]);if(seen.has(n))continue;seen.add(n);cands.push({...s,n});if(cands.length>=6)break;}
 const cv=document.createElement('canvas');cv.width=cv.height=RS;const x=cv.getContext('2d');x.putImageData(img,0,0);x.strokeStyle='#e53935';x.lineWidth=3;
 R.changed.slice(0,6).forEach(i=>x.strokeRect((i%9)*RS/9+1.5,Math.floor(i/9)*RS/9+1.5,RS/9-3,RS/9-3));
 const none=R.changed.length===0;
 openSheet('読み取り結果',`<div style="display:flex;gap:10px;align-items:flex-start"><img src="${cv.toDataURL()}" style="width:45%;border-radius:8px"><p class="hint" style="flex:1">${none?'変化したマスが見つかりませんでした。':`赤枠が変化したマスです（${R.changed.length}マス）。`}<br>正しい手をタップしてください。</p></div>
 ${none?'':cands.map((c,i)=>`<button class="cand${i===0?' pri':''}" data-i="${i}"><span>${c.n}</span><small>${i===0?'いちばん有力':''}</small></button>`).join('')}
 <div class="row"><button id="rManual">どれでもない（手で入力）</button></div><div class="row"><button id="rRef">この写真を今の局面の基準にする</button><button id="rRetake">撮り直す</button></div>`);
 render();
 $('#shBody').querySelectorAll('.cand').forEach(b=>b.onclick=()=>{const c=cands[+b.dataset.i];closeSheet();commit(c.m,img);});
 $('#rManual').onclick=()=>{pendingPhoto=img;closeSheet();toast('盤をタップして手を入力してください（写真はこの手に付きます）');};
 $('#rRef').onclick=async()=>{await storePhoto(view,img);closeSheet();changed=[];render();toast('基準写真を更新しました');};
 $('#rRetake').onclick=()=>{openCam();};}
// ---------- キャラクター ----------
const SLIME='<svg viewBox="0 0 80 72" width="58" height="52"><defs><radialGradient id="sg" cx="40%" cy="30%" r="75%"><stop offset="0" stop-color="#b9f3e2"/><stop offset=".55" stop-color="#4fe0b6"/><stop offset="1" stop-color="#339176"/></radialGradient></defs><ellipse cx="40" cy="68" rx="26" ry="3.5" fill="#000" opacity=".25"/><path d="M40 6C52 6 58 22 66 36C74 50 70 66 40 66C10 66 6 50 14 36C22 22 28 6 40 6Z" fill="url(#sg)"/><ellipse cx="29" cy="25" rx="6" ry="3.5" fill="#fff" opacity=".75" transform="rotate(-30 29 25)"/><g class="eyes"><ellipse cx="32" cy="42" rx="3" ry="4.2" fill="#123"/><ellipse cx="48" cy="42" rx="3" ry="4.2" fill="#123"/><circle cx="33" cy="40.5" r="1.1" fill="#fff"/><circle cx="49" cy="40.5" r="1.1" fill="#fff"/></g><ellipse cx="26" cy="49" rx="3.6" ry="2" fill="#ff8fa3" opacity=".55"/><ellipse cx="54" cy="49" rx="3.6" ry="2" fill="#ff8fa3" opacity=".55"/><path d="M36 50q4 4 8 0" stroke="#123" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
$('#slime').innerHTML=SLIME;
function say(t,jump){const b=$('#bubble');b.textContent=t;b.classList.add('on');clearTimeout(say.t);say.t=setTimeout(()=>b.classList.remove('on'),3500);
 if(jump){const c=$('#chara');c.classList.remove('jump');void c.offsetWidth;c.classList.add('jump');}}
const TIPS=['📷で盤を撮ると、前の写真と比べて動いたマスから手を当てるよ','スマホは毎回同じ位置から撮ると精度が上がるよ（スタンドがおすすめ）','駒をタップ→行き先をタップでも記録できるよ','持ち駒をタップすると「打」で置けるよ','KIFボタンで棋譜をコピーしたり読み込んだりできるよ','◀▶で好きな手の局面に戻れるよ'];let tipI=0;
$('#slime').onclick=()=>say(TIPS[tipI++%TIPS.length],true);
// ---------- 起動 ----------
applyTheme();if(st.cur&&st.games[st.cur])load();else newGame();
setTimeout(()=>say(game.moves.length?'続きから記録しよう！':'こんにちは！📷で盤を撮るか、駒をタップして棋譜をつけよう'),600);
if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js');
window.addEventListener('resize',placeGuide);
