// 盤の写真の合成（余白つきの盤・背景の散らかり・回転・傾き・照明・手）
window.synthScene=function(p,o){const S=Shogi,cw=60,ch=65,m=o.margin??.45,GW=9*cw,GH=9*ch,mx=m*cw,my=m*ch,W=Math.round(GW+2*mx),H=Math.round(GH+2*my);
 const f=document.createElement('canvas');f.width=W;f.height=H;const x=f.getContext('2d');
 let gs=7;const GR=()=>(gs=(gs*16807)%2147483647)/2147483647;const wood=o.wood||'#e0b56c';x.fillStyle=wood;x.fillRect(0,0,W,H);for(let i=0;i<60;i++){x.strokeStyle=`rgba(120,70,20,${.04+.05*GR()})`;x.lineWidth=1+Math.random()*3;x.beginPath();const yy=GR()*H;x.moveTo(0,yy);x.bezierCurveTo(W/3,yy+10*GR(),2*W/3,yy-10*GR(),W,yy+5);x.stroke();}
 x.strokeStyle='#2a1a08';for(let i=0;i<=9;i++){x.lineWidth=i%9?1.6:3;x.beginPath();x.moveTo(mx+i*cw,my);x.lineTo(mx+i*cw,my+GH);x.moveTo(mx,my+i*ch);x.lineTo(mx+GW,my+i*ch);x.stroke();}
 x.fillStyle='#2a1a08';for(const[a,b]of[[3,3],[6,3],[3,6],[6,6]]){x.beginPath();x.arc(mx+a*cw,my+b*ch,3.5,0,7);x.fill();}
 for(let r=0;r<9;r++)for(let c=0;c<9;c++){const pc=p.b[r][c];if(!pc)continue;x.save();x.translate(mx+c*cw+cw/2,my+r*ch+ch/2);if(pc.o)x.rotate(Math.PI);
  x.fillStyle='#f3dca8';x.strokeStyle='#6a4a20';x.lineWidth=1.5;x.beginPath();x.moveTo(0,-ch*.42);x.lineTo(cw*.34,-ch*.26);x.lineTo(cw*.4,ch*.42);x.lineTo(-cw*.4,ch*.42);x.lineTo(-cw*.34,-ch*.26);x.closePath();x.fill();x.stroke();
  x.fillStyle=pc.p?'#c2181f':'#111';x.font=`bold ${ch*.46}px serif`;x.textAlign='center';x.textBaseline='middle';x.fillText(pc.p?S.CH1[pc.k]:(pc.k==='K'&&pc.o?'王':S.NAME[pc.k]),0,ch*.06);x.restore();}
 const PW=o.pw||720,PH=o.ph||960,ph=document.createElement('canvas');ph.width=PW;ph.height=PH;const y=ph.getContext('2d');
 // 背景
 y.fillStyle=o.bg||'#6b6f78';y.fillRect(0,0,PW,PH);let sd=o.seed||1;const R=()=>(sd=(sd*16807)%2147483647)/2147483647;
 if(o.table){y.fillStyle='#b98b55';y.fillRect(0,0,PW,PH);for(let i=0;i<120;i++){y.strokeStyle=`rgba(90,50,20,${.05+.08*R()})`;y.lineWidth=1+R()*3;y.beginPath();const yy=R()*PH;y.moveTo(0,yy);y.lineTo(PW,yy+R()*20);y.stroke();}}
 if(o.clutter)for(let i=0;i<o.clutter;i++){y.fillStyle=`hsl(${R()*360},${30+R()*60}%,${25+R()*55}%)`;const t=R();if(t<.4)y.fillRect(R()*PW,R()*PH,30+R()*160,20+R()*120);else if(t<.7){y.beginPath();y.arc(R()*PW,R()*PH,10+R()*60,0,7);y.fill();}else{y.strokeStyle=y.fillStyle;y.lineWidth=2+R()*5;y.beginPath();y.moveTo(R()*PW,R()*PH);y.lineTo(R()*PW,R()*PH);y.stroke();}
  if(R()<.3){y.font=`${14+R()*30}px sans-serif`;y.fillText('将棋 Shogi 123',R()*PW,R()*PH);}}
 const C=o.corners,Hm=Vision.homography(C,[[mx,my],[mx+GW,my],[mx+GW,my+GH],[mx,my+GH]]),out=y.getImageData(0,0,PW,PH),src=x.getImageData(0,0,W,H);
 for(let j=0;j<PH;j++)for(let i=0;i<PW;i++){const[u,v]=Vision.mapPt(Hm,i,j);const k=(j*PW+i)*4;
  if(u>=0&&v>=0&&u<W&&v<H){const s=((v|0)*W+(u|0))*4;for(let q=0;q<3;q++)out.data[k+q]=src.data[s+q];}
  const sh=(o.gain||1)*(1-(o.grad||.25)*(i/PW*.6+j/PH*.4));for(let q=0;q<3;q++)out.data[k+q]=Math.max(0,Math.min(255,out.data[k+q]*sh+(R()-.5)*(o.noise||12)));}
 y.putImageData(out,0,0);
 if(o.hand){const[hx,hy]=o.hand;y.fillStyle='#d9a383';y.beginPath();y.ellipse(hx,hy,PW*.09,PW*.11,.3,0,7);y.fill();y.beginPath();y.moveTo(hx-PW*.07,hy+PW*.05);y.lineTo(hx-PW*.1,PH);y.lineTo(hx+PW*.1,PH);y.lineTo(hx+PW*.07,hy+PW*.05);y.fill();}
 return ph;};
// 盤の四隅（マス目の外枠）: 中心・大きさ・回転・傾き
window.quad=function(o){const PW=o.pw||720,PH=o.ph||960,s=o.size*Math.min(PW,PH)/2,a=o.rot*Math.PI/180,k=o.tilt||0;
 const base=[[-1,-1.09],[1,-1.09],[1,1.09],[-1,1.09]].map(([x,y])=>[x*(y<0?1-k:1),y*(1-k*.35)]);
 return base.map(([x,y])=>[PW/2+(o.dx||0)+s*(x*Math.cos(a)-y*Math.sin(a)),PH/2+(o.dy||0)+s*(x*Math.sin(a)+y*Math.cos(a))]);};
