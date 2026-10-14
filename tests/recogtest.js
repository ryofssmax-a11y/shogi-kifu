const puppeteer=require('puppeteer-core'),fs=require('fs');const SS='/workspace/shogi-kifu-app/screenshots/';const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const br=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});
const pg=await br.newPage();await pg.setViewport({width:390,height:844,deviceScaleFactor:2});const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('dialog',d=>{console.log('dialog',d.message());d.accept()});
await pg.goto('http://localhost:8765/index.html');await pg.evaluate(()=>localStorage.clear());await pg.reload();await pg.addScriptTag({path:'synth.js'});await sleep(500);
// A: ブラウザで描いた盤（学習に使っていない描画）での認識精度
const A=await pg.evaluate(async()=>{const S=Shogi,C=[[150,220],[760,190],[840,1050],[70,1080]];let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
 const posList=[];for(let g=0;g<8;g++){let p=S.initial();const n=10+g*12;for(let i=0;i<n;i++){const l=S.legal(p);if(!l.length)break;const caps=l.filter(m=>m.cap||m.promote);const pool=caps.length&&rnd()<.6?caps:l;const m=pool[Math.floor(rnd()*pool.length)];p=S.apply(p,m);}posList.push(p);}
 const per={},conf=[];let ok=0,tot=0,t0=performance.now();
 for(const [gi,p] of posList.entries()){const ph=synthPhoto(p,{corners:C,noise:14,seed:gi+3,gain:gi%2?.8:1.1});const img=Vision.rectify(ph.getContext('2d').getImageData(0,0,900,1200),C,360);
  const res=await Recog.classify(img);for(const r of res){const want=Recog.clsOf(p.b[Math.floor(r.cell/9)][r.cell%9]),n=Recog.CLS[want];per[n]=per[n]||[0,0];per[n][1]++;tot++;if(r.best===want){ok++;per[n][0]++;}else conf.push(n+'→'+r.cls);}}
 return{acc:ok/tot,tot,ms:(performance.now()-t0)/posList.length,per,conf};});
console.log('ブラウザ描画盤での精度',A.acc.toFixed(4),'cells',A.tot,'1盤あたり',A.ms.toFixed(0),'ms');console.log('誤り',A.conf.join(', '));fs.writeFileSync(SS+'recog_browser_eval.json',JSON.stringify(A,null,1));
// UI: 写真から局面を読み取る
const C=[[150,220],[760,190],[840,1050],[70,1080]];
const d=await pg.evaluate(C=>{const g=Shogi.parseKIF('1 ７六歩(77)\n2 ３四歩(33)\n3 ２二角成(88)\n4 同　銀(31)\n5 ４五角打\n6 ５二金(41)\n7 ３四角(45)\n8 ６二銀(71)\n9 ２三角成(34)');window.TP=Shogi.positions('平手',g.moves).pop();return synthPhoto(TP,{corners:C,noise:14,seed:5}).toDataURL('image/png')},C);
fs.writeFileSync('/tmp/setup.png',Buffer.from(d.split(',')[1],'base64'));
await pg.evaluate(C=>{st.corners=C.map(([x,y])=>[x/900,y/1200]);save();},C);
await pg.click('#bGames');await pg.waitForSelector('#rdSetup');await pg.screenshot({path:SS+'recog_01_menu.png'});await pg.click('#rdSetup');
await pg.waitForSelector('#cFileIn');await (await pg.$('#cFileIn')).uploadFile('/tmp/setup.png');await pg.waitForSelector('#aOk');await pg.click('#aOk');
await pg.waitForSelector('#edGo',{timeout:20000});await sleep(300);await pg.screenshot({path:SS+'recog_02_editor.png'});
// 持ち駒: 先手 歩2 角0... 実際の持ち駒を入力
const hands=await pg.evaluate(()=>TP.h);console.log('正解の持ち駒',JSON.stringify(hands));
for(const o of [0,1])for(const k of Object.keys(hands[o]))for(let i=0;i<hands[o][k];i++){await pg.click(`[data-h="${o}${k}"][data-d="1"]`);}
await pg.click('#edT1');await sleep(200);await pg.screenshot({path:SS+'recog_03_editor_hands.png'});
const gridOk=await pg.evaluate(()=>[...document.querySelectorAll('#edB .cell')].map(c=>c.textContent).join('')===TP.b.flat().map(x=>x?(x.p?Shogi.CH1[x.k]:x.k==='K'&&x.o?'王':Shogi.NAME[x.k]):'').join(''));
console.log('読み取り盤面が正解と一致:',gridOk);
await pg.click('#edGo');await sleep(500);
const same=await pg.evaluate(()=>{const n=p=>JSON.stringify({b:p.b.map(r=>r.map(x=>x&&[x.k,x.o,!!x.p])),h:p.h.map(h=>Shogi.HAND_ORDER.map(k=>h[k])),t:p.turn});return n(game.start)===n(TP)});console.log('開始局面＝正解:',same);await pg.screenshot({path:SS+'recog_04_started.png'});
const kif=await pg.evaluate(()=>Shogi.toKIF(game));console.log(kif.split('\n').slice(0,16).join('\n'));
// B: 再同期（記録が2手抜けた）
await pg.evaluate(C=>{const out=document.createElement('canvas');out.width=900;out.height=1200;const s=out.captureStream(5);navigator.mediaDevices.getUserMedia=async()=>s;
 let p=TP;for(const n of [0,0]){const l=Shogi.legal(p).filter(m=>!m.drop&&!m.cap);p=Shogi.apply(p,l[3]);}window.P2=p;const ph=synthPhoto(p,{corners:C,noise:12,seed:9});setInterval(()=>out.getContext('2d').drawImage(ph,0,0),200);},C);
await pg.click('#bAuto');await sleep(2500);await pg.click('#aSync');await pg.waitForFunction(()=>document.querySelectorAll('#achips button').length>0,{timeout:30000});
const chips=await pg.$$eval('#achips button',e=>e.map(x=>x.textContent));const wantLbl=await pg.evaluate(()=>{let p=TP,pv=null,out=[];for(let i=0;i<2;i++){const l=Shogi.legal(p).filter(m=>!m.drop&&!m.cap);out.push(Shogi.notation(p,l[3],pv));pv=l[3];p=Shogi.apply(p,l[3]);}return out.join(' → ')});
console.log('照合候補:',chips.join(' / '),'| 正解:',wantLbl,'| 1位一致:',chips[0]===wantLbl);await pg.screenshot({path:SS+'recog_05_resync.png'});
await pg.evaluate(()=>document.querySelector('#achips button').click());await sleep(500);console.log('記録後の手数',await pg.evaluate(()=>game.moves.length));
console.log('errors',errs);await br.close();})();
