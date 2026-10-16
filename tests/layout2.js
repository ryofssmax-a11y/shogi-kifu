const puppeteer=require('puppeteer-core');const SS=__dirname+'/../screenshots/';const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const URL=process.env.URL||'http://localhost:8765/index.html';
(async()=>{const br=await puppeteer.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new',protocolTimeout:0});const out={};
for(const[w,h]of[[390,844],[375,667]]){const pg=await br.newPage();await pg.setViewport({width:w,height:h,deviceScaleFactor:2});
 await pg.goto(URL);await pg.evaluate(()=>localStorage.clear());await sleep(1200);await pg.reload();await sleep(800);
 await pg.evaluate(async()=>{if(!(await evalCached()))await downloadEval(()=>{});await startEngine();await startPlay({side:'sente',h:'平手',level:1,think:1000,resign:0,main:5,byo:30,camera:false,voice:false});});
 // 持ち駒を両方に持たせた局面（角交換）で確認
 await sleep(500);await pg.evaluate(async()=>{for(const t of['７六歩','２二角成']){const p=pos();if(p.turn!==0)break;const m=Shogi.legal(p).find(x=>Shogi.notation(p,x).includes(t));if(m)await commit(m);await new Promise(r=>setTimeout(r,2500));}});
 await sleep(800);
 out[w+'x'+h]=await pg.evaluate(()=>{const R=s=>{const e=document.querySelector(s);if(!e||getComputedStyle(e).display==='none')return null;const r=e.getBoundingClientRect();return{s,t:r.top,b:r.bottom,l:r.left,r:r.right};};
  const els=['#bFlip','#bTheme','.ttl','#hand1','.boardwrap','#hand0','#playbar','footer','#chara'].map(R).filter(Boolean),H=innerHeight,iss=[];
  for(const e of els)if(e.b>H+.5||e.t<-.5)iss.push(e.s+' off-screen');
  for(let i=0;i<els.length;i++)for(let j=i+1;j<els.length;j++){const a=els[i],b=els[j];const ox=Math.min(a.r,b.r)-Math.max(a.l,b.l),oy=Math.min(a.b,b.b)-Math.max(a.t,b.t);
   if(ox>1&&oy>1&&!(a.s==='#chara'&&b.s==='header'))iss.push(`${a.s} overlaps ${b.s} (${Math.round(oy)}px)`);}
  const btn=['pMatta','pHint','pDecl','pResign'].filter(id=>{const r=document.getElementById(id).getBoundingClientRect(),e=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return!(e&&e.closest('#'+id));});
  return{rects:els.map(e=>e.s+":"+Math.round(e.t)+"-"+Math.round(e.b)).join(" "),scroll:document.documentElement.scrollHeight-H,issues:iss,coveredButtons:btn,board:Math.round(document.querySelector('#board').getBoundingClientRect().height),chara:!!R('#chara')};});
 await pg.screenshot({path:SS+`play_fit_${w}x${h}.png`});await pg.close();}
console.log(JSON.stringify(out,null,1));await br.close();})();
