// ===== 盤（9x9 のマス目）の自動検出 =====
// 1) 縮小・Sobel で輪郭  2) 候補の四角形を作る（木の色の領域 / Hough 直線の2方向の組）
// 3) 予想される 10 本ずつの線に沿って輪郭の強さを測り、線ごとに位置を微調整 → 100 交点から射影変換を最小二乗で当て直す
// 4) 「線の上」と「線と線の中間」の輪郭の強さの比で信頼度を出す
(function(G){
const V=G.Vision;
function prep(img,max=420){const sc=Math.min(1,max/Math.max(img.width,img.height)),w=Math.round(img.width*sc),h=Math.round(img.height*sc);
 const g=new Float32Array(w*h),rgb=new Uint8Array(w*h*3),d=img.data,W=img.width;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const X=Math.min(img.width-1,Math.floor(x/sc)),Y=Math.min(img.height-1,Math.floor(y/sc)),i=(Y*W+X)*4,k=y*w+x;
  // 小さく縮める時は 2x2 平均
  let r=d[i],gg=d[i+1],b=d[i+2];if(sc<.5&&X+1<img.width&&Y+1<img.height){const j=i+4,k2=i+W*4,k3=k2+4;r=(r+d[j]+d[k2]+d[k3])/4;gg=(gg+d[j+1]+d[k2+1]+d[k3+1])/4;b=(b+d[j+2]+d[k2+2]+d[k3+2])/4;}
  rgb[k*3]=r;rgb[k*3+1]=gg;rgb[k*3+2]=b;g[k]=.299*r+.587*gg+.114*b;}
 const mag=new Float32Array(w*h),ang=new Float32Array(w*h);
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const k=y*w+x,
  gx=g[k-w+1]+2*g[k+1]+g[k+w+1]-g[k-w-1]-2*g[k-1]-g[k+w-1],gy=g[k+w-1]+2*g[k+w]+g[k+w+1]-g[k-w-1]-2*g[k-w]-g[k-w+1];
  mag[k]=Math.hypot(gx,gy);ang[k]=Math.atan2(gy,gx);}
 // 細い暗い線の応答（リッジ）: 両側 ±2px より暗い分。Sobel は細線の中心で 0 になるので線の位置合わせにはこちらを使う
 const rid=new Float32Array(w*h),D=[[2,0],[0,2],[1.5,1.5],[1.5,-1.5]];
 for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){const k=y*w+x,c=g[k];let best=0;
  for(const[dx,dy]of D){const X1=Math.round(x+dx),Y1=Math.round(y+dy),X2=Math.round(x-dx),Y2=Math.round(y-dy);const a=g[Y1*w+X1],b=g[Y2*w+X2];const v=Math.min(a,b)-c;if(v>best)best=v;}
  rid[k]=best;}
 const rs=[];for(let k=0;k<w*h;k+=3)rs.push(rid[k]);rs.sort((a,b)=>a-b);const ref=rs[Math.floor(rs.length*.97)]+8;
 return{w,h,sc,g,rgb,mag,ang,rid,ref};}
// 2x2 の点群 → 射影変換（最小二乗 DLT, 正規方程式）
function fitH(src,dst){const A=Array.from({length:8},()=>new Float64Array(9));
 for(let n=0;n<src.length;n++){const[x,y]=src[n],[u,v]=dst[n];const rows=[[x,y,1,0,0,0,-u*x,-u*y,u],[0,0,0,x,y,1,-v*x,-v*y,v]];
  for(const r of rows)for(let i=0;i<8;i++){for(let j=0;j<8;j++)A[i][j]+=r[i]*r[j];A[i][8]+=r[i]*r[8];}}
 for(let i=0;i<8;i++){let m=i;for(let j=i+1;j<8;j++)if(Math.abs(A[j][i])>Math.abs(A[m][i]))m=j;[A[i],A[m]]=[A[m],A[i]];if(Math.abs(A[i][i])<1e-12)return null;
  for(let j=0;j<8;j++){if(j===i)continue;const f=A[j][i]/A[i][i];for(let k=i;k<9;k++)A[j][k]-=f*A[i][k];}}
 return[...A.map((r,i)=>r[8]/r[i]),1];}
