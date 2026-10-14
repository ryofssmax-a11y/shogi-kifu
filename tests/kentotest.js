const puppeteer=require('puppeteer-core'),fs=require('fs');const SS='/workspace/shogi-kifu-app/screenshots/';const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const br=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new'});
const pg=await br.newPage();await pg.setViewport({width:390,height:844,deviceScaleFactor:2});const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error')errs.push('console:'+m.text())});
pg.on('dialog',d=>d.accept(d.type()==='prompt'?'0.5':undefined));
const URL=process.argv[2]||'http://localhost:8765/index.html';
await pg.goto(URL);await pg.evaluate(()=>localStorage.clear());await sleep(1500);await pg.reload();await sleep(800);
console.log('crossOriginIsolated',await pg.evaluate(()=>self.crossOriginIsolated));
// 棋譜を入れる
await pg.evaluate(()=>{const g=Shogi.parseKIF(`1 ７六歩(77)\n2 ３四歩(33)\n3 ２二角成(88)\n4 同　銀(31)\n5 ４五角打\n6 ５二金(41)\n7 ３四角(45)\n8 ６二銀(71)\n9 ２三角成(34)`);newGame('平手','','',g.moves);go(0);});
await pg.click('#bKento');await sleep(500);await pg.screenshot({path:SS+'kento_01_consent.png'});
const t0=Date.now();await pg.$eval('#ktDl',b=>b.click());await pg.waitForFunction(()=>KT.ready,{timeout:120000});console.log('download+起動 ms',Date.now()-t0,'engine',await pg.evaluate(()=>KT.engineName+' threads '+KT.threads));
// 初期局面: 3秒
await pg.waitForSelector('#ktTime');await sleep(300);await pg.select('#ktTime','3000');await pg.waitForFunction(()=>!KT.searching&&KT.info[1]&&KT.info[1].depth>5,{timeout:30000});
const r0=await pg.evaluate(()=>({eval:document.querySelector('#ktEval').textContent,lines:[...document.querySelectorAll('.pvm')].map(x=>x.textContent),i:KT.info[1]}));
console.log('初期局面:',r0.eval,'| 深さ',r0.i.depth,'nps',r0.i.nps);r0.lines.forEach(l=>console.log('  ',l));await pg.screenshot({path:SS+'kento_02_start.png'});
// PV が正しい日本語表記に変換できるか（エンジンの USI 手を全部合法手として再生できること）
const pvok=await pg.evaluate(()=>Object.values(KT.info).every(inf=>pvToJa(pos(),inf.pv,null,99).length===inf.pv.length));console.log('PV全手が合法手として変換できた:',pvok);
// 既知の局面: 9手目 ▲２三角成 の後（先手が角得で有利のはず）と、1手詰
async function at(ply,label){await pg.evaluate(p=>go(p),ply);await sleep(400);await pg.waitForFunction(()=>!KT.searching&&KT.info[1]&&KT.info[1].depth>3,{timeout:30000});
 const r=await pg.evaluate(()=>({eval:document.querySelector('#ktEval').textContent,best:(document.querySelector('.pvm')||{}).textContent}));console.log(label,'|',r.eval,'| 最善:',r.best);return r;}
await at(9,'9手目(▲２三角成の後, 後手番)');await pg.screenshot({path:SS+'kento_03_ply9.png'});
// 1手詰の局面: 先手 金打で詰み
await pg.evaluate(()=>{const e={b:Array.from({length:9},()=>Array(9).fill(null)),h:[{R:0,B:0,G:1,S:0,N:0,L:0,P:0},{R:0,B:0,G:0,S:0,N:0,L:0,P:0}],turn:0};
 e.b[0][4]={k:'K',o:1,p:false};e.b[2][4]={k:'P',o:0,p:false};e.b[8][4]={k:'K',o:0,p:false};e.b[0][3]={k:'L',o:1,p:false};e.b[0][5]={k:'L',o:1,p:false};newGame('平手','','',[],e);});
await sleep(300);const m=await at(0,'1手詰の局面');console.log('詰み検出:',/詰み/.test(m.eval),/５二金打/.test(m.best));await pg.screenshot({path:SS+'kento_04_mate.png'});
// 全体解析
await pg.evaluate(()=>{const g=Shogi.parseKIF(`1 ７六歩(77)\n2 ３四歩(33)\n3 ２二角成(88)\n4 同　銀(31)\n5 ４五角打\n6 ５二金(41)\n7 ３四角(45)\n8 ６二銀(71)\n9 ２三角成(34)\n10 同　銀(22)`);newGame('平手','','',g.moves);});
await sleep(300);const ta=Date.now();await pg.$eval('#ktAll',b=>b.click());await pg.waitForFunction(()=>!KT.job&&game.analysis&&game.analysis.evals.length===11,{timeout:120000});
const an=await pg.evaluate(()=>({ev:game.analysis.evals,mk:marks(),moves:[...document.querySelectorAll('#moves .mv .t')].map(x=>x.textContent)}));
console.log('全体解析 ms',Date.now()-ta,'評価値',an.ev.join(','));console.log('マーク',JSON.stringify(an.mk));console.log(an.moves.slice(1).join(' / '));
await pg.evaluate(()=>go(6));await sleep(500);await pg.screenshot({path:SS+'kento_05_graph.png',fullPage:true});
await pg.$eval('#ktAbout',b=>b.click());await sleep(300);await pg.screenshot({path:SS+'kento_06_about.png'});
console.log('errors',errs);await br.close();})();
