// 合成写真: 局面を木目盤に描き、斜めから撮ったように射影変形＋明るさ変化＋ノイズ
window.synthPhoto=function(p,opt={}){const W=600,H=654,flat=document.createElement('canvas');flat.width=W;flat.height=H;const x=flat.getContext('2d');
 x.fillStyle='#e2b86e';x.fillRect(0,0,W,H);x.strokeStyle='#3b2a14';x.lineWidth=2;const cw=W/9,ch=H/9;
 for(let i=0;i<=9;i++){x.beginPath();x.moveTo(i*cw,0);x.lineTo(i*cw,H);x.moveTo(0,i*ch);x.lineTo(W,i*ch);x.stroke();}
 for(let r=0;r<9;r++)for(let c=0;c<9;c++){const pc=p.b[r][c];if(!pc)continue;x.save();x.translate(c*cw+cw/2+(opt.jit?((r*7+c*3)%5-2):0),r*ch+ch/2);if(pc.o)x.rotate(Math.PI);
  x.fillStyle='#f6e2b3';x.strokeStyle='#5a4020';x.lineWidth=1.5;x.beginPath();x.moveTo(0,-ch*.42);x.lineTo(cw*.34,-ch*.26);x.lineTo(cw*.4,ch*.42);x.lineTo(-cw*.4,ch*.42);x.lineTo(-cw*.34,-ch*.26);x.closePath();x.fill();x.stroke();
  x.fillStyle=pc.p?'#c2181f':'#111';x.font=`bold ${pc.p&&Shogi.PNAME[pc.k].length>1?ch*.3:ch*.5}px serif`;x.textAlign='center';x.textBaseline='middle';
  const t=pc.p?Shogi.CH1[pc.k]:(pc.k==='K'&&pc.o?'王':Shogi.NAME[pc.k]);x.fillText(t,0,ch*.06);x.restore();}
 const PW=900,PH=1200,ph=document.createElement('canvas');ph.width=PW;ph.height=PH;const y=ph.getContext('2d');const bg=y.createLinearGradient(0,0,PW,PH);bg.addColorStop(0,'#555');bg.addColorStop(1,'#8a7a66');y.fillStyle=bg;y.fillRect(0,0,PW,PH);
 const out=y.getImageData(0,0,PW,PH),src=x.getImageData(0,0,W,H),C=opt.corners;
 const Hm=Vision.homography(C,[[0,0],[W,0],[W,H],[0,H]]),gain=opt.gain||1,seed={v:opt.seed||1},rnd=()=>{seed.v=(seed.v*16807)%2147483647;return seed.v/2147483647};
 for(let j=0;j<PH;j++)for(let i=0;i<PW;i++){const[u,v]=Vision.mapPt(Hm,i,j),k=(j*PW+i)*4;
  if(u>=0&&v>=0&&u<W&&v<H){const s=((v|0)*W+(u|0))*4;for(let q=0;q<3;q++)out.data[k+q]=src.data[s+q];}
  const shade=gain*(1-.25*i/PW),n=(rnd()-.5)*(opt.noise||0);for(let q=0;q<3;q++)out.data[k+q]=Math.max(0,Math.min(255,out.data[k+q]*shade+n));}
 y.putImageData(out,0,0);return ph;};