const boardH=C=>V.homography([[0,0],[9,0],[9,9],[0,9]],C); // 盤座標(0..9) → 画像
function sampleLine(P,H,a0,b0,a1,b1,n=36){let s=0,c=0;for(let k=0;k<n;k++){const t=(k+.5)/n,[x,y]=V.mapPt(H,a0+(a1-a0)*t,b0+(b1-b0)*t),X=x|0,Y=y|0;if(X<1||Y<1||X>=P.w-1||Y>=P.h-1)continue;
 const R=P.rid;s+=Math.max(R[Y*P.w+X],R[Y*P.w+X+1],R[(Y+1)*P.w+X],R[Y*P.w+X-1],R[(Y-1)*P.w+X]);c++;}return c?s/c:0;}
function lineScores(P,H,off=0){const v=[],h=[];for(let i=0;i<=9;i++){v.push(sampleLine(P,H,i+off,0,i+off,9));h.push(sampleLine(P,H,0,i+off,9,i+off));}return{v,h};}
function score(P,C){const H=boardH(C);if(!H||!H.every(Number.isFinite))return 0;
 const area=Math.abs(polyArea(C))/(P.w*P.h);if(area<.03)return 0;
 const V_=x=>sampleLine(P,H,x,0,x,9),H_=y=>sampleLine(P,H,0,y,9,y);
 // 方向ごとに「線上の平均 − 半マス中間の平均」、弱い方を採る。外側にも線があれば罰
 const dir=f=>{let mid=0;const L=[];for(let i=0;i<=9;i++)L.push(f(i));for(let i=0;i<9;i++)mid+=f(i+.5);mid/=9;L.sort((a,b)=>a-b);const on=(L[2]+L[5])/2;const ext=Math.max(f(-1),f(10));return(on-mid-Math.max(0,ext-mid))/P.ref;};
 // マスの縦横比（中央のマス）。将棋盤のマスはほぼ正方形（縦長 1.09）。極端に潰れた格子は誤検出
 const p0=V.mapPt(H,4.5,4.5),px=V.mapPt(H,5.5,4.5),py=V.mapPt(H,4.5,5.5),cw=Math.hypot(px[0]-p0[0],px[1]-p0[1]),chh=Math.hypot(py[0]-p0[0],py[1]-p0[1]),r=Math.min(cw,chh)/Math.max(cw,chh);
 return Math.min(dir(V_),dir(H_))-2*Math.max(0,.7-r);}
const polyArea=C=>{let s=0;for(let i=0;i<4;i++){const[a,b]=C[i],[c,d]=C[(i+1)%4];s+=a*d-b*c;}return s/2;};
// 線ごとに位置を探して射影変換を当て直す
function refine(P,C,iters=4){for(let it=0;it<iters;it++){const H=boardH(C);if(!H)return C;const rng=it<2?.2:.08,st=it<2?.02:.01,dv=[],dh=[],wv=[],wh=[];
  for(let i=0;i<=9;i++){let bv=-1,bvd=0,bh=-1,bhd=0;for(let d=-rng;d<=rng+1e-9;d+=st){const sv=sampleLine(P,H,i+d,0,i+d,9),sh=sampleLine(P,H,0,i+d,9,i+d);if(sv>bv){bv=sv;bvd=d}if(sh>bh){bh=sh;bhd=d}}
   dv.push(bvd);dh.push(bhd);wv.push(bv);wh.push(bh);}
  const mv=[...wv].sort((a,b)=>a-b)[5]*.5,mh=[...wh].sort((a,b)=>a-b)[5]*.5,src=[],dst=[];
  for(let i=0;i<=9;i++)for(let j=0;j<=9;j++){if(wv[i]<mv||wh[j]<mh)continue; // 手で隠れた線などは使わない
   dst.push(V.mapPt(H,i+dv[i],j+dh[j]));src.push([i,j]);}
  if(src.length<12)return C;const H2=fitH(src,dst);if(!H2)return C;C=[[0,0],[9,0],[9,9],[0,9]].map(([x,y])=>V.mapPt(H2,x,y));}
 return C;}
