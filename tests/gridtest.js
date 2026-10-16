const puppeteer=require('puppeteer-core'),fs=require('fs');const SS=__dirname+'/../screenshots/';const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const br=await puppeteer.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox'],headless:'new',protocolTimeout:0});const pg=await br.newPage();await pg.setViewport({width:390,height:844,deviceScaleFactor:2});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));await pg.goto('http://localhost:8765/index.html');await pg.addScriptTag({path:__dirname+'/synth2.js'});if(process.env.EXPECT)await pg.evaluate(()=>window.EXPECT=1);if(process.env.ONLY)await pg.evaluate(o=>window.ONLY=o,process.env.ONLY);await sleep(500);
const R=await pg.evaluate(async()=>{const S=Shogi;let seed=11;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647,U=(a,b)=>a+(b-a)*rnd();
 const posList=[];let p=S.initial();posList.push(p);for(let i=0;i<30;i++){const l=S.legal(p);p=S.apply(p,l[Math.floor(rnd()*l.length)]);if(i%6==5)posList.push(p);}
 const cats={'標準':()=>({}),'傾き(斜めから)':()=>({tilt:U(.12,.28)}),'回転±25°':()=>({rot:U(-25,25)}),'小さく写る':()=>({size:U(.45,.6)}),'大きく写る':()=>({size:U(.85,.92)}),
  '背景が散らかっている':()=>({clutter:40}),'木のテーブルの上':()=>({table:1,clutter:10}),'暗い・ムラ':()=>({gain:U(.45,.6),grad:.5,noise:20}),'手で一部隠れる':()=>({hand:'x'}),'90°/180°回転':()=>({rot:[90,180,270][Math.floor(rnd()*3)]+U(-8,8)}),'全部入り':()=>({tilt:U(.1,.22),rot:U(-20,20),clutter:30,gain:.7,hand:'x'})};
 const rows=[];const base={size:.75,rot:0,tilt:.06,margin:.45,clutter:8,noise:12};
 for(const[cat,fn]of Object.entries(cats).filter(([c])=>!window.ONLY||c.startsWith(window.ONLY)))for(let n=0;n<8;n++){const o={...base,...fn(),seed:Math.floor(rnd()*1e6)+1,dx:U(-30,30),dy:U(-40,40)};o.rot=(o.rot||0)+U(-4,4);o.margin=U(.25,.6);
  const C=quad(o);if(o.hand==='x'){const t=rnd();o.hand=[C[0][0]*(1-t)+C[2][0]*t,C[0][1]*(1-t)+C[2][1]*t];}
  const pos=posList[n%posList.length],ph=synthScene(pos,{...o,corners:C});const img=ph.getContext('2d').getImageData(0,0,ph.width,ph.height);
  const d=GridDetect.detect(img);let err=99,rotIdx=-1;
  if(d.corners){for(let r=0;r<4;r++){const e=Math.max(...[0,1,2,3].map(i=>Math.hypot(d.corners[(i+r)%4][0]-C[i][0],d.corners[(i+r)%4][1]-C[i][1])));if(e<err){err=e;rotIdx=r;}}}
  const side=(Math.hypot(C[1][0]-C[0][0],C[1][1]-C[0][1])+Math.hypot(C[3][1]-C[0][1],C[3][0]-C[0][0]))/2,cell=side/9;
  let oriOk=null,oriInfo=null;if(d.corners&&err/cell<.3){const or=await GridDetect.orient(img,d.corners,window.EXPECT?pos:null);const rr=((o.rot%360)+360)%360,sh=window.EXPECT?0:(rr>150&&rr<210)?2:0;/* 180°回した盤はカメラから見て駒が正立＝先手側から撮ったのと区別できないので、カメラ基準で正立を正解とする */const e=Math.max(...[0,1,2,3].map(i=>Math.hypot(or.corners[i][0]-C[(i+sh)%4][0],or.corners[i][1]-C[(i+sh)%4][1])));oriOk=e/cell<.3;oriInfo={rot:Math.round(rr),got:or.rot,conf:+(or.conf||0).toFixed(2),occ:or.occ};}
  rows.push({cat,errCell:+(err/cell).toFixed(3),conf:+d.conf.toFixed(2),ok:d.ok,ms:Math.round(d.ms),src:d.src,oriOk,oriInfo});
  if((err/cell>=.15&&(window.NF=(window.NF||0)+1)<=4)||n===0&&['標準','回転±25°','手で一部隠れる','全部入り','背景が散らかっている'].includes(cat)){const c=document.createElement('canvas');c.width=ph.width;c.height=ph.height;const x=c.getContext('2d');x.drawImage(ph,0,0);
   if(d.corners){const H=Vision.homography([[0,0],[9,0],[9,9],[0,9]],d.corners);x.strokeStyle='#00e676';x.lineWidth=3;x.beginPath();for(let i=0;i<=9;i++){x.moveTo(...Vision.mapPt(H,i,0));x.lineTo(...Vision.mapPt(H,i,9));x.moveTo(...Vision.mapPt(H,0,i));x.lineTo(...Vision.mapPt(H,9,i));}x.stroke();}
   x.fillStyle='rgba(0,0,0,.6)';x.fillRect(0,0,ph.width,44);x.fillStyle='#fff';x.font='bold 26px sans-serif';x.fillText(`${cat}: 誤差 ${(err/cell).toFixed(2)}マス 信頼度 ${(d.conf*100).toFixed(0)}%`,10,32);
   (window.SHOTS=window.SHOTS||[]).push([cat,c.toDataURL('image/jpeg',.85)]);}}
 return rows;});
const by={};for(const r of R){(by[r.cat]=by[r.cat]||[]).push(r);}
const ok=r=>r.errCell<0.15;let tot=0,succ=0;
console.log('カテゴリ                 成功(誤差<0.15マス)  誤差中央値(マス)  最大  信頼度平均  向き正解  ms');
for(const[c,rs]of Object.entries(by)){const e=rs.map(r=>r.errCell).sort((a,b)=>a-b);const s=rs.filter(ok).length;tot+=rs.length;succ+=s;const oo=rs.filter(r=>r.oriOk!==null);
 console.log(c.padEnd(16,'　'),`${s}/${rs.length}`.padStart(6),e[Math.floor(e.length/2)].toFixed(3).padStart(10),e[e.length-1].toFixed(2).padStart(8),(rs.reduce((a,r)=>a+r.conf,0)/rs.length).toFixed(2).padStart(8),`${oo.filter(r=>r.oriOk).length}/${oo.length}`.padStart(8),Math.round(rs.reduce((a,r)=>a+r.ms,0)/rs.length));}
console.log(`合計 ${succ}/${tot} = ${(succ/tot*100).toFixed(1)}%`);
const fails=R.filter(r=>!ok(r));console.log('失敗例',JSON.stringify(fails.slice(0,12)));
const lowConfButOk=R.filter(r=>ok(r)&&!r.ok).length,highConfButBad=R.filter(r=>!ok(r)&&r.ok).length;console.log('成功だが信頼度低(<0.25)',lowConfButOk,'失敗なのに信頼度高',highConfButBad);
fs.writeFileSync(SS+'grid_results.json',JSON.stringify(R,null,1));
const shots=await pg.evaluate(()=>window.SHOTS||[]);shots.forEach(([c,u],i)=>fs.writeFileSync(SS+`grid_sample_${i+1}.jpg`,Buffer.from(u.split(',')[1],'base64')));
console.log('errors',errs);await br.close();})();
