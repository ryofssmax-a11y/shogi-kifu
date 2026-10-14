// ===== 駒認識の画面: 局面の読み取り・照合・学習データ =====
const PCH=c=>{const p=Recog.pieceOf(c);if(!p)return'';return p.p?S.CH1[p.k]:(p.k==='K'&&p.o?'王':S.NAME[p.k]);};
Recog.load().catch(()=>{});
function toRS(img,size=RS){const a=document.createElement('canvas');a.width=a.height=img.width;a.getContext('2d').putImageData(img,0,0);const b=document.createElement('canvas');b.width=b.height=size;const x=b.getContext('2d');x.drawImage(a,0,0,size,size);return x.getImageData(0,0,size,size);}
// ---------- (1) 写真から局面を読み取る ----------
function openSetup(){window.camHook=img=>showEditor(img);openCam();}
async function showEditor(img,title){openSheet(title||'局面を読み取り中…','<p class="hint">駒を認識しています…</p>');
 const res=await Recog.classify(img);const grid=res.map(r=>r.best),conf=res.map(r=>r.conf),hand=[{},{}];let turn=0;
 const counts={P:18,L:4,N:4,S:4,G:4,B:2,R:2,K:2};
 const draw=()=>{const used={};grid.forEach(c=>{const p=Recog.pieceOf(c);if(p)used[p.k]=(used[p.k]||0)+1});for(const o of[0,1])for(const k in hand[o])used[k]=(used[k]||0)+hand[o][k];
  const rest=S.HAND_ORDER.filter(k=>(counts[k]-(used[k]||0))>0).map(k=>S.NAME[k]+'×'+(counts[k]-(used[k]||0))).join(' ');
  const low=conf.filter(c=>c<.7).length;
  openSheet(title||'読み取った局面',`<p class="hint">マスをタップすると直せます。<span style="background:#ffe082;color:#222;padding:0 4px">黄色</span>は自信の低いマス（${low}マス）です。</p>
  <div id="edB" style="display:grid;grid-template-columns:repeat(9,1fr);background:var(--wood);border:2px solid var(--line)">${grid.map((c,i)=>{const p=Recog.pieceOf(c);return`<div class="cell${p&&p.o?' g':''}${p&&p.p?' pr':''}" data-i="${i}" style="aspect-ratio:1/1.09;${conf[i]<.7?'background:#ffe082':''}"><span>${PCH(c)}</span></div>`}).join('')}</div>
  ${[1,0].map(o=>`<div class="srow" style="flex-wrap:wrap"><b style="width:100%">${o?'△後手':'▲先手'}の持ち駒</b>${S.HAND_ORDER.filter(k=>k!=='K').map(k=>`<span style="display:inline-flex;align-items:center;gap:2px"><button class="ic" data-h="${o}${k}" data-d="-1">−</button><b style="min-width:40px;text-align:center">${S.NAME[k]}${hand[o][k]||0}</b><button class="ic" data-h="${o}${k}" data-d="1">＋</button></span>`).join('')}</div>`).join('')}
  <p class="hint">盤上にない駒: ${rest||'なし'}</p>
  <div class="row"><button id="edT0" class="${turn?'':'pri'}">▲先手の番</button><button id="edT1" class="${turn?'pri':''}">△後手の番</button></div>
  <button class="pri" id="edGo" style="width:100%;min-height:56px">この局面から記録を始める</button>`);
  $('#edB').onclick=e=>{const c=e.target.closest('[data-i]');if(c)pick(+c.dataset.i);};
  $('#shBody').querySelectorAll('[data-h]').forEach(b=>b.onclick=()=>{const o=+b.dataset.h[0],k=b.dataset.h.slice(1);hand[o][k]=Math.max(0,(hand[o][k]||0)+ +b.dataset.d);draw();});
  $('#edT0').onclick=()=>{turn=0;draw()};$('#edT1').onclick=()=>{turn=1;draw()};
  $('#edGo').onclick=()=>{const b=Array.from({length:9},(_,r)=>Array.from({length:9},(_,c)=>Recog.pieceOf(grid[r*9+c])));
   const kings=[0,1].map(o=>b.flat().filter(x=>x&&x.k==='K'&&x.o===o).length);if(kings[0]!==1||kings[1]!==1){alert('玉（王）がそれぞれ1枚ずつ必要です');return;}
   const h=[0,1].map(o=>{const x={R:0,B:0,G:0,S:0,N:0,L:0,P:0};for(const k in hand[o])x[k]=hand[o][k];return x;});const start={b,h,turn};
   if(S.inCheck(start,1-turn)){alert('手番でない側の玉に王手がかかっています。手番を確認してください');return;}
   closeSheet();newGame('平手','','',[],start);game.name='読取 '+game.name;storePhoto(0,toRS(img));save();render();say('写真から局面を読み取ったよ。ここから記録しよう',true);};};
 const pick=i=>{openSheet('このマスの駒',`<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px">${Recog.CLS.map((n,c)=>{const p=Recog.pieceOf(c);return`<button data-c="${c}" style="min-height:52px;font-size:20px;font-weight:700;${c===grid[i]?'outline:3px solid var(--sel)':''}${p&&p.p?';color:#c2181f':''}"><span style="display:inline-block;${p&&p.o?'transform:rotate(180deg)':''}">${c?PCH(c):'空'}</span></button>`}).join('')}</div><p class="hint">逆さの駒は後手（△）です。</p>`);
  $('#shBody').querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{grid[i]=+b.dataset.c;conf[i]=1;draw();});};
 draw();}
