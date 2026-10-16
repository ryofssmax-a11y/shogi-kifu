const puppeteer=require('puppeteer-core'),fs=require('fs');const SS=__dirname+'/../screenshots/';const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const URL=process.env.URL||'http://localhost:8765/index.html',PART=process.env.PART||'all';
(async()=>{const br=await puppeteer.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required'],headless:'new',protocolTimeout:0});
const pg=await br.newPage();await pg.setViewport({width:390,height:844,deviceScaleFactor:2});const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error')errs.push('console:'+m.text())});
pg.on('dialog',d=>d.accept(d.type()==='prompt'?'0.3':undefined));
await pg.goto(URL);await pg.evaluate(()=>localStorage.clear());await sleep(1500);await pg.reload();await sleep(1000);
const R={coi:await pg.evaluate(()=>self.crossOriginIsolated)};
await pg.evaluate(async()=>{if(!(await evalCached()))await downloadEval(()=>{});await startEngine();});
const userMove=async lv=>pg.evaluate(async lv=>{const ply=game.moves.length,p=ps[ply];const info=await thinkLv(lv,ply);const ch=pickMove(info,p,lv);await commit(ch.m);return S.notation(p,ch.m);},lv);
const waitTurn=()=>pg.waitForFunction(()=>PLAY.result||(!PLAY.thinking&&pos().turn!==PLAY.opt.engineSide),{timeout:120000,polling:200});
if(PART==='all'||PART==='game'){
 await pg.$eval('#bPlay',b=>b.click());await sleep(500);await pg.screenshot({path:SS+'play_01_setup.png'});
 await pg.evaluate(()=>{document.querySelector('#poLv').value='1';document.querySelector('#poSide').value='sente';document.querySelector('#poR').value='1500';document.querySelector('#poGo').click();});
 await sleep(800);
 // あなた（Lv.8 相当で指す）vs やねうら王 Lv.1
 let n=0,shot=false,hintOk=null,mattaOk=null;
 while(n<200){const res=await pg.evaluate(()=>PLAY.result);if(res)break;await waitTurn();if(await pg.evaluate(()=>!!PLAY.result))break;
  if(n===3){ // ヒント
   await pg.evaluate(()=>playOps.hint());await pg.waitForFunction(()=>PLAY.hint,{timeout:20000});hintOk=await pg.evaluate(()=>({hint:Shogi.notation(pos(),PLAY.hint),cells:document.querySelectorAll('#board .cell.hint').length}));await pg.screenshot({path:SS+'play_03_hint.png'});
   const before=await pg.evaluate(()=>game.moves.length);await pg.evaluate(()=>playOps.matta());await sleep(300);mattaOk=await pg.evaluate(b=>({before:b,after:game.moves.length,turnIsYou:pos().turn!==PLAY.opt.engineSide}),before);}
  await userMove(8);n++;
  if(!shot){await sleep(150);await pg.screenshot({path:SS+'play_02_thinking.png'});shot=true;}}
 await sleep(500);await pg.screenshot({path:SS+'play_04_result.png'});
 R.game=await pg.evaluate(()=>({result:PLAY.result,moves:game.moves.length,black:game.black,white:game.white,kifTail:Shogi.toKIF(game).split('\n').filter(l=>/先手：|後手：|まで|投了|詰み/.test(l)),lastEval:PLAY.lastEval}));R.hint=hintOk;R.matta=mattaOk;
 await pg.evaluate(()=>closeSheet());}
if(PART==='all'||PART==='misc'){
 // 投了（ユーザー）
 await pg.evaluate(()=>startPlay({side:'gote',h:'平手',level:2,think:1000,resign:2500,main:0,byo:0,camera:false,voice:false}));await waitTurn();
 await pg.evaluate(()=>playOps.resign());await sleep(300);R.resign=await pg.evaluate(()=>({result:PLAY.result,moves:game.moves.length,white:game.white,kif:Shogi.toKIF(game).split('\n').slice(-3).join('|')}));await pg.evaluate(()=>closeSheet());
 // 駒落ち: 角落ち・あなたが下手 → 上手（AI）から指す
 await pg.evaluate(()=>startPlay({side:'sente',h:'角落ち',level:3,think:1000,resign:2500,main:0,byo:0,camera:false,voice:false}));await waitTurn();
 R.handicap=await pg.evaluate(()=>({first:notationAt(0),moves:game.moves.length,white:game.white}));
 // 時計: 秒読みを短くして時間切れ
 await pg.evaluate(()=>{PLAY.clock={rem:[0,0],byo:1500,side:null};clockStartT();});await sleep(2500);R.clock=await pg.evaluate(()=>PLAY.result);await pg.screenshot({path:SS+'play_05_timeout.png'});await pg.evaluate(()=>closeSheet());
 // 千日手・詰み・連続王手の判定
 R.rules=await pg.evaluate(()=>{const g=Shogi.parseKIF('1 ５八玉(59)\n2 ５二玉(51)\n3 ５九玉(58)\n4 ５一玉(52)\n5 ５八玉(59)\n6 ５二玉(51)\n7 ５九玉(58)\n8 ５一玉(52)\n9 ５八玉(59)\n10 ５二玉(51)\n11 ５九玉(58)\n12 ５一玉(52)');
  newGame('平手','','',g.moves);const sen=playOps.checkResult();
  const e=()=>[...Array(9)].map(()=>Array(9).fill(null)),b=e();b[0][4]={k:'K',o:1,p:false};b[1][4]={k:'G',o:0,p:false};b[2][4]={k:'P',o:0,p:false};b[8][4]={k:'K',o:0,p:false};
  const H=()=>({P:0,L:0,N:0,S:0,G:0,B:0,R:0});newGame('平手','','',[],{b,h:[H(),H()],turn:1});const mate=playOps.checkResult();
  newGame('平手');return{sennichite:sen,mate};});}
if(PART==='all'||PART==='camera'){
 await pg.addScriptTag({path:__dirname+'/synth.js'});
 await pg.evaluate(()=>{const C=[[150,220],[760,190],[840,1050],[70,1080]];const out=document.createElement('canvas');out.width=900;out.height=1200;const ox=out.getContext('2d');navigator.mediaDevices.getUserMedia=async()=>out.captureStream(10);
  const cache={};window.photoOf=p=>{const k=JSON.stringify(p.b);return cache[k]||(cache[k]=synthPhoto(p,{corners:C,noise:10,seed:3}));};let cur=photoOf(Shogi.initial()),hand=null;
  setInterval(()=>{ox.drawImage(cur,(Math.random()-.5)*2,(Math.random()-.5)*2);if(hand){ox.fillStyle='#e0ac8a';ox.beginPath();ox.ellipse(hand[0],hand[1],80,95,0,0,7);ox.fill();ox.fillRect(hand[0]-60,hand[1],120,1200);}},100);
  window.setCam=(p,h)=>{cur=photoOf(p);hand=h||null;};st.corners=C.map(([x,y])=>[x/900,y/1200]);save();});
 await pg.evaluate(()=>startPlay({side:'sente',h:'平手',level:3,think:1000,resign:0,main:0,byo:0,camera:true,voice:true}));await sleep(4000);
 const P=()=>pg.evaluate(()=>({moves:game.moves.map((m,i)=>notationAt(i)),await:PLAY.awaitTxt&&PLAY.await?PLAY.awaitTxt:null,log:AUTO.log.slice(-4)}));
 const physical=async kif=>{await pg.evaluate(k=>{const p=Shogi.positions('平手',Shogi.parseKIF(k).moves).pop();setCam(window.LASTP||Shogi.initial(),[450,600]);setTimeout(()=>{setCam(p,[450,600]);setTimeout(()=>setCam(p),600);},700);window.LASTP=p;},kif);};
 const kifNow=()=>pg.evaluate(()=>game.moves.map((m,i)=>`${i+1} ${Shogi.kifMove(m,game.moves[i-1])}`).join('\n'));
 R.camera=[];
 for(let t=0;t<2;t++){ // あなたが盤で指す → 検出 → AI の手を盤に並べる → 検出
  const p=await pg.evaluate(()=>{const P=pos();const m=Shogi.legal(P).find(x=>/７六歩|２六歩|６八銀|４八銀/.test(Shogi.notation(P,x)));return `${game.moves.length+1} ${Shogi.kifMove(m,game.moves[game.moves.length-1])}`;});
  const base=await kifNow();await physical((base?base+'\n':'')+p);
  await pg.waitForFunction(()=>PLAY.await,{timeout:60000}).catch(()=>{});R.camera.push({afterUser:await P()});if(t===0)await pg.screenshot({path:SS+'play_06_camera_await.png'});
  await physical(await pg.evaluate(()=>[...game.moves,PLAY.await].map((m,i,a)=>`${i+1} ${Shogi.kifMove(m,a[i-1])}`).join('\n')));
  await pg.waitForFunction(()=>!PLAY.await,{timeout:30000}).catch(()=>{});await sleep(1500);R.camera.push({afterEngineOnBoard:await P()});}
 await pg.screenshot({path:SS+'play_07_camera_after.png'});}
if(PART==='all'||PART==='strength'){if(process.env.LVA)await pg.evaluate((a,b)=>{window.LVA=a;window.LVB=b;window.NG=6;},process.env.LVA,process.env.LVB);
 // 自己対局: Lv.2 vs Lv.7（先後入れ替え）
 R.selfplay=await pg.evaluate(async()=>{PLAY.on=false;const out=[];
  for(let gi=0;gi<(window.NG||4);gi++){const A=+(window.LVA||2),B=+(window.LVB||7),lv=gi%2?[B,A]:[A,B];newGame('平手',`Lv.${lv[0]}`,`Lv.${lv[1]}`);let res=null;
   for(let ply=0;ply<220&&!res;ply++){const p=ps[ply];if(!S.legal(p).length){res={winner:1-p.turn,reason:'詰み',ply};break;}
    const L=lv[p.turn],info=await thinkLv(L,ply),ch=pickMove(info,p,L),me=info[1];
    if(me&&((me.mate!=null&&me.mate<0)||(me.cp!=null&&me.cp<-3000))){res={winner:1-p.turn,reason:'投了相当',ply};break;}
    game.moves.push(ch.m);ps=S.positions(game.handicap,game.moves);view=game.moves.length;}
   out.push({sente:lv[0],gote:lv[1],winnerLv:res?lv[res.winner]:null,...res});}return out;});}
console.log(JSON.stringify(R,null,1));console.log('errors',errs);await br.close();})();
