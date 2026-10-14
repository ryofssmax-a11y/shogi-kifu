const puppeteer=require('puppeteer-core'),fs=require('fs');const SS='/workspace/shogi-kifu-app/screenshots/';
(async()=>{const br=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});
const pg=await br.newPage();await pg.setViewport({width:390,height:844,deviceScaleFactor:2});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('dialog',d=>d.accept());
await pg.goto('http://localhost:8765/index.html');await pg.evaluate(()=>{localStorage.clear()});await pg.reload();await pg.addScriptTag({path:'synth.js'});
await new Promise(r=>setTimeout(r,800));await pg.screenshot({path:SS+'01_start.png'});
const tap=async(f,r)=>{await pg.click(`.cell[data-r="${r-1}"][data-c="${9-f}"]`);await new Promise(r=>setTimeout(r,60));};
// 手入力: ▲76歩 △34歩 ▲22角成 △同銀 ▲45角打
await tap(7,7);await pg.screenshot({path:SS+'02_select.png'});await tap(7,6);
await tap(3,3);await tap(3,4);await tap(8,8);await tap(2,2);
await pg.waitForSelector('#pY');await pg.screenshot({path:SS+'03_promote_prompt.png'});await pg.click('#pY');
await tap(3,1);await tap(2,2);
await pg.click('#hand0 .hp[data-k="B"]');await pg.screenshot({path:SS+'04_drop_select.png'});await tap(4,5);
await new Promise(r=>setTimeout(r,300));
const notes=await pg.$$eval('#moves .mv .t',e=>e.map(x=>x.textContent));console.log('UI棋譜:',notes.slice(1).join(' '));
await pg.screenshot({path:SS+'05_after_moves.png'});
await pg.click('#bKif');await new Promise(r=>setTimeout(r,300));const kif=await pg.$eval('#kifT',e=>e.value);console.log(kif);await pg.screenshot({path:SS+'06_kif.png'});
await pg.click('#shClose');
// ---- 差分検出（合成画像）----
const res=await pg.evaluate(async()=>{const S=Shogi,V=Vision;
 const seq=S.parseKIF(`1 ７六歩(77)\n2 ３四歩(33)\n3 ２二角成(88)\n4 同　銀(31)\n5 ４五角打\n6 ５二金(41)\n7 ３四角(45)\n8 ６二銀(71)\n9 ２三角成(34)\n10 同　銀(22)\n11 ２六歩(27)\n12 ５五角打\n13 ９六歩(97)\n14 ９九角成(55)`).moves;
 const C1=[[150,220],[760,190],[840,1050],[70,1080]],C2=[[156,214],[764,196],[836,1044],[76,1086]];
 let p=S.initial(),out=[];const rect=cv=>V.rectify(cv.getContext('2d').getImageData(0,0,cv.width,cv.height),C1,270);
 let prev=rect(synthPhoto(p,{corners:C1,noise:18,seed:1}));
 for(let i=0;i<seq.length;i++){const lg=S.legal(p),m=seq[i];const q=S.apply(p,m);
  const img=rect(synthPhoto(q,{corners:i%2?C2:C1,noise:18,seed:i+7,gain:i%3===0?.85:1.1,jit:i%2}));
  const R=V.rankMoves(lg,V.cellDiff(prev,img));const want=S.notation(p,m,seq[i-1]);
  const names=[...new Set(R.scored.map(s=>S.notation(p,s.m,seq[i-1])))];const rank=names.indexOf(want)+1;
  out.push({n:i+1,want,top:names.slice(0,3).join(' / '),rank,changed:R.changed.length,legal:lg.length});prev=img;p=q;}
 return out;});
console.table(res);fs.writeFileSync(SS+'diff_results.json',JSON.stringify(res,null,1));
// ---- UIでの写真フロー（ファイル選択→四隅→候補）----
const C=[[150,220],[760,190],[840,1050],[70,1080]];
const mk=async(kifText,file)=>{const d=await pg.evaluate((k,C)=>{let p=Shogi.positions('平手',k?Shogi.parseKIF(k).moves:[]).pop();return synthPhoto(p,{corners:C,noise:15,seed:3}).toDataURL('image/png')},kifText,C);fs.writeFileSync(file,Buffer.from(d.split(',')[1],'base64'));};
await mk('','/tmp/p0.png');await mk('1 ７六歩(77)','/tmp/p1.png');await mk('1 ７六歩(77)\n2 ３四歩(33)','/tmp/p2.png');
fs.copyFileSync('/tmp/p1.png',SS+'synthetic_photo_example.png');
await pg.evaluate(()=>{st.corners=[[150/900,220/1200],[760/900,190/1200],[840/900,1050/1200],[70/900,1080/1200]];newGame();});
const up=async f=>{await pg.click('#bCam');await pg.waitForSelector('#cFileIn');const inp=await pg.$('#cFileIn');await inp.uploadFile(f);await pg.waitForSelector('#aOk');await new Promise(r=>setTimeout(r,300));};
await up('/tmp/p0.png');await pg.screenshot({path:SS+'07_corners.png'});await pg.click('#aOk');await new Promise(r=>setTimeout(r,600));
await up('/tmp/p1.png');await pg.click('#aOk');await pg.waitForSelector('.cand');await new Promise(r=>setTimeout(r,300));await pg.screenshot({path:SS+'08_candidates.png'});
console.log('候補(1手目):',await pg.$$eval('.cand span',e=>e.map(x=>x.textContent).join(' / ')));await pg.click('.cand[data-i="0"]');await new Promise(r=>setTimeout(r,500));
await up('/tmp/p2.png');await pg.click('#aOk');await pg.waitForSelector('.cand');console.log('候補(2手目):',await pg.$$eval('.cand span',e=>e.map(x=>x.textContent).join(' / ')));
await pg.click('.cand[data-i="0"]');await new Promise(r=>setTimeout(r,800));await pg.screenshot({path:SS+'09_photo_moves.png'});
await pg.click('#bTheme');await pg.click('#nPrev');await new Promise(r=>setTimeout(r,300));await pg.screenshot({path:SS+'10_dark_navigate.png'});
console.log('errors:',errs);await br.close();})();