// ---------- (2) 自動記録の検証と再同期 ----------
// 候補手の「動いた先」「動いた元」のマスを認識して点数化（対数）
async function recogScore(key,moves){const cells=[...new Set(moves.flatMap(m=>m.drop?[m.tr*9+m.tc]:[m.fr*9+m.fc,m.tr*9+m.tc]))];
 const res=await Recog.classify(key,cells),by={};res.forEach(r=>by[r.cell]=r);
 return moves.map(m=>{const pc={k:m.k,o:m.o,p:m.wasP||!!m.promote};let s=Math.log(by[m.tr*9+m.tc].p[Recog.clsOf(pc)]+1e-4);if(!m.drop)s+=Math.log(by[m.fr*9+m.fc].p[0]+1e-4);return{m,s,pTo:by[m.tr*9+m.tc].p[Recog.clsOf(pc)]};});}
// 現在の盤面写真と棋譜を照合し、抜けた手（最大2手）を探す
async function resync(key){const res=await Recog.classify(key),p0=pos(),prev=game.moves[view-1];
 const mism=p=>res.filter(r=>r.best!==Recog.clsOf(p.b[Math.floor(r.cell/9)][r.cell%9])).length;
 const cands=[{ms:[],f:Recog.fit(res,p0),p:p0}];const l1=S.legal(p0).map(m=>{const p=S.apply(p0,m);return{ms:[m],f:Recog.fit(res,p),p};}).sort((a,b)=>b.f-a.f);
 cands.push(...l1.slice(0,5));for(const c of l1.slice(0,12))for(const m2 of S.legal(c.p)){const p=S.apply(c.p,m2);cands.push({ms:[c.ms[0],m2],f:Recog.fit(res,p),p});}
 cands.sort((a,b)=>b.f-a.f);const best=cands[0];
 return{best,cands:cands.slice(0,4),mism0:mism(p0),mismBest:mism(best.p),res,label:c=>{let p=p0,pv=prev;return c.ms.map(m=>{const n=S.notation(p,m,pv);p=S.apply(p,m);pv=m;return n}).join(' → ')}};}
// ---------- (3) 学習データの書き出し（zip） ----------
function crc32(u){let c,t=crc32.t;if(!t){t=crc32.t=new Uint32Array(256);for(let n=0;n<256;n++){c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}}c=~0;for(let i=0;i<u.length;i++)c=t[(c^u[i])&255]^(c>>>8);return(~c)>>>0;}
function zip(files){const enc=new TextEncoder(),parts=[],cen=[];let off=0;
 for(const f of files){const name=enc.encode(f.name),d=f.data,crc=crc32(d),h=new DataView(new ArrayBuffer(30));
  h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x800,true);h.setUint32(14,crc,true);h.setUint32(18,d.length,true);h.setUint32(22,d.length,true);h.setUint16(26,name.length,true);
  parts.push(new Uint8Array(h.buffer),name,d);const c=new DataView(new ArrayBuffer(46));c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint32(16,crc,true);c.setUint32(20,d.length,true);c.setUint32(24,d.length,true);c.setUint16(28,name.length,true);c.setUint32(42,off,true);
  cen.push(new Uint8Array(c.buffer),name);off+=30+name.length+d.length;}
 const cs=cen.reduce((a,b)=>a+b.length,0),e=new DataView(new ArrayBuffer(22));e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,cs,true);e.setUint32(16,off,true);
 return new Blob([...parts,...cen,new Uint8Array(e.buffer)],{type:'application/zip'});}
