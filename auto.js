// ===== 自動記録モード =====
// 連続映像 → 正面化した小さな盤画像で動きを監視 → 静止したらキーフレームを撮り、前回の静止画と比較して手を推定
const SENS={1:{chg:.7,mot:.6},2:{chg:.55,mot:.48},3:{chg:.4,mot:.38},4:{chg:.32,mot:.32},5:{chg:.26,mot:.28}};
const AUTO={on:false,timer:null,state:'init',ref:null,prev:null,stableSince:0,motionSince:0,lastCheck:0,paused:false,hl:[],hlUntil:0,
 sens:+(st.autoSens||3),voice:st.autoVoice!==false,stableMs:+(st.autoStable||1000),wake:null,work:document.createElement('canvas'),work2:document.createElement('canvas'),ac:null,log:[]};
window.AUTO=AUTO;
$('#bAuto').onclick=()=>openAuto();
const strongCells=d=>d.map((v,i)=>i).filter(i=>d[i]>SENS[AUTO.sens].chg).sort((a,b)=>d[b]-d[a]);
const cellsOf=m=>m.drop?[m.tr*9+m.tc]:[m.fr*9+m.fc,m.tr*9+m.tc];
const sameMove=(a,b)=>a.tr===b.tr&&a.tc===b.tc&&a.drop===b.drop&&a.k===b.k&&a.fr===b.fr&&a.fc===b.fc&&!!a.promote===!!b.promote;
function stopAuto(){AUTO.on=false;clearInterval(AUTO.timer);AUTO.timer=null;if(AUTO.wake){AUTO.wake.release().catch(()=>{});AUTO.wake=null;}}
const _stopCam=stopCam;stopCam=function(){stopAuto();_stopCam();};
async function openAuto(){stopCam();if(view!==game.moves.length){view=game.moves.length;sel=null;render();}
 openSheet('🎥 自動記録モード',`<div class="camwrap" id="aw"><video id="avid" playsinline muted autoplay></video><canvas id="aov" class="ov"></canvas><div class="abadge init" id="abadge">準備中</div></div>
 <div id="abar" class="abar hidden"></div><div id="achips"></div>
 <p class="hint">📱 スマホスタンドで盤の<b>真上</b>から固定してください。駒を動かして手を離すと、約${(AUTO.stableMs/1000).toFixed(1)}秒後に自動で記録します。1手ずつ手を離してください。</p>
 <label class="srow">感度<input type="range" id="aSens" min="1" max="5" value="${AUTO.sens}"><span id="aSensV">${AUTO.sens}</span></label>
 <label class="srow">静止してから記録まで<select id="aWait">${[800,1000,1200,1500].map(v=>`<option value="${v}"${v===AUTO.stableMs?' selected':''}>${v/1000}秒</option>`).join('')}</select></label>
 <label class="srow"><input type="checkbox" id="aVoice" ${AUTO.voice?'checked':''} style="width:24px;height:24px"> 指し手を読み上げる</label>
 <div class="row"><button id="aCal">四隅を合わせ直す</button><button id="aReset">今の盤を基準にする</button><button id="aStop">終了</button></div>`);
 $('#aSens').oninput=e=>{AUTO.sens=+e.target.value;$('#aSensV').textContent=AUTO.sens;st.autoSens=AUTO.sens;save();};
 $('#aWait').onchange=e=>{AUTO.stableMs=+e.target.value;st.autoStable=AUTO.stableMs;save();};
 $('#aVoice').onchange=e=>{AUTO.voice=e.target.checked;st.autoVoice=AUTO.voice;save();};
 $('#aStop').onclick=closeSheet;$('#aReset').onclick=()=>{AUTO.ref=null;AUTO.paused=false;$('#achips').innerHTML='';toast('次に静止した盤面を基準にします');};
 $('#aCal').onclick=()=>{const v=$('#avid');if(!v||!v.videoWidth)return;const cv=document.createElement('canvas');cv.width=v.videoWidth;cv.height=v.videoHeight;cv.getContext('2d').drawImage(v,0,0);stopCam();toAdjust(cv,false,()=>openAuto());};
 try{AUTO.ac=AUTO.ac||new (window.AudioContext||window.webkitAudioContext)();}catch(e){}
 try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});}
 catch(e){badge('カメラを使えません','ask');$('#aw').insertAdjacentHTML('beforeend',`<p style="color:#fff;padding:40px 16px">カメラを使えませんでした（${e.name||e}）。HTTPSで開き、カメラを許可してください。</p>`);return;}
 const v=$('#avid');v.srcObject=stream;try{await v.play();}catch(e){}
 if(!st.corners){await new Promise(r=>setTimeout(r,600));toast('最初に盤の四隅を合わせてください');$('#aCal').onclick();return;}
 try{AUTO.wake=await navigator.wakeLock.request('screen');}catch(e){}
 Object.assign(AUTO,{on:true,state:'init',ref:null,prev:null,paused:false,stableSince:performance.now(),motionSince:0});
 AUTO.timer=setInterval(tick,140);}