// 候補1: 木の色の最大領域 → いろいろな向きの極値点で四角形
function woodCandidates(P){const{w,h,rgb}=P,m=new Uint8Array(w*h);
 for(let k=0;k<w*h;k++){const r=rgb[k*3],g=rgb[k*3+1],b=rgb[k*3+2];m[k]=(r>70&&r>=g&&g>=b*.95&&r-b>25&&(r-b)/r<.8)?1:0;}
 const lab=new Int32Array(w*h).fill(-1),sizes=[];let best=-1,bs=0;
 for(let s=0;s<w*h;s++){if(!m[s]||lab[s]>=0)continue;const id=sizes.length;let n=0;const q=[s];lab[s]=id;
  while(q.length){const k=q.pop();n++;const x=k%w,y=(k/w)|0;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=w||Y>=h)continue;const kk=Y*w+X;if(m[kk]&&lab[kk]<0){lab[kk]=id;q.push(kk);}}}
  sizes.push(n);if(n>bs){bs=n;best=id;}}
 if(best<0||bs<w*h*.03)return[];const pts=[];for(let k=0;k<w*h;k++)if(lab[k]===best)pts.push([k%w,(k/w)|0]);
 const out=[];for(let a=0;a<90;a+=7.5){const t=a*Math.PI/180,dirs=[0,1,2,3].map(q=>[Math.cos(t+q*Math.PI/2+Math.PI/4),Math.sin(t+q*Math.PI/2+Math.PI/4)]);
  const C=dirs.map(([dx,dy])=>{let bp=null,bv=-1e9;for(const p of pts){const v=p[0]*dx+p[1]*dy;if(v>bv){bv=v;bp=p;}}return bp;});out.push(order(C));}
 return out;}
// 候補2: Hough 直線を2方向に分けて、各方向の線の組で四角形
function houghCandidates(P){const{w,h,mag,ang}=P,NT=180,diag=Math.hypot(w,h),NR=Math.ceil(diag*2)+1,acc=new Float32Array(NT*NR);
 const ms=[];for(let k=0;k<w*h;k++)if(mag[k]>0)ms.push(mag[k]);ms.sort((a,b)=>a-b);const thr=ms[Math.floor(ms.length*.85)]||1;
 const cs=[],sn=[];for(let t=0;t<NT;t++){cs.push(Math.cos(t*Math.PI/NT));sn.push(Math.sin(t*Math.PI/NT));}
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const k=y*w+x;if(mag[k]<thr)continue;let t0=Math.round(((ang[k]%Math.PI)+Math.PI)%Math.PI/Math.PI*NT);
  for(let dt=-4;dt<=4;dt++){const t=((t0+dt)%NT+NT)%NT,r=Math.round(x*cs[t]+y*sn[t]+diag);acc[t*NR+r]+=1;}}
 const peaks=[];for(let t=0;t<NT;t++)for(let r=1;r<NR-1;r++){const v=acc[t*NR+r];if(v<w*.12)continue;let mx=true;
  for(let dt=-3;dt<=3&&mx;dt++)for(let dr=-3;dr<=3;dr++){if(!dt&&!dr)continue;const T=((t+dt)%NT+NT)%NT,R=r+(t+dt<0||t+dt>=NT?-dr:dr);const u=acc[T*NR+Math.min(NR-1,Math.max(0,R))];if(u>v){mx=false;break;}}
  if(mx)peaks.push({t,r:r-diag,v});}
 peaks.sort((a,b)=>b.v-a.v);const top=peaks.slice(0,40);if(top.length<4)return[];
 // 方向の主要2群
 const hist=new Float32Array(NT);for(const p of top)for(let d=-6;d<=6;d++)hist[((p.t+d)%NT+NT)%NT]+=p.v*(1-Math.abs(d)/7);
 let t1=0;for(let t=0;t<NT;t++)if(hist[t]>hist[t1])t1=t;let t2=-1;for(let t=0;t<NT;t++){const dd=Math.min(Math.abs(t-t1),NT-Math.abs(t-t1));if(dd>=50&&(t2<0||hist[t]>hist[t2]))t2=t;}
 const near=(t,c)=>Math.min(Math.abs(t-c),NT-Math.abs(t-c))<=14;
 const fam=c=>top.filter(p=>near(p.t,c)).slice(0,12).map(p=>{const th=p.t*Math.PI/NT;return{a:Math.cos(th),b:Math.sin(th),c:p.r};});
 const A=fam(t1),B=fam(t2);if(A.length<2||B.length<2)return[];
 const pos=(L,M)=>{const cx=w/2,cy=h/2;return L.a*cx+L.b*cy-L.c;};A.sort((x,y)=>pos(x)-pos(y));B.sort((x,y)=>pos(x)-pos(y));
 const X=(L,M)=>{const d=L.a*M.b-L.b*M.a;if(Math.abs(d)<1e-6)return null;return[(L.c*M.b-L.b*M.c)/d,(L.a*M.c-L.c*M.a)/d];};
 const out=[];const pairs=F=>{const r=[];for(let i=0;i<F.length;i++)for(let j=i+1;j<F.length;j++)r.push([F[i],F[j]]);return r;};
 for(const[a1,a2]of pairs(A))for(const[b1,b2]of pairs(B)){const C=[X(a1,b1),X(a1,b2),X(a2,b2),X(a2,b1)];if(C.some(p=>!p||p[0]<-w*.2||p[1]<-h*.2||p[0]>w*1.2||p[1]>h*1.2))continue;out.push(order(C));}
 return out;}
