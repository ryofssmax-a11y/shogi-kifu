const puppeteer=require('puppeteer-core');const SS=__dirname+'/../screenshots/';const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const URL=process.env.URL||'http://localhost:8765/index.html';
(async()=>{const br=await puppeteer.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new',protocolTimeout:0});const R={};const errs=[];
const KIF='1 ７六歩(77)\n2 ３四歩(33)\n3 ２二角成(88)\n4 同　銀(31)\n5 ４五角打\n6 ５二金(41)\n7 ３四角(45)\n8 ６二銀(71)\n9 ２三角成(34)';
for(const[w,h]of[[375,667],[390,844]]){const pg=await br.newPage();await pg.setViewport({width:w,height:h,deviceScaleFactor:2});pg.on('pageerror',e=>errs.push(e.message));pg.on('dialog',d=>d.accept());
 await pg.goto(URL);await pg.evaluate(()=>localStorage.clear());await sleep(1000);await pg.reload();await sleep(800);
 await pg.evaluate(async()=>{if(!(await evalCached()))await downloadEval(()=>{});await startEngine();});
 const setup=async(layout,size)=>pg.evaluate(async(layout,size,KIF)=>{closeSheet();if(PLAY.on){PLAY.on=false;paintBar();}if(KT.open)document.querySelector('#bKento').click();
  st.bigp={on:size!=='off',size:size==='off'?'std':size,king:true};st.ai={view:layout.includes('bar')?'bar':'all',place:'v-left',label:false,bg:true};save();
  const g=Shogi.parseKIF(KIF);
  if(layout.startsWith('normal')){newGame('平手','','',g.moves);if(layout.includes('bar')){document.querySelector('#bKento').click();}}
  else{await startPlay(layout.startsWith('ai')?{mode:'ai',side:'sente',h:'平手',level:1,think:1000,resign:0,main:0,byo:0}:{mode:'human',h:'平手',bName:'A',wName:'B',main:5,byo:30,clockSwitch:'auto',face:true,hints:true});
   PLAY.gen++;stopSearch();game.moves=g.moves;ps=Shogi.positions('平手',g.moves);view=g.moves.length;PLAY.thinking=false;render();paintBar();}
  render();},layout,size,KIF);
 for(const layout of['normal','normal+bar','ai+bar','human+bar'])for(const size of['off','std','l','xl']){await setup(layout,size);await sleep(900);
  const r=await pg.evaluate(()=>{const out=[];document.querySelectorAll('#board .cell span,.hand .hp span').forEach(s=>{const c=s.closest('.cell,.hp').getBoundingClientRect(),t=s.getBoundingClientRect();
   if(t.left<c.left-.5||t.right>c.right+.5||t.top<c.top-.5||t.bottom>c.bottom+.5)out.push(s.textContent);});
   const big=document.querySelector('#board .cell.big span'),norm=[...document.querySelectorAll('#board .cell span')].find(s=>s.textContent==='歩');
   return{overflow:out,bigCells:document.querySelectorAll('#board .cell.big').length,ratio:big&&norm?+(parseFloat(getComputedStyle(big).fontSize)/parseFloat(getComputedStyle(norm).fontSize)).toFixed(2):null,weight:big?getComputedStyle(big).fontWeight:null,cell:Math.round(document.querySelector('#board .cell').getBoundingClientRect().width)};});
  R[`${w}x${h} ${layout} ${size}`]=r;
  if(w===375&&layout==='human+bar'&&(size==='off'||size==='l'))await pg.screenshot({path:SS+`bigp_${size==='off'?'before':'after'}_${w}x${h}.png`});
  if(w===390&&layout==='normal'&&(size==='off'||size==='std'))await pg.screenshot({path:SS+`bigp_${size==='off'?'before':'after'}_${w}x${h}.png`});}
 await pg.close();}
console.log(JSON.stringify(R));console.log('errors',errs);await br.close();})();
