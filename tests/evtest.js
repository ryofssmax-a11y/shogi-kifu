const puppeteer=require('puppeteer-core');const SS=__dirname+'/../screenshots/';const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const URL=process.env.URL||'http://localhost:8765/index.html';
(async()=>{const br=await puppeteer.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new',protocolTimeout:0});const R={layout:{},errs:[]};
const open=async(w,h)=>{const pg=await br.newPage();await pg.setViewport({width:w,height:h,deviceScaleFactor:2});pg.on('pageerror',e=>R.errs.push(e.message));pg.on('dialog',d=>d.accept(d.type()==='prompt'?'0.3':undefined));
 await pg.goto(URL);await pg.evaluate(()=>localStorage.clear());await sleep(1200);await pg.reload();await sleep(800);await pg.evaluate(async()=>{if(!(await evalCached()))await downloadEval(()=>{});await startEngine();});return pg;};
const play=(pg,list)=>pg.evaluate(async list=>{for(const t of list){const p=pos();const m=Shogi.legal(p).find(x=>Shogi.notation(p,x).replace(/^[▲△]/,'')===t);if(!m)return 'no '+t;await commit(m);await new Promise(r=>setTimeout(r,300));}return game.moves.length;},list);
const check=pg=>pg.evaluate(()=>{const R=s=>{const e=document.querySelector(s);if(!e||getComputedStyle(e).display==='none'||getComputedStyle(e).visibility==='hidden'||e.classList.contains('hidden'))return null;const r=e.getBoundingClientRect();return{s,t:r.top,b:r.bottom,l:r.left,r:r.right};};
 const els=['#bFlip','#bTheme','.ttl','#playtop','#evbarH','#hand1','#board','.ranks','#evbarV','#hand0','#playbar','footer','#chara'].map(R).filter(Boolean),iss=[],playing=document.body.classList.contains('playing');
 for(const e of els){if(e.l<-.5||e.r>innerWidth+.5)iss.push(e.s+' off-x');if(playing&&(e.b>innerHeight+.5))iss.push(e.s+' off-y');}
 for(let i=0;i<els.length;i++)for(let j=i+1;j<els.length;j++){const a=els[i],b=els[j];if(Math.min(a.r,b.r)-Math.max(a.l,b.l)>1&&Math.min(a.b,b.b)-Math.max(a.t,b.t)>1)iss.push(a.s+' x '+b.s);}
 const bar=document.querySelector('#evbarV i')||document.querySelector('#evbarH i');const f=bar?(document.querySelector('#evbarV')?bar.style.height:bar.style.width):null;
 const cov=[...document.querySelectorAll('#playbar button,#playtop button')].filter(b=>{const r=b.getBoundingClientRect(),e=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return!(e&&(e===b||b.contains(e)));}).length;
 const bd=document.querySelector('#board').getBoundingClientRect();
 return{bar:!!bar,fill:f,issues:iss,coveredBtns:cov,scroll:playing?document.documentElement.scrollHeight-innerHeight:'n/a',board:Math.round(bd.width)+'x'+Math.round(bd.height)};});
for(const[w,h]of[[375,667],[390,844]]){const pg=await open(w,h);
 for(const mode of['kento','ai','human'])for(const place of['v-left','v-right','h-above','h-below']){
  await pg.evaluate((mode,place)=>{st.ai={view:'bar',place,label:true,bg:true};save();closeSheet();
   if(mode==='kento'){if(PLAY.on){PLAY.on=false;paintBar();}newGame('平手');if(!KT.open)document.querySelector('#bKento').click();KT.on=true;analyzeHere();}
   else{if(KT.open)document.querySelector('#bKento').click();startPlay(mode==='ai'?{mode:'ai',side:'sente',h:'平手',level:2,think:1000,resign:0,main:5,byo:30}:{mode:'human',h:'平手',bName:'A',wName:'B',main:5,byo:30,clockSwitch:'auto',face:true,hints:true});}},mode,place);
  await sleep(1500);
  if(mode!=='kento'){await play(pg,['７六歩']);await pg.waitForFunction(()=>!PLAY.thinking,{timeout:30000}).catch(()=>{});if(mode==='human')await play(pg,['３四歩']);}
  else await play(pg,['７六歩']);
  await sleep(2500);const c=await check(pg);R.layout[`${w}x${h} ${mode} ${place}`]=c;
  if(place==='v-left'||(w===390&&place==='h-above'))await pg.screenshot({path:SS+`evbar_${mode}_${place}_${w}x${h}.png`});}
 // 反転で向きが入れ替わる
 if(w===390){R.flip=await pg.evaluate(async()=>{st.ai={view:'bar',place:'v-right',label:false,bg:true};save();await new Promise(r=>setTimeout(r,800));const a=document.querySelector('#evbarV i').style.height;document.querySelector('#bFlip').click();await new Promise(r=>setTimeout(r,600));const b=document.querySelector('#evbarV i').style.height;document.querySelector('#bFlip').click();return{a,b};});}
 await pg.close();}
// 非表示モード: AI対局で数値・候補手・形勢コメントが出ない。ヒントは使える
{const pg=await open(390,844);
 await pg.evaluate(()=>{st.ai={view:'hide',place:'v-left',label:false,bg:true};save();startPlay({mode:'ai',side:'sente',h:'平手',level:1,think:1000,resign:0,main:0,byo:0});});await sleep(1000);
 const said=[];await pg.exposeFunction('logSay',t=>said.push(t));await pg.evaluate(()=>{const s0=say;say=function(t,j){logSay(t);return s0(t,j);};});
 for(let i=0;i<6;i++){await pg.waitForFunction(()=>!PLAY.thinking&&pos().turn===0,{timeout:30000});const ok=await pg.evaluate(async()=>{const p=pos();const l=Shogi.legal(p);await commit(l[(l.length*0.37)|0]);return true;});await sleep(300);}
 await pg.waitForFunction(()=>!PLAY.thinking,{timeout:30000});await sleep(2000);
 R.hide=await pg.evaluate(()=>({bars:!!document.querySelector('#evbarV,#evbarH'),kentoVisible:!document.querySelector('#kento').classList.contains('hidden'),moodSaid:false,bgEvals:Object.keys(EB.evals).length,plies:game.moves.length}));
 R.hide.said=said.filter(t=>/ピンチ|苦しい|優勢|押し切/.test(t));
 await pg.evaluate(()=>playOps.hint());await pg.waitForFunction(()=>PLAY.hint,{timeout:20000}).catch(()=>{});R.hide.hint=await pg.evaluate(()=>PLAY.hint?Shogi.notation(pos(),PLAY.hint):null);
 // 検討パネルでも隠れる
 await pg.evaluate(()=>{PLAY.on=false;paintBar();document.querySelector('#bKento').click();KT.on=true;analyzeHere();});await sleep(2500);
 R.hide.kento=await pg.evaluate(()=>['#ktEval','.wr','#ktLines','#ktGraph'].map(s=>{const e=document.querySelector(s);return s+':'+(e?getComputedStyle(e).display:'none');}).join(' ')+' note:'+(document.querySelector('#aivNote')||{}).textContent);
 await pg.screenshot({path:SS+'evbar_hidden_kento.png'});
 await pg.evaluate(()=>openAIView());await sleep(300);await pg.screenshot({path:SS+'evbar_settings.png'});await pg.close();}
console.log(JSON.stringify(R,null,1));await br.close();})();