function order(C){const cx=C.reduce((a,p)=>a+p[0],0)/4,cy=C.reduce((a,p)=>a+p[1],0)/4;const s=[...C].sort((p,q)=>Math.atan2(p[1]-cy,p[0]-cx)-Math.atan2(q[1]-cy,q[0]-cx));
 let k=0;for(let i=1;i<4;i++)if(s[i][0]+s[i][1]<s[k][0]+s[k][1])k=i;return[0,1,2,3].map(i=>s[(k+i)%4]);}
// 候補の四角形 Q の内側/少し外側で、10本等間隔の線が最もよく乗る範囲を縦横別々に探す
function fitInside(P,Q){const H=V.homography([[0,0],[1,0],[1,1],[0,1]],Q);if(!H||!H.every(Number.isFinite))return Q;
 const N=24,line=(u,vert)=>{let s=0,c=0;for(let k=0;k<N;k++){const t=.08+.84*(k+.5)/N,[x,y]=vert?V.mapPt(H,u,t):V.mapPt(H,t,u),X=x|0,Y=y|0;if(X<1||Y<1||X>=P.w-1||Y>=P.h-1)continue;const R=P.rid,k2=Y*P.w+X;s+=Math.max(R[k2],R[k2+1],R[k2+P.w]);c++;}return c?s/c:0;};
 const best=vert=>{const M=new Map(),L=u=>{const key=Math.round(u*800);if(!M.has(key))M.set(key,line(u,vert));return M.get(key);};let bv=-1e9,ba=0,bb=1;
  for(let a=-.12;a<=.3;a+=.006)for(let b=.7;b<=1.12;b+=.006){if(b-a<.55)continue;const d=(b-a)/9;let on=0,mid=0;for(let i=0;i<=9;i++)on+=L(a+i*d);for(let i=0;i<9;i++)mid+=L(a+(i+.5)*d);
   const v=on/10-mid/9-.5*Math.max(0,L(a-d)-mid/9)-.5*Math.max(0,L(b+d)-mid/9);if(v>bv){bv=v;ba=a;bb=b;}}return[ba,bb];};
 const[a,b]=best(true),[c,d]=best(false);return[[a,c],[b,c],[b,d],[a,d]].map(([x,y])=>V.mapPt(H,x,y));}
// 1マスずれ（外枠の1本内側/外側に合ってしまう）を直す
function shiftFix(P,C,s0){let best=C,bs=s0;for(let it=0;it<3;it++){let moved=false;const H=boardH(best);
  for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const T=[[dx,dy],[9+dx,dy],[9+dx,9+dy],[dx,9+dy]].map(([x,y])=>V.mapPt(H,x,y)),sc=score(P,T);if(sc>bs+.01){bs=sc;best=T;moved=true;}}
  if(!moved)break;}return[best,bs];}
const shrink=(C,f)=>{const H=boardH(C);return[[f,f],[9-f,f],[9-f,9-f],[f,9-f]].map(([x,y])=>V.mapPt(H,x,y));};
function detect(img,opt={}){const t0=performance.now(),P=prep(img);let cands=[];
 for(const C of woodCandidates(P))cands.push({C,src:'wood'});const hc=houghCandidates(P);for(const C of hc)cands.push({C,src:'hough'});
 if(opt.prior)cands.push({C:opt.prior.map(([x,y])=>[x*P.sc,y*P.sc]),src:'prior'});
 const more=[];for(const c of cands)if(c.src==='wood')for(const f of[.25,.45])more.push({C:shrink(c.C,f),src:'wood-in'});cands=cands.concat(more);
 for(const c of cands)c.s=score(P,c.C);cands.sort((a,b)=>b.s-a.s);cands=cands.slice(0,40);for(const c of cands){const F=fitInside(P,c.C);const s2=score(P,F);if(s2>c.s){c.C=F;c.s=s2;}}cands.sort((a,b)=>b.s-a.s);
 const top=cands.slice(0,8);for(const c of top){const R=refine(P,c.C),s2=score(P,R);if(s2>c.s){c.C=R;c.s=s2;}[c.C,c.s]=shiftFix(P,c.C,c.s);}top.sort((a,b)=>b.s-a.s);
 // 部分的な細かい格子（駒の縁などに乗る）より、ほぼ同点なら大きい方を採る
 let b=top[0];if(b)for(const c of top)if(c.s>=b.s*.75&&Math.abs(polyArea(c.C))>Math.abs(polyArea(b.C))*1.5)b=c;if(!b)return{ok:false,conf:0,ms:performance.now()-t0,n:cands.length};
 const conf=Math.max(0,Math.min(1,(b.s-.1)/.2));
 return{ok:conf>.25,conf,corners:b.C.map(([x,y])=>[x/P.sc,y/P.sc]),src:b.src,score:b.s,ms:performance.now()-t0,n:cands.length};}