async function exportDataset(onProgress){const files=[],enc=new TextEncoder();let csv='file,label,game,ply,square\n',n=0;const cv=document.createElement('canvas');cv.width=cv.height=64;const x=cv.getContext('2d');const big=document.createElement('canvas');
 for(const g of Object.values(st.games)){if(!g.photos.length)continue;const P=S.positions(g.handicap,g.moves,g.start);
  for(const ply of g.photos){const u=(await idb.get('hq:'+g.id+':'+ply))||(await idb.get(g.id+':'+ply));if(!u||!P[ply])continue;
   const im=new Image();await new Promise(r=>{im.onload=r;im.src=u});big.width=big.height=im.width;big.getContext('2d').drawImage(im,0,0);const cs=im.width/9,m=cs*.15;
   for(let i=0;i<81;i++){const r=Math.floor(i/9),c=i%9;x.fillStyle='#000';x.fillRect(0,0,64,64);x.drawImage(big,c*cs-m,r*cs-m,cs+2*m,cs+2*m,0,0,64,64);
    const lab=Recog.CLS[Recog.clsOf(P[ply].b[r][c])],name=`cells/${lab}/${g.id}_${ply}_${9-c}${r+1}.png`;
    const b=await new Promise(res=>cv.toBlob(res,'image/png'));files.push({name,data:new Uint8Array(await b.arrayBuffer())});csv+=`${name},${lab},${g.id},${ply},${9-c}${r+1}\n`;n++;}
   onProgress&&onProgress(n);}}
 files.push({name:'labels.csv',data:enc.encode(csv)});
 files.push({name:'README.txt',data:enc.encode('将棋カメラ棋譜 学習データ\n各マスを周囲15%込みで64x64に切り出したPNG。フォルダ名がラベル（empty / b=先手 w=後手、+は成駒）。\nラベルは確定した棋譜の局面から自動で付けています。写真と棋譜がずれている手があるとラベルも誤ります。\n')});
 return{blob:zip(files),n};}
// ---------- メニューへの追加 ----------
const _showGames=showGames;showGames=function(){_showGames();
 $('#shBody').insertAdjacentHTML('afterbegin',`<button class="pri" id="rdSetup" style="width:100%;min-height:52px;margin-bottom:10px">📷 写真から局面を読み取る</button>`);
 $('#shBody').insertAdjacentHTML('beforeend',`<b>学習データ</b><label class="srow"><input type="checkbox" id="dsOn" ${st.collect?'checked':''} style="width:24px;height:24px"> 学習データを集める（自分の盤の写真を高画質で端末内に保存）</label><button id="dsExp" style="width:100%">学習データをzipで書き出す</button><p class="hint">写真付きで記録した手の盤面を、マスごとにラベル付きで切り出します。データは端末の外には送られません。</p>`);
 $('#rdSetup').onclick=()=>{closeSheet();openSetup();};$('#dsOn').onchange=e=>{st.collect=e.target.checked;save();};
 $('#dsExp').onclick=async()=>{const b=$('#dsExp');b.disabled=true;const r=await exportDataset(n=>b.textContent=`書き出し中… ${n}マス`);b.disabled=false;b.textContent='学習データをzipで書き出す';
  if(!r.n){alert('写真付きの記録がまだありません');return;}const a=document.createElement('a');a.href=URL.createObjectURL(r.blob);a.download='shogi-cells.zip';a.click();toast(`${r.n}マス分を書き出しました`);};};
$('#bGames').onclick=showGames;
const _storePhoto=storePhoto;storePhoto=async function(ply,img){await _storePhoto(ply,img);if(st.collect){const c=document.createElement('canvas');c.width=c.height=img.width;c.getContext('2d').putImageData(img,0,0);await idb.put('hq:'+game.id+':'+ply,c.toDataURL('image/png'));}};
