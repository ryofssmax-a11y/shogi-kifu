const puppeteer=require('puppeteer-core'),fs=require('fs');const SS='/workspace/shogi-kifu-app/screenshots/';const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const URL=process.env.URL||'http://localhost:8765/index.html';
(async()=>{const br=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required'],headless:'new',protocolTimeout:0});
const pg=await br.newPage();await pg.setViewport({width:390,height:844,deviceScaleFactor:2});const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('dialog',d=>d.accept());
await pg.goto(URL);await pg.evaluate(()=>localStorage.clear());await pg.reload();await sleep(800);await pg.addScriptTag({path:__dirname+'/synth2.js'});
const res={};
// 1) 写真 → 自動検出
res.detect=await pg.evaluate(async()=>{const o={size:.72,rot:8,tilt:.15,margin:.4,clutter:25,seed:3};const C=quad(o);window.GT=C;const ph=synthScene(Shogi.initial(),{...o,corners:C});
 toAdjust(ph,false);for(let i=0;i<100&&!/検出|見つけ/.test(document.querySelector('#aDetTxt').textContent);i++)await new Promise(r=>setTimeout(r,100));
 const cell=Math.hypot(C[1][0]-C[0][0],C[1][1]-C[0][1])/9;return{txt:document.querySelector('#aDetTxt').textContent,maxErrCell:+Math.max(...corners.map((p,i)=>Math.hypot(p[0]-C[i][0],p[1]-C[i][1])/cell)).toFixed(3),ms:Math.round(lastGridDetect.ms)};});
await pg.screenshot({path:SS+'grid_ui_detected.png'});
await pg.evaluate(()=>document.querySelector('#aAdj').click());await sleep(200);await pg.screenshot({path:SS+'grid_ui_adjust.png'});
res.adjustVisible=await pg.evaluate(()=>!document.querySelector('#aAdjRow').classList.contains('hidden'));
// 2) 盤が写っていない写真
res.fail=await pg.evaluate(async()=>{closeSheet&&closeSheet();const c=document.createElement('canvas');c.width=720;c.height=960;const x=c.getContext('2d');x.fillStyle='#556';x.fillRect(0,0,720,960);for(let i=0;i<40;i++){x.fillStyle=`hsl(${i*37},50%,50%)`;x.fillRect((i*97)%650,(i*131)%900,80,60);}
 toAdjust(c,false);for(let i=0;i<100&&!/検出|見つけ/.test(document.querySelector('#aDetTxt').textContent);i++)await new Promise(r=>setTimeout(r,100));return{txt:document.querySelector('#aDetTxt').textContent,conf:lastGridDetect.conf,adjustOpen:!document.querySelector('#aAdjRow').classList.contains('hidden')};});
await pg.screenshot({path:SS+'grid_ui_fail.png'});
await pg.evaluate(()=>closeSheet());
// 3) 自動記録中に盤が動いた → 自動で探し直す
await pg.evaluate(()=>{const out=document.createElement('canvas');out.width=720;out.height=960;const ox=out.getContext('2d');navigator.mediaDevices.getUserMedia=async()=>out.captureStream(10);
 const o1={size:.74,rot:2,tilt:.1,margin:.4,clutter:10,seed:5},o2={...o1,rot:9,dx:45,dy:30,size:.7};window.C1=quad(o1);window.C2=quad(o2);
 const P0=Shogi.initial(),P1=Shogi.apply(P0,Shogi.legal(P0).find(m=>Shogi.notation(P0,m).includes('７六歩')));
 window.IM={a:synthScene(P0,{...o1,corners:C1}),b:synthScene(P0,{...o2,corners:C2}),c:synthScene(P1,{...o2,corners:C2})};let cur=IM.a,hand=null;
 setInterval(()=>{ox.drawImage(cur,(Math.random()-.5)*2,(Math.random()-.5)*2);if(hand){ox.fillStyle='#d9a383';ox.beginPath();ox.ellipse(hand[0],hand[1],70,85,0,0,7);ox.fill();ox.fillRect(hand[0]-60,hand[1],120,960);}},100);
 window.setCur=(k,h)=>{cur=IM[k];hand=h||null;};st.corners=C1.map(([x,y])=>[x/720,y/960]);save();});
await pg.evaluate(()=>document.querySelector('#bAuto').click());await sleep(5000);
// 盤をずらす（手で動かす → 手を離す）
await pg.evaluate(()=>setCur('a',[360,500]));await sleep(800);await pg.evaluate(()=>setCur('b'));await sleep(9000);
res.afterMove=await pg.evaluate(()=>({log:AUTO.log.slice(),cornErrPx:+Math.max(...st.corners.map(([x,y],i)=>Math.hypot(x*720-C2[i][0],y*960-C2[i][1]))).toFixed(1),paused:AUTO.paused,moves:game.moves.length}));
await pg.screenshot({path:SS+'grid_auto_regrid.png'});
// その後、ずれた位置のまま 1 手指す
await pg.evaluate(()=>setCur('b',[300,640]));await sleep(800);await pg.evaluate(()=>setCur('c',[300,640]));await sleep(500);await pg.evaluate(()=>setCur('c'));await sleep(8000);
res.afterPlay=await pg.evaluate(()=>({log:AUTO.log.slice(-4),moves:game.moves.map((m,i)=>Shogi.notation(Shogi.positions(game.start||'平手',game.moves.slice(0,i)).pop(),m))}));
await pg.screenshot({path:SS+'grid_auto_after_move.png'});
console.log(JSON.stringify(res,null,1));console.log('errors',errs);await br.close();})();