document.addEventListener('visibilitychange',async()=>{if(AUTO.on&&document.visibilityState==='visible'&&!AUTO.wake){try{AUTO.wake=await navigator.wakeLock.request('screen');}catch(e){}}});
function badge(t,c){const b=$('#abadge');if(b){b.textContent=t;b.className='abadge '+(c||'');}}
function frame(max=640,cv=AUTO.work){const v=$('#avid');if(!v||!v.videoWidth)return null;const sc=Math.min(1,max/Math.max(v.videoWidth,v.videoHeight)),w=Math.round(v.videoWidth*sc),h=Math.round(v.videoHeight*sc);
 if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}const x=cv.getContext('2d',{willReadFrequently:true});x.drawImage(v,0,0,w,h);
 return{img:x.getImageData(0,0,w,h),C:st.corners.map(([a,b])=>[a*w,b*h])};}
function tick(){if(!AUTO.on)return;const s=frame(220,AUTO.work2);if(!s)return;const now=performance.now();
 const small=V.rectify(s.img,s.C,135),mot=AUTO.prev?V.cellDiff(AUTO.prev,small,1).sort((a,b)=>b-a)[4]:0;AUTO.prev=small;AUTO.mot=mot;drawOverlay();
 if(AUTO.paused)return;
 if(mot>SENS[AUTO.sens].mot){if(AUTO.state!=='motion'){AUTO.state='motion';AUTO.motionSince=now;}AUTO.stableSince=now;AUTO.blockedSince=0;badge('動き検出','motion');return;}
 if(now-AUTO.stableSince<AUTO.stableMs){if(AUTO.state==='motion')badge('静止待ち…','wait');return;}
 const f=frame(400),key=V.rectify(f.img,f.C,270);
 if(!AUTO.ref){AUTO.ref=key;AUTO.state='stable';if(!game.photos.includes(view))storePhoto(view,key);badge('待機中','');AUTO.log.push('ref');return;}
 if(AUTO.state==='motion'||AUTO.state==='blocked'||now-AUTO.lastCheck>1500){AUTO.lastCheck=now;decide(key,now);}}
