// ===== 盤面画像の補正と差分検出 =====
(function(G){
// 4点→4点の射影変換行列（dst→src の逆写像に使う）
function homography(from,to){ // from[i]=[x,y] → to[i]=[u,v]
 const A=[],B=[];
 for(let i=0;i<4;i++){const[x,y]=from[i],[u,v]=to[i];
  A.push([x,y,1,0,0,0,-u*x,-u*y]);B.push(u);A.push([0,0,0,x,y,1,-v*x,-v*y]);B.push(v);}
 const n=8;for(let i=0;i<n;i++){let mx=i;for(let j=i+1;j<n;j++)if(Math.abs(A[j][i])>Math.abs(A[mx][i]))mx=j;
  [A[i],A[mx]]=[A[mx],A[i]];[B[i],B[mx]]=[B[mx],B[i]];
  for(let j=0;j<n;j++){if(j===i)continue;const f=A[j][i]/A[i][i];for(let k=i;k<n;k++)A[j][k]-=f*A[i][k];B[j]-=f*B[i];}}
 const h=B.map((b,i)=>b/A[i][i]);return[...h,1];}
const mapPt=(H,x,y)=>{const w=H[6]*x+H[7]*y+H[8];return[(H[0]*x+H[1]*y+H[2])/w,(H[3]*x+H[4]*y+H[5])/w];};
// src ImageData を corners(左上,右上,右下,左下) で切り出して size×size に正面化
function rectify(src,corners,size=270){
 const H=homography([[0,0],[size,0],[size,size],[0,size]],corners),out=new ImageData(size,size),W=src.width,Hh=src.height,s=src.data,d=out.data;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const[u,v]=mapPt(H,x+.5,y+.5);const X=Math.min(W-1,Math.max(0,u|0)),Y=Math.min(Hh-1,Math.max(0,v|0));
  const si=(Y*W+X)*4,di=(y*size+x)*4;d[di]=s[si];d[di+1]=s[si+1];d[di+2]=s[si+2];d[di+3]=255;}
 return out;}
function gray(img){const n=img.width*img.height,g=new Float32Array(n);let m=0;
 for(let i=0;i<n;i++){g[i]=.299*img.data[i*4]+.587*img.data[i*4+1]+.114*img.data[i*4+2];m+=g[i];}
 m/=n;let v=0;for(let i=0;i<n;i++)v+=(g[i]-m)**2;const sd=Math.sqrt(v/n)||1;for(let i=0;i<n;i++)g[i]=(g[i]-m)/sd;return g;}
// 81マスごとの変化量（明るさを正規化、マスの中央60%のみ、少しの位置ずれに強いよう 3x3 ぼかし）
function cellDiff(a,b,shift=3){const S=a.width,ga=blur(gray(a),S),gb=blur(gray(b),S),cs=S/9,res=new Array(81).fill(0);
 for(let r=0;r<9;r++)for(let c=0;c<9;c++){const y0=Math.round(r*cs+cs*.2),y1=Math.round(r*cs+cs*.8),x0=Math.round(c*cs+cs*.2),x1=Math.round(c*cs+cs*.8);let best=1e9;
  for(let dy=-shift;dy<=shift;dy++)for(let dx=-shift;dx<=shift;dx++){let sum=0,n=0; // 少しの位置ずれを吸収
   for(let y=y0;y<y1;y++){const Y=Math.min(S-1,Math.max(0,y+dy));for(let x=x0;x<x1;x++){const X=Math.min(S-1,Math.max(0,x+dx));sum+=Math.abs(ga[y*S+x]-gb[Y*S+X]);n++;}}
   if(sum/n<best)best=sum/n;}
  res[r*9+c]=best;}
 return res;}
function blur(g,S){const o=new Float32Array(g.length);for(let y=0;y<S;y++)for(let x=0;x<S;x++){let s=0,n=0;
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const X=x+dx,Y=y+dy;if(X>=0&&Y>=0&&X<S&&Y<S){s+=g[Y*S+X];n++;}}o[y*S+x]=s/n;}return o;}
// 合法手を差分に当てはめて順位付け
function rankMoves(moves,diff){const sorted=[...diff].sort((a,b)=>a-b),med=sorted[40],thr=med*1.8+0.05;
 const d=diff.map(v=>Math.max(0,v-thr)),T=d.reduce((a,b)=>a+b,0)+1e-6;
 const dm=Math.max(...d),changed=diff.map((v,i)=>i).filter(i=>d[i]>0&&d[i]>dm*.35).sort((a,b)=>diff[b]-diff[a]);
 const scored=moves.map(m=>{const E=m.drop?[m.tr*9+m.tc]:[m.fr*9+m.fc,m.tr*9+m.tc];
  const inE=E.reduce((a,i)=>a+d[i],0),minE=Math.min(...E.map(i=>d[i]));
  return{m,score:(2*inE-T)/T+(minE>0?0.15:0)};}).sort((a,b)=>b.score-a.score);
 return{changed,scored,noise:med,thr};}
G.Vision={homography,mapPt,rectify,cellDiff,rankMoves};
})(typeof window!=='undefined'?window:globalThis);
