// ===== 駒認識（端末内で動く小さなCNN・int8量子化 約150KB） =====
// 入力: 1マス＋周囲15% を 32x32 RGB に縮小したもの。出力: 29クラス（空き + 先手14種 + 後手14種）
(function(G){
const KMAP={P:'P',L:'L',N:'N',S:'S',G:'G',B:'B',R:'R',K:'K'};
let model=null,loading=null;
function build(meta,buf){const deq=(l)=>{const n=l.t==='conv'?l.out*l.in*9:l.out*l.in;const q=new Int8Array(buf.slice(l.w,l.w+n)),s=new Float32Array(buf.slice(l.s,l.s+4*l.out)),W=new Float32Array(n),per=n/l.out;
  for(let o=0;o<l.out;o++)for(let i=0;i<per;i++)W[o*per+i]=q[o*per+i]*s[o];return{...l,W,B:new Float32Array(buf.slice(l.b,l.b+4*l.out))};};
 return{classes:meta.classes,layers:meta.layers.map(l=>l.w===undefined?l:deq(l))};}
async function load(base='model/'){if(model)return model;if(!loading)loading=(async()=>{const meta=await (await fetch(base+'piece-model.json')).json();const buf=await (await fetch(base+'piece-model.bin')).arrayBuffer();return model=build(meta,buf);})();return loading;}
function conv(x,C,H,W,L){const O=L.out,HW=H*W,y=new Float32Array(O*HW),Wt=L.W;
 for(let o=0;o<O;o++){const yo=o*HW;y.fill(L.B[o],yo,yo+HW);
  for(let c=0;c<C;c++){const xc=c*HW,wb=(o*C+c)*9;
   for(let ky=0;ky<3;ky++)for(let kx=0;kx<3;kx++){const w=Wt[wb+ky*3+kx];if(w===0)continue;const dy=ky-1,dx=kx-1,i0=Math.max(0,-dy),i1=H-Math.max(0,dy),j0=Math.max(0,-dx),j1=W-Math.max(0,dx);
    for(let i=i0;i<i1;i++){const ro=yo+i*W,ri=xc+(i+dy)*W+dx;for(let j=j0;j<j1;j++)y[ro+j]+=w*x[ri+j];}}}
  for(let k=yo;k<yo+HW;k++)if(y[k]<0)y[k]=0;}
 return y;}
function pool(x,C,H,W){const h=H>>1,w=W>>1,y=new Float32Array(C*h*w);for(let c=0;c<C;c++)for(let i=0;i<h;i++)for(let j=0;j<w;j++){const b=c*H*W+2*i*W+2*j;y[c*h*w+i*w+j]=Math.max(x[b],x[b+1],x[b+W],x[b+W+1]);}return y;}
function forward(m,inp){let x=inp,C=3,H=32,W=32;
 for(const L of m.layers){if(L.t==='conv'){x=conv(x,C,H,W,L);C=L.out;}else if(L.t==='pool'){x=pool(x,C,H,W);H>>=1;W>>=1;}
  else if(L.t==='gap'){const y=new Float32Array(C);for(let c=0;c<C;c++){let s=0;for(let k=0;k<H*W;k++)s+=x[c*H*W+k];y[c]=s/(H*W);}x=y;H=W=1;}
  else if(L.t==='fc'){const y=new Float32Array(L.out);for(let o=0;o<L.out;o++){let s=L.B[o];for(let i=0;i<L.in;i++)s+=L.W[o*L.in+i]*x[i];y[o]=s;}x=y;}}
 return x;}
function softmax(z){const m=Math.max(...z),e=z.map(v=>Math.exp(v-m)),s=e.reduce((a,b)=>a+b,0);return e.map(v=>v/s);}
// 正面化された盤画像(ImageData, 正方形)から指定マスを切り出す
let cv1,cv2;
function crops(img,cells){const S=img.width,cs=S/9;if(!cv1){cv1=document.createElement('canvas');cv2=document.createElement('canvas');cv2.width=cv2.height=32;}
 cv1.width=cv1.height=S;cv1.getContext('2d').putImageData(img,0,0);const x=cv2.getContext('2d',{willReadFrequently:true});x.imageSmoothingQuality='high';
 return cells.map(i=>{const r=Math.floor(i/9),c=i%9,m=cs*.15;x.clearRect(0,0,32,32);x.fillStyle='#000';x.fillRect(0,0,32,32);
  x.drawImage(cv1,c*cs-m,r*cs-m,cs+2*m,cs+2*m,0,0,32,32);const d=x.getImageData(0,0,32,32).data,t=new Float32Array(3*1024);
  for(let k=0;k<1024;k++){t[k]=d[k*4]/255;t[1024+k]=d[k*4+1]/255;t[2048+k]=d[k*4+2]/255;}return t;});}
async function classify(img,cells=[...Array(81).keys()]){const m=await load();return crops(img,cells).map((t,i)=>{const p=softmax(Array.from(forward(m,t)));let b=0;p.forEach((v,k)=>{if(v>p[b])b=k});return{cell:cells[i],p,best:b,cls:m.classes[b],conf:p[b]};});}
// クラス名 ⇔ 駒
const CLS=['empty'];for(const s of['b','w'])for(const k of['P','L','N','S','G','B','R','K','+P','+L','+N','+S','+B','+R'])CLS.push(s+k);
const clsOf=pc=>pc?CLS.indexOf((pc.o?'w':'b')+(pc.p?'+':'')+pc.k):0;
const pieceOf=c=>{const n=CLS[c];if(n==='empty')return null;return{o:n[0]==='w'?1:0,p:n[1]==='+',k:n.slice(-1)};};
// 認識結果に対する局面の当てはまり（対数尤度の合計）
function fit(res,p){let s=0;for(const r of res){const [i,j]=[Math.floor(r.cell/9),r.cell%9];s+=Math.log(r.p[clsOf(p.b[i][j])]+1e-4);}return s;}
G.Recog={load,classify,crops,forward,softmax,CLS,clsOf,pieceOf,fit,build};
})(typeof window!=='undefined'?window:globalThis);