function decide(key,now){const waitHand=()=>{if(!AUTO.blockedSince)AUTO.blockedSince=now;if(now-AUTO.blockedSince<5000){AUTO.state='blocked';badge('手をどけてください','wait');return true;}return false;};const d=V.cellDiff(AUTO.ref,key),strong=strongCells(d),wasMotion=AUTO.state!=='stable';
 if(!strong.length){AUTO.ref=key;AUTO.state='stable';badge('待機中','');if(wasMotion)AUTO.log.push('pass');return;} // 手が通っただけ／明るさの変化 → 基準を更新
 if(strong.length>8){ // 手が盤上に残っている or 盤・カメラが動いた
  if(waitHand())return;
  AUTO.paused=true;badge('盤がずれた？','ask');AUTO.log.push('moved');
  chips(`${strong.length}マスが変化しました。盤やカメラが動いた可能性があります。`,[],key,true);return;}
 const lg=legalNow(),R=V.rankMoves(lg,d),groups=[];
 for(const s of R.scored.slice(0,60)){const k=cellsOf(s.m).join(',');let g=groups.find(g=>g.k===k);if(!g){g={k,cells:cellsOf(s.m),score:s.score,ms:[]};groups.push(g);}if(!g.ms.some(m=>sameMove(m,s.m)))g.ms.push(s.m);}
 const top=groups[0];if(!top){AUTO.ref=key;return;}
 const unexplained=strong.filter(i=>!top.cells.includes(i)),allStrong=top.cells.every(i=>strong.includes(i)),margin=top.score-(groups[1]?groups[1].score:-1);
 AUTO.hl=strong;AUTO.hlUntil=now+3000;
 const pairs=unexplained.length&&strong.length>=3?twoMoves(lg,R,strong,d):[];
 if((unexplained.length>=3||unexplained.length&&!pairs.length)&&waitHand())return; // 手が盤上に残っている可能性
 {
  if(pairs.length){AUTO.paused=true;badge('確認してください','ask');AUTO.log.push('ask2');chips('2手進んだようです。正しい組み合わせを選んでください。',pairs.map(p=>({label:p.n1+' → '+p.n2,ms:p.ms})).concat(groups.slice(0,2).flatMap(g=>g.ms).map(m=>({label:S.notation(pos(),m,game.moves[view-1]),ms:[m]}))),key);return;}}
 if(top.ms.length===1&&allStrong&&!unexplained.length&&margin>0.3){record([top.ms[0]],key,true,groups);return;}
 AUTO.paused=true;badge('確認してください','ask');AUTO.log.push('ask');
 const opts=groups.slice(0,4).flatMap(g=>g.ms).slice(0,6).map(m=>({label:S.notation(pos(),m,game.moves[view-1]),ms:[m]}));
 chips(top.ms.length>1&&top.ms.some(m=>m.promote)?'成りますか？':'候補が複数あります。正しい手を選んでください。',opts,key);}
function twoMoves(lg,R,strong,d){const p0=pos(),prev=game.moves[view-1],out=[],dd=i=>Math.max(0,d[i]-SENS[AUTO.sens].chg);
 for(const s of R.scored.slice(0,12)){const m1=s.m,p1=S.apply(p0,m1);
  for(const m2 of S.legal(p1)){const cs=[...new Set([...cellsOf(m1),...cellsOf(m2)])];const miss=strong.filter(i=>!cs.includes(i)).length,extra=cs.filter(i=>!strong.includes(i)).length;
   if(miss===0&&extra<=1){out.push({ms:[m1,m2],sc:cs.reduce((a,i)=>a+dd(i),0)-extra,n1:S.notation(p0,m1,prev),n2:S.notation(p1,m2,m1)});}}}
 const seen=new Set();return out.sort((a,b)=>b.sc-a.sc).filter(p=>{const k=p.n1+p.n2;if(seen.has(k))return false;seen.add(k);return true;}).slice(0,4);}
function chips(q,opts,key,moved){const el=$('#achips');if(!el)return;const ab=$('#abar');if(ab)ab.classList.add('hidden');
 el.innerHTML=`<div class="q">${q}</div>`+opts.map((o,i)=>`<button class="${i===0?'pri':''}" data-i="${i}">${o.label}</button>`).join('')+
  (moved?`<button id="cRecal">四隅を合わせ直す</button><button id="cBase">今の盤を基準にする</button>`:`<button id="cNone">どれでもない</button>`);
 el.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{el.innerHTML='';record(opts[+b.dataset.i].ms,key,false);});
 const resume=()=>{el.innerHTML='';AUTO.ref=key;AUTO.paused=false;AUTO.state='stable';badge('待機中','');};
 if(moved){$('#cRecal').onclick=()=>$('#aCal').onclick();$('#cBase').onclick=resume;}
 else $('#cNone').onclick=()=>{resume();toast('盤をタップして手を入力できます（自動記録を終了してください）');};}
