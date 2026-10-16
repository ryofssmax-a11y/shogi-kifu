const puppeteer=require('puppeteer-core');const SS=__dirname+'/../screenshots/';const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const URL=process.env.URL||'http://localhost:8765/index.html';
(async()=>{const br=await puppeteer.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required'],headless:'new',protocolTimeout:0});const R={};const errs=[];
const open=async(w,h)=>{const pg=await br.newPage();await pg.setViewport({width:w,height:h,deviceScaleFactor:2});pg.on('pageerror',e=>errs.push(e.message));pg.on('dialog',d=>d.accept());
 await pg.goto(URL);await pg.evaluate(()=>localStorage.clear());await sleep(1200);await pg.reload();await sleep(800);await pg.evaluate(async()=>{if(!(await evalCached()))await downloadEval(()=>{});});return pg;};
const play=(pg,list)=>pg.evaluate(async list=>{for(const t of list){const p=pos();const m=Shogi.legal(p).find(x=>Shogi.notation(p,x).replace(/^[▲△]/,'')===t);if(!m)return 'no '+t;await commit(m);}return game.moves.length;},list);
const overlap=pg=>pg.evaluate(()=>{const R=s=>{const e=document.querySelector(s);if(!e||getComputedStyle(e).display==='none')return null;const r=e.getBoundingClientRect();return{s,t:r.top,b:r.bottom,l:r.left,r:r.right};};
 const els=['#bFlip','#bTheme','.ttl','#playtop','#hand1','.boardwrap','#hand0','#playbar','footer','#chara'].map(R).filter(Boolean),H=innerHeight,iss=[];
 for(const e of els)if(e.b>H+.5||e.t<-.5)iss.push(e.s+' off-screen');
 for(let i=0;i<els.length;i++)for(let j=i+1;j<els.length;j++){const a=els[i],b=els[j];if(Math.min(a.r,b.r)-Math.max(a.l,b.l)>1&&Math.min(a.b,b.b)-Math.max(a.t,b.t)>1)iss.push(a.s+' x '+b.s);}
 const cov=[...document.querySelectorAll('#playbar button,#playtop button')].filter(b=>{const r=b.getBoundingClientRect(),e=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return!(e&&(e===b||b.contains(e)));}).map(b=>b.id);
 return{scroll:document.documentElement.scrollHeight-H,issues:iss,covered:cov,board:Math.round(document.querySelector('#board').getBoundingClientRect().height)};});
// 設定画面
{const pg=await open(390,844);await pg.$eval('#bPlay',b=>b.click());await sleep(400);await pg.screenshot({path:SS+'vs_setup_ai.png'});
 await pg.evaluate(()=>document.querySelector('#poMode [data-m=human]').click());await sleep(200);await pg.screenshot({path:SS+'vs_setup_human.png'});
 // AI 対局のヘッダ表示
 await pg.evaluate(()=>{document.querySelector('#poMode [data-m=ai]').click();document.querySelector('.lvgrid [data-lv="5"]').click();document.querySelector('#poGo').click();});
 await pg.waitForFunction(()=>PLAY.on&&KT.ready,{timeout:60000});await sleep(500);R.aiHeader=await pg.evaluate(()=>document.querySelector('#gInfo').textContent+' | '+document.querySelector('#playbar').textContent.slice(0,40));
 await pg.screenshot({path:SS+'vs_ai_header.png'});await pg.close();}
for(const[w,h]of[[375,667],[390,844]]){const pg=await open(w,h);const k=w+'x'+h,r=R[k]={};
 await pg.evaluate(()=>startPlay({mode:'human',h:'平手',bName:'たろう',wName:'はなこ',main:1,byo:10,clockSwitch:'auto',face:true,hints:false,camera:false}));await sleep(500);
 r.start=await pg.evaluate(()=>({side:PLAY.clock.side,top:!!document.querySelector('#playtop.face'),hintBtn:!!document.querySelector('#pHint'),info:document.querySelector('#gInfo').textContent}));
 r.moves=await play(pg,['７六歩','３四歩','２二角成','２二銀']);await sleep(300);r.clockAfter=await pg.evaluate(()=>PLAY.clock.side);
 r.layout=await overlap(pg);await pg.screenshot({path:SS+`vs_human_${k}.png`});
 await pg.evaluate(()=>playOps.matta());r.afterMatta=await pg.evaluate(()=>game.moves.length);
 await pg.evaluate(()=>document.querySelector('#pRes1').click());await sleep(300);
 r.result=await pg.evaluate(()=>({res:PLAY.result,kif:Shogi.toKIF(game).split('\n').filter(l=>/先手：|後手：|投了|まで/.test(l))}));await pg.screenshot({path:SS+`vs_human_end_${k}.png`});await pg.close();}
// 時計ボタン切り替え・時間切れ・千日手・ヒント
{const pg=await open(390,844);const r=R.misc={};
 await pg.evaluate(()=>startPlay({mode:'human',h:'平手',bName:'A',wName:'B',main:0,byo:10,clockSwitch:'tap',face:false,hints:true,camera:false}));await sleep(500);
 await play(pg,['７六歩']);r.tapBefore=await pg.evaluate(()=>PLAY.clock.side);await pg.evaluate(()=>document.querySelector('#pcb0').click());r.tapAfter=await pg.evaluate(()=>PLAY.clock.side);
 r.hintBtn=await pg.evaluate(()=>!!document.querySelector('#pHint'));await pg.evaluate(()=>playOps.hint());await pg.waitForFunction(()=>PLAY.hint,{timeout:20000}).catch(()=>{});r.hint=await pg.evaluate(()=>PLAY.hint&&Shogi.notation(pos(),PLAY.hint));
 await pg.evaluate(()=>{PLAY.clock.byo=1200;clockStartT(1);});await sleep(2000);r.timeout=await pg.evaluate(()=>PLAY.result);await pg.evaluate(()=>closeSheet());
 await pg.evaluate(()=>startPlay({mode:'human',h:'平手',main:0,byo:0,clockSwitch:'auto',face:true,hints:false,camera:false}));
 await play(pg,'５八玉,５二玉,５九玉,５一玉,５八玉,５二玉,５九玉,５一玉,５八玉,５二玉,５九玉,５一玉'.split(','));r.sennichite=await pg.evaluate(()=>PLAY.result);await pg.evaluate(()=>closeSheet());
 await pg.evaluate(()=>startPlay({mode:'human',h:'香落ち',main:0,byo:0,clockSwitch:'auto',face:true,hints:false,camera:false}));r.handicapNames=await pg.evaluate(()=>game.black+'/'+game.white+' turn '+pos().turn);
 await pg.close();}
// カメラで人対人
{const pg=await open(390,844);await pg.addScriptTag({path:__dirname+'/synth.js'});
 await pg.evaluate(()=>{const C=[[150,220],[760,190],[840,1050],[70,1080]];const out=document.createElement('canvas');out.width=900;out.height=1200;const ox=out.getContext('2d');navigator.mediaDevices.getUserMedia=async()=>out.captureStream(10);
  const cache={};window.photoOf=p=>{const k=JSON.stringify(p.b);return cache[k]||(cache[k]=synthPhoto(p,{corners:C,noise:10,seed:3}));};let cur=photoOf(Shogi.initial()),hand=null;
  setInterval(()=>{ox.drawImage(cur,(Math.random()-.5)*2,(Math.random()-.5)*2);if(hand){ox.fillStyle='#e0ac8a';ox.beginPath();ox.ellipse(hand[0],hand[1],80,95,0,0,7);ox.fill();ox.fillRect(hand[0]-60,hand[1],120,1200);}},100);
  window.setCam=(p,h)=>{cur=photoOf(p);hand=h||null;};st.corners=C.map(([x,y])=>[x/900,y/1200]);save();});
 await pg.evaluate(()=>startPlay({mode:'human',h:'平手',bName:'A',wName:'B',main:0,byo:0,clockSwitch:'auto',face:true,hints:false,camera:true}));await sleep(4000);
 const seq=['1 ７六歩(77)','2 ３四歩(33)','3 ２六歩(27)'];
 for(let i=1;i<=seq.length;i++){await pg.evaluate(k=>{const p=Shogi.positions('平手',Shogi.parseKIF(k).moves).pop();setCam(window.LASTP||Shogi.initial(),[450,600]);setTimeout(()=>{setCam(p,[450,600]);setTimeout(()=>setCam(p),600);},700);window.LASTP=p;},seq.slice(0,i).join('\n'));await sleep(7000);}
 R.camera=await pg.evaluate(()=>({moves:game.moves.map((m,i)=>notationAt(i)),log:AUTO.log}));await pg.screenshot({path:SS+'vs_human_camera.png'});await pg.close();}
console.log(JSON.stringify(R,null,1));console.log('errors',errs);await br.close();})();
