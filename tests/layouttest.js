const puppeteer=require('puppeteer-core');const SS=__dirname+'/../screenshots/';const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const URL=process.env.URL||'http://localhost:8765/index.html';
(async()=>{const br=await puppeteer.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new',protocolTimeout:0});const out={};
for(const[w,h]of[[390,844],[375,667]]){const pg=await br.newPage();await pg.setViewport({width:w,height:h,deviceScaleFactor:2});pg.on('dialog',d=>d.dismiss());
 await pg.goto(URL);await pg.evaluate(()=>localStorage.clear());await sleep(1200);await pg.reload();await sleep(800);
 await pg.evaluate(async()=>{if(!(await evalCached()))await downloadEval(()=>{});await startEngine();await startPlay({side:'sente',h:'平手',level:1,think:1000,resign:0,main:5,byo:30,camera:false,voice:false});});
 await sleep(800);await pg.evaluate(()=>say('テスト：キャラの吹き出し',true));await sleep(300);
 out[w+'x'+h]=await pg.evaluate(()=>['pMatta','pHint','pDecl','pResign'].map(id=>{const r=document.getElementById(id).getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,el=document.elementFromPoint(x,y);
  return id+':'+(el&&(el.id===id||el.closest('#'+id))?'ok':'covered by '+(el&&(el.id||el.className)))+` (y=${Math.round(r.top)}-${Math.round(r.bottom)} / ${innerHeight})`;}));
 await pg.screenshot({path:SS+`play_layout_${w}x${h}.png`});await pg.close();}
console.log(JSON.stringify(out,null,1));await br.close();})();
