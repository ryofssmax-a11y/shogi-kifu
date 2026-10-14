const puppeteer=require('puppeteer-core'),fs=require('fs');const SS='/workspace/shogi-kifu-app/screenshots/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const br=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required'],headless:'new'});
const pg=await br.newPage();await pg.setViewport({width:390,height:844,deviceScaleFactor:2});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('dialog',d=>d.accept());
await pg.goto('http://localhost:8765/index.html');await pg.evaluate(()=>localStorage.clear());await pg.reload();await pg.addScriptTag({path:'synth.js'});
// 偽カメラ: canvas.captureStream を getUserMedia の代わりに返す
await pg.evaluate(()=>{const C=[[150,220],[760,190],[840,1050],[70,1080]];window.SC=C;
 const out=document.createElement('canvas');out.width=900;out.height=1200;window.OUT=out;const ox=out.getContext('2d');
 const stream=out.captureStream(10);navigator.mediaDevices.getUserMedia=async()=>stream;
 const H=Vision.homography([[0,0],[9,0],[9,9],[0,9]],C),cellPt=(f,r)=>Vision.mapPt(H,9-f+.5,r-.5);
 let cur=null,t=0;window.show=(cv,hand)=>{const dx=(Math.random()-.5)*2,dy=(Math.random()-.5)*2;ox.drawImage(cv,dx,dy);
  ox.fillStyle=`rgba(0,0,0,${.05+.04*Math.sin(t++/40)})`;ox.fillRect(0,0,900,1200); // ゆっくりした明るさ変化
  if(hand){ox.fillStyle='#e0ac8a';ox.strokeStyle='#b07a5a';ox.lineWidth=3;ox.beginPath();ox.ellipse(hand[0],hand[1],80,95,0,0,7);ox.fill();ox.stroke();
   ox.beginPath();ox.moveTo(hand[0]-60,hand[1]+40);ox.lineTo(hand[0]-90,1200);ox.lineTo(hand[0]+90,1200);ox.lineTo(hand[0]+60,hand[1]+40);ox.fill();}};
 const cache={};window.photo=k=>{if(!cache[k]){const ms=k?Shogi.parseKIF(k).moves:[];cache[k]=synthPhoto(Shogi.positions('平手',ms).pop(),{corners:C,noise:10,seed:k.length+1});}return cache[k];};
 const play=frames=>new Promise(res=>{let i=0;const id=setInterval(()=>{if(i>=frames.length){clearInterval(id);res();return;}const f=frames[i++];show(f[0],f[1]);},100);});
 const lerp=(a,b,n)=>[...Array(n)].map((_,i)=>[a[0]+(b[0]-a[0])*(i+1)/n,a[1]+(b[1]-a[1])*(i+1)/n]);
 // ev: {before,after,from:[f,r]|null(drop: from hand area),to:[f,r],rest:frames,stable:frames}
 window.ev=async e=>{const B=photo(e.before),A=photo(e.after),start=[450,1250],src=e.from?cellPt(...e.from):[820,1150],dst=cellPt(...e.to);
  let fr=[...lerp(start,src,6).map(p=>[B,p]),[B,src],[B,src],...lerp(src,dst,4).map(p=>[B,p])];
  fr.push(...Array(e.rest||2).fill([A,dst]));fr.push(...lerp(dst,start,6).map(p=>[A,p]),...Array(e.stable||25).fill([A,null]));await play(fr);};
 window.pass=async k=>{const P=photo(k),a=[450,1250],m=cellPt(5,5);await play([...lerp(a,m,6).map(p=>[P,p]),[P,m],[P,m],...lerp(m,a,6).map(p=>[P,p]),...Array(25).fill([P,null])]);};
 window.idle=n=>{const P=photo('');return play(Array(n).fill([P,null]));};
 st.corners=C.map(([x,y])=>[x/900,y/1200]);save();});
const K=['1 ７六歩(77)','2 ３四歩(33)','3 ２二角成(88)','4 同　銀(31)','5 ４五角打','6 ５二金(41)','7 ３四角(45)','8 ６二銀(71)'];
const kif=n=>K.slice(0,n).join('\n');
await pg.evaluate(()=>{for(const k of ['1 ７六歩(77)'])photo(k);show(photo(''),null)});
await pg.click('#bAuto');await sleep(500);await pg.evaluate(()=>idle(20));
const chk=async label=>{const r=await pg.evaluate(()=>({log:[...AUTO.log],moves:game.moves.map((m,i)=>notationAt(i)),chips:[...document.querySelectorAll('#achips button')].map(b=>b.textContent),badge:document.querySelector('#abadge').textContent}));console.log(label.padEnd(26),'| badge:',r.badge,'| log:',r.log.slice(-2).join(' '),'| chips:',r.chips.join(' / '));return r;};
const clickChip=async txt=>{const ok=await pg.evaluate(t=>{const b=[...document.querySelectorAll('#achips button')].find(b=>b.textContent===t);if(b){b.click();return true}return false},txt);console.log('   tap chip',txt,ok);await sleep(400);};
const E=async(i,o)=>pg.evaluate((a,b,o)=>ev({before:a,after:b,...o}),kif(i),kif(i+1),o);
await E(0,{from:[7,7],to:[7,6]});let r=await chk('1 ▲76歩');await pg.screenshot({path:SS+'auto_01_recorded.png'});
await pg.evaluate(k=>pass(k),kif(1));r=await chk('手が通過（指さない）');
await E(1,{from:[3,3],to:[3,4]});r=await chk('2 △34歩');
await E(2,{from:[8,8],to:[2,2]});r=await chk('3 ▲22角成（成/不成）');await pg.screenshot({path:SS+'auto_02_promote_ask.png'});await clickChip('▲２二角成');
await E(3,{from:[3,1],to:[2,2]});r=await chk('4 △同銀（駒取り）');
await E(4,{from:null,to:[4,5]});r=await chk('5 ▲45角打（打つ）');
await E(5,{from:[4,1],to:[5,2],rest:30});r=await chk('6 △52金左（手を3秒置く）');
// 2手連続（間に静止なし）
await pg.evaluate((a,b,c)=>{const B=photo(a),M=photo(b),A=photo(c);return (async()=>{await ev({before:a,after:b,from:[4,5],to:[3,4],stable:1});await ev({before:b,after:c,from:[7,1],to:[6,2]});})()},kif(6),kif(7),kif(8));
r=await chk('7+8 2手連続');await pg.screenshot({path:SS+'auto_03_two_moves.png'});
if(r.chips[0])await clickChip(r.chips[0]);
// 盤（カメラ）がずれた

const fin=await chk('最終');console.log('棋譜:',fin.moves.join(' '));console.log('log:',fin.log.join(' | '));
await pg.screenshot({path:SS+'auto_04_final.png'});await pg.click('#shClose');await sleep(300);await pg.screenshot({path:SS+'auto_05_board_after.png'});
const want='▲７六歩 △３四歩 ▲２二角成 △同銀 ▲４五角打 △５二金左 ▲３四角 △６二銀';
console.log(fin.moves.join(' ')===want?'RESULT PASS':'RESULT FAIL');
console.log('auto-recorded:',fin.log.filter(x=>x.startsWith('auto:')).length,'tapped:',fin.log.filter(x=>x.startsWith('tap:')).length,'passes:',fin.log.filter(x=>x==='pass').length);
console.log('errors:',errs);await br.close();})();