// 向き（90°/180°）を駒の認識で決める: corners は 盤の左上(9一)→右上(1一)→右下→左下 の順にしたい
async function orient(img,C,expect){if(!G.Recog)return{corners:C,rot:0};const rots=[0,1].map(r=>[0,1,2,3].map(i=>C[(i+r)%4]));const res=[];
 for(const R of rots){const rect=V.rectify(img,R,360);const cl=await G.Recog.classify(rect);const occ=cl.filter(x=>x.best!==0);
  const conf=occ.length?occ.reduce((a,x)=>a+x.conf,0)/occ.length:0;res.push({R,cl,conf,occ:occ.length});if(occ.length>=6&&conf>.85)break;}
 res.sort((a,b)=>b.conf-a.conf);const b=res[0];if(b.occ<2)return{corners:C,rot:0,conf:0};
 // 先手（b）の駒が下側に多ければそのまま、上側に多ければ 180° 回す
 let s=0;for(const x of b.cl){if(!x.best)continue;const sente=G.Recog.CLS[x.best][0]==='b';s+=(sente?1:-1)*(Math.floor(x.cell/9)-4);}
 let R=s<0?[2,3,0,1].map(i=>b.R[i]):b.R;
 // 盤を180°回した写真は駒の向きも一緒に回るので画像だけでは区別できない → 分かっている局面（棋譜の現局面）と照合して決める
 if(expect){const agree=async Q=>{const cl=await G.Recog.classify(V.rectify(img,Q,360));return cl.filter(x=>x.best===G.Recog.clsOf(expect.b[Math.floor(x.cell/9)][x.cell%9])).length;};
  const R2=[2,3,0,1].map(i=>R[i]),a1=await agree(R),a2=await agree(R2);if(a2>a1+2)R=R2;}
 return{corners:R,rot:(rots.indexOf(b.R)+(s<0?2:0))%4,conf:b.conf,occ:b.occ};}
// 検出した四隅（幾何順）を、前の四隅の向きに合わせて並べ替える
function align(C,prev){if(!prev)return C;let best=C,bd=1e18;for(let r=0;r<4;r++){const R=[0,1,2,3].map(i=>C[(i+r)%4]);const d=R.reduce((a,p,i)=>a+Math.hypot(p[0]-prev[i][0],p[1]-prev[i][1]),0);if(d<bd){bd=d;best=R;}}return best;}
// 画面のキャンバスから検出（向きの補正つき）。返り値 corners は元画像の px
async function auto(cv,opt={}){const k=Math.min(1,840/Math.max(cv.width,cv.height)),sm=document.createElement('canvas');sm.width=Math.round(cv.width*k);sm.height=Math.round(cv.height*k);
 const x=sm.getContext('2d',{willReadFrequently:true});x.drawImage(cv,0,0,sm.width,sm.height);const img=x.getImageData(0,0,sm.width,sm.height),sc=P=>P&&P.map(([a,b])=>[a*k,b*k]);
 const d=detect(img,{prior:sc(opt.prior)});if(!d.corners)return d;opt={...opt,prev:sc(opt.prev)};
 if(opt.prev)d.corners=align(d.corners,opt.prev);else if(opt.orient!==false&&G.Recog&&d.ok){try{const o=await orient(img,d.corners,opt.expect);d.corners=o.corners;d.rot=o.rot;}catch(e){}}
 d.corners=d.corners.map(([a,b])=>[a/k,b/k]);return d;}
G.GridDetect={detect,auto,align,orient,prep,score,refine,fitInside,woodCandidates,houghCandidates};
})(typeof window!=='undefined'?window:globalThis);