async function record(ms,key,auto,groups){for(const m of ms)await commit(m,key);
 AUTO.ref=key;AUTO.paused=false;AUTO.state='stable';AUTO.log.push((auto?'auto:':'tap:')+ms.map((m,i)=>notationAt(view-ms.length+i)).join(','));
 const n=notationAt(view-1);badge('記録しました','rec');setTimeout(()=>{if(AUTO.state==='stable'&&!AUTO.paused)badge('待機中','');},1500);
 beep();if(navigator.vibrate)navigator.vibrate(60);if(AUTO.voice)speak(ms.map((m,i)=>notationAt(view-ms.length+i)));
 const bar=$('#abar');if(bar){bar.classList.remove('hidden');bar.innerHTML=`<span>${ms.length>1?notationAt(view-2)+' ':''}${n} を記録</span><button id="aUndo">取り消す</button>`;
  $('#aUndo').onclick=()=>{const alts=(groups||[]).flatMap(g=>g.ms).filter(m=>!ms.some(x=>sameMove(x,m))).slice(0,5);
   for(let i=0;i<ms.length;i++)$('#bUndo').onclick();bar.classList.add('hidden');AUTO.ref=refImgs[view]||AUTO.ref;AUTO.paused=true;badge('確認してください','ask');
   chips('正しい手を選んでください。',alts.map(m=>({label:S.notation(pos(),m,game.moves[view-1]),ms:[m]})),key);};}}
function beep(){try{const a=AUTO.ac;if(!a)return;a.resume&&a.resume();const o=a.createOscillator(),g=a.createGain();o.frequency.value=880;g.gain.value=.15;o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+.12);}catch(e){}}
function speak(ns){try{if(!window.speechSynthesis)return;const t=ns.map(n=>(n[0]==='▲'?'先手 ':'後手 ')+n.slice(1).replace(/[１-９]/g,c=>S.KAN['１２３４５６７８９'.indexOf(c)+1])).join('、');
 const u=new SpeechSynthesisUtterance(t);u.lang='ja-JP';u.rate=1.05;speechSynthesis.cancel();speechSynthesis.speak(u);}catch(e){}}
function drawOverlay(){const c=$('#aov'),v=$('#avid');if(!c||!v||!v.videoWidth)return;const w=c.clientWidth,h=c.clientHeight;if(c.width!==w||c.height!==h){c.width=w;c.height=h;}
 const x=c.getContext('2d');x.clearRect(0,0,w,h);const C=st.corners.map(([a,b])=>[a*w,b*h]),H=V.homography([[0,0],[9,0],[9,9],[0,9]],C);
 const col={motion:'#ff9800',stable:'#4caf50',blocked:'#fbc02d',init:'#9e9e9e'}[AUTO.paused?'x':AUTO.state]||'#e53935';x.strokeStyle=col;x.lineWidth=2;x.beginPath();
 for(let i=0;i<=9;i++){x.moveTo(...V.mapPt(H,i,0));x.lineTo(...V.mapPt(H,i,9));x.moveTo(...V.mapPt(H,0,i));x.lineTo(...V.mapPt(H,9,i));}x.stroke();
 if(performance.now()<AUTO.hlUntil||AUTO.paused){x.fillStyle='rgba(229,57,53,.35)';for(const i of AUTO.hl){const r=Math.floor(i/9),cc=i%9;x.beginPath();[[cc,r],[cc+1,r],[cc+1,r+1],[cc,r+1]].forEach((p,k)=>x[k?'lineTo':'moveTo'](...V.mapPt(H,...p)));x.fill();}}}
