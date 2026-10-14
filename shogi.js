// ===== 将棋ルールエンジン =====
// 盤: b[r][c]  r=0..8 (一〜九段), c=0..8 (９筋〜１筋)  筋 = 9-c, 段 = r+1
// 駒: {k:'P'|'L'|'N'|'S'|'G'|'B'|'R'|'K', o:0(先手)|1(後手), p:成}
(function(G){
const NAME={P:'歩',L:'香',N:'桂',S:'銀',G:'金',B:'角',R:'飛',K:'玉'};
const PNAME={P:'と',L:'成香',N:'成桂',S:'成銀',B:'馬',R:'龍'};
const CH1={P:'と',L:'杏',N:'圭',S:'全',B:'馬',R:'龍'};
const PROM=new Set(['P','L','N','S','B','R']);
const KAN=['','一','二','三','四','五','六','七','八','九'];
const ZEN=['','１','２','３','４','５','６','７','８','９'];
const HAND_ORDER=['R','B','G','S','N','L','P'];
const ORTH=[[-1,0],[1,0],[0,-1],[0,1]],DIAG=[[-1,-1],[-1,1],[1,-1],[1,1]];
const STEP={P:[[-1,0]],N:[[-2,-1],[-2,1]],S:[[-1,-1],[-1,0],[-1,1],[1,-1],[1,1]],
 G:[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,0]],K:[...ORTH,...DIAG]};
const HANDICAPS=['平手','香落ち','角落ち','飛車落ち','二枚落ち','四枚落ち','六枚落ち'];
const emptyHand=()=>({R:0,B:0,G:0,S:0,N:0,L:0,P:0});
function initial(h='平手'){
 const b=Array.from({length:9},()=>Array(9).fill(null));
 const back=['L','N','S','G','K','G','S','N','L'];
 for(let c=0;c<9;c++){b[0][c]={k:back[c],o:1,p:false};b[8][c]={k:back[c],o:0,p:false};
  b[2][c]={k:'P',o:1,p:false};b[6][c]={k:'P',o:0,p:false};}
 b[1][1]={k:'R',o:1,p:false};b[1][7]={k:'B',o:1,p:false};
 b[7][1]={k:'B',o:0,p:false};b[7][7]={k:'R',o:0,p:false};
 const rm=(...s)=>s.forEach(([r,c])=>b[r][c]=null);
 if(h==='香落ち')rm([0,8]);
 if(h==='角落ち')rm([1,7]);
 if(h==='飛車落ち')rm([1,1]);
 if(h==='二枚落ち')rm([1,1],[1,7]);
 if(h==='四枚落ち')rm([1,1],[1,7],[0,0],[0,8]);
 if(h==='六枚落ち')rm([1,1],[1,7],[0,0],[0,8],[0,1],[0,7]);
 return {b,h:[emptyHand(),emptyHand()],turn:h==='平手'?0:1};
}
const clone=p=>({b:p.b.map(r=>r.map(x=>x&&{...x})),h:[{...p.h[0]},{...p.h[1]}],turn:p.turn});
const inside=(r,c)=>r>=0&&r<9&&c>=0&&c<9;
const inZone=(o,r)=>o?r>=6:r<=2;
function mustPromote(k,o,r){const rr=o?8-r:r;return (k==='P'||k==='L')&&rr===0||k==='N'&&rr<=1;}
function dirs(pc){let k=pc.k;
 if(pc.p){if(k==='B')return{st:ORTH,sl:DIAG};if(k==='R')return{st:DIAG,sl:ORTH};k='G';}
 if(k==='L')return{st:[],sl:[[-1,0]]};if(k==='B')return{st:[],sl:DIAG};if(k==='R')return{st:[],sl:ORTH};
 return{st:STEP[k],sl:[]};}
function targets(b,r,c){const pc=b[r][c],f=pc.o?-1:1,{st,sl}=dirs(pc),out=[];
 for(const[dr,dc]of st){const R=r+dr*f,C=c+dc*f;if(inside(R,C)&&(!b[R][C]||b[R][C].o!==pc.o))out.push([R,C]);}
 for(const[dr,dc]of sl){let R=r+dr*f,C=c+dc*f;while(inside(R,C)){if(b[R][C]){if(b[R][C].o!==pc.o)out.push([R,C]);break;}out.push([R,C]);R+=dr*f;C+=dc*f;}}
 return out;}
function attacked(b,r,c,by){for(let i=0;i<9;i++)for(let j=0;j<9;j++){const x=b[i][j];if(x&&x.o===by&&targets(b,i,j).some(([R,C])=>R===r&&C===c))return true;}return false;}
function kingPos(b,o){for(let i=0;i<9;i++)for(let j=0;j<9;j++){const x=b[i][j];if(x&&x.k==='K'&&x.o===o)return[i,j];}return null;}
function inCheck(p,o){const k=kingPos(p.b,o);return !!k&&attacked(p.b,k[0],k[1],1-o);}
function apply(p,m){const q=clone(p),o=p.turn;
 if(m.drop){q.b[m.tr][m.tc]={k:m.k,o,p:false};q.h[o][m.k]--;}
 else{const pc=q.b[m.fr][m.fc],cap=q.b[m.tr][m.tc];if(cap&&cap.k!=='K')q.h[o][cap.k]++;
  q.b[m.tr][m.tc]={k:pc.k,o,p:pc.p||!!m.promote};q.b[m.fr][m.fc]=null;}
 q.turn=1-o;return q;}
function pseudo(p){const o=p.turn,b=p.b,ms=[];
 for(let r=0;r<9;r++)for(let c=0;c<9;c++){const pc=b[r][c];if(!pc||pc.o!==o)continue;
  for(const[R,C]of targets(b,r,c)){const cap=b[R][C]?b[R][C].k:null,cpr=b[R][C]?b[R][C].p:false;
   const base={fr:r,fc:c,tr:R,tc:C,k:pc.k,wasP:pc.p,o,cap,capP:cpr,drop:false};
   const canP=PROM.has(pc.k)&&!pc.p&&(inZone(o,r)||inZone(o,R));
   if(canP)ms.push({...base,promote:true,canP});
   if(!(canP&&mustPromote(pc.k,o,R)))ms.push({...base,promote:false,canP});}}
 for(const k of HAND_ORDER){if(!p.h[o][k])continue;
  for(let r=0;r<9;r++)for(let c=0;c<9;c++){if(b[r][c])continue;if(mustPromote(k,o,r))continue;
   if(k==='P'&&b.some(row=>{const x=row[c];return x&&x.o===o&&x.k==='P'&&!x.p}))continue; // 二歩
   ms.push({tr:r,tc:c,k,o,drop:true,promote:false,canP:false,cap:null});}}
 return ms;}
function legal(p,opt={}){return pseudo(p).filter(m=>{const q=apply(p,m);if(inCheck(q,p.turn))return false;
 if(!opt.noUchifu&&m.drop&&m.k==='P'&&inCheck(q,q.turn)&&legal(q,{noUchifu:true}).length===0)return false; // 打ち歩詰め
 return true;});}
const sq=(r,c)=>ZEN[9-c]+KAN[r+1];
const pieceName=m=>m.wasP?PNAME[m.k]:NAME[m.k];
// 相対位置（右・左・上・引・寄・直）
function relative(p,m){if(m.drop)return'';
 const others=legal(p).filter(x=>!x.drop&&x.tr===m.tr&&x.tc===m.tc&&x.k===m.k&&!!x.wasP===!!m.wasP&&!(x.fr===m.fr&&x.fc===m.fc));
 if(!others.length)return'';
 const f=m.o?-1:1,dy=x=>(x.tr-x.fr)*f,all=[m,...others.filter((x,i,a)=>a.findIndex(y=>y.fr===x.fr&&y.fc===x.fc)===i)];
 const vert=x=>dy(x)<0?'上':dy(x)>0?'引':'寄';
 if(all.filter(x=>vert(x)===vert(m)).length===1)return vert(m);
 if(dy(m)<0&&m.fc===m.tc&&!/[BR]/.test(m.k)||m.wasP&&dy(m)<0&&m.fc===m.tc)return'直';
 const same=all.filter(x=>vert(x)===vert(m)),xs=same.map(x=>x.fc*f);
 const v=m.fc*f;let s=v===Math.max(...xs)?'右':v===Math.min(...xs)?'左':'';
 if(same.length>2)s+=vert(m);return s;}
function notation(p,m,prev){const dest=prev&&!prev.drop&&prev.tr===m.tr&&prev.tc===m.tc||prev&&prev.drop&&prev.tr===m.tr&&prev.tc===m.tc?'同':sq(m.tr,m.tc);
 return (m.o?'△':'▲')+dest+pieceName(m)+relative(p,m)+(m.drop?'打':m.promote?'成':m.canP?'不成':'');}
function kifMove(m,prev){const same=prev&&prev.tr===m.tr&&prev.tc===m.tc;
 return (same?'同　':sq(m.tr,m.tc))+pieceName(m)+(m.drop?'打':(m.promote?'成':m.canP?'不成':'')+'('+(9-m.fc)+(m.fr+1)+')');}
function toKIF(game){const d=new Date(game.created||Date.now()),z=n=>String(n).padStart(2,'0');
 let s='# ---- 将棋カメラ棋譜 ----\n開始日時：'+d.getFullYear()+'/'+z(d.getMonth()+1)+'/'+z(d.getDate())+' '+z(d.getHours())+':'+z(d.getMinutes())+'\n';
 s+=game.start?toBOD(game.start):'手合割：'+(game.handicap||'平手')+'\n';
 const ho=game.handicap&&game.handicap!=='平手';
 s+=(ho?'下手：':'先手：')+(game.black||'')+'\n'+(ho?'上手：':'後手：')+(game.white||'')+'\n';
 s+='手数----指手---------消費時間--\n';
 game.moves.forEach((m,i)=>{s+=String(i+1).padStart(4,' ')+' '+kifMove(m,game.moves[i-1]).padEnd(12,'　').replace(/　+$/,'')+'   ( 0:00/00:00:00)\n';});
 s+=String(game.moves.length+1).padStart(4,' ')+' 中断\nまで'+game.moves.length+'手で中断\n';return s;}
const NAMES_ALL=[['成香','L',1],['成桂','N',1],['成銀','S',1],['歩','P',0],['香','L',0],['桂','N',0],['銀','S',0],['金','G',0],['角','B',0],['飛','R',0],['玉','K',0],['王','K',0],['と','P',1],['杏','L',1],['圭','N',1],['全','S',1],['馬','B',1],['龍','R',1],['竜','R',1]];
function parseKIF(text){const lines=text.replace(/\r/g,'').split('\n');let h='平手',black='',white='';
 for(const l of lines){let m;if(m=l.match(/^手合割[：:](.+)/))h=m[1].trim();if(m=l.match(/^(先手|下手)[：:](.*)/))black=m[2].trim();if(m=l.match(/^(後手|上手)[：:](.*)/))white=m[2].trim();}
 if(!HANDICAPS.includes(h))h='平手';
 const start=parseBOD(lines);let p=start?clone(start):initial(h);const moves=[];
 for(const l of lines){const mm=l.match(/^\s*(\d+)\s+(.+)$/);if(!mm||l.trim().startsWith('#'))continue;mm[2]=mm[2].replace(/\s+\(\s*[\d:\/ ]+\)\s*\+?$/,'').trim();let t=mm[2].replace(/^[▲△☗☖]/,'');
  if(/^(投了|中断|詰み|千日手|持将棋|切れ負け|反則|入玉)/.test(t))break;
  let tr,tc;const prev=moves[moves.length-1];
  if(t[0]==='同'){if(!prev)throw new Error(mm[1]+'手目: 同 の前の手がありません');tr=prev.tr;tc=prev.tc;t=t.slice(1).replace(/^[\s　]+/,'');}
  else{const f='１２３４５６７８９123456789'.indexOf(t[0])%9+1,rk='一二三四五六七八九123456789'.indexOf(t[1])%9+1;if(f<1||rk<1)throw new Error(mm[1]+'手目を読めません: '+mm[2]);tc=9-f;tr=rk-1;t=t.slice(2);}
  const nm=NAMES_ALL.find(([s])=>t.startsWith(s));if(!nm)throw new Error(mm[1]+'手目の駒を読めません: '+mm[2]);t=t.slice(nm[0].length);
  const drop=/^打/.test(t),prom=/^成/.test(t),from=t.match(/\((\d)(\d)\)/);
  const cands=legal(p).filter(x=>x.tr===tr&&x.tc===tc&&x.k===nm[1]&&!!x.drop===drop&&(drop||(!!x.wasP===!!nm[2]&&!!x.promote===prom))&&(!from||x.fc===9-+from[1]&&x.fr===+from[2]-1));
  if(!cands.length)throw new Error(mm[1]+'手目が指せない手です: '+mm[2]);
  moves.push(cands[0]);p=apply(p,cands[0]);}
 return {handicap:start?'平手':h,start,black,white,moves};}
function positions(handicap,moves,start){const ps=[start?clone(start):initial(handicap)];for(const m of moves)ps.push(apply(ps[ps.length-1],m));return ps;}
const BODCH={P:'歩',L:'香',N:'桂',S:'銀',G:'金',B:'角',R:'飛',K:'玉'},BODP={P:'と',L:'杏',N:'圭',S:'全',B:'馬',R:'龍'};
const NUMK=['','','二','三','四','五','六','七','八','九','十','十一','十二','十三','十四','十五','十六','十七','十八'];
function handStr(h){const a=HAND_ORDER.filter(k=>h[k]).map(k=>NAME[k]+(h[k]>1?NUMK[h[k]]:''));return a.length?a.join('　'):'なし';}
function toBOD(p){let s='後手の持駒：'+handStr(p.h[1])+'\n  ９ ８ ７ ６ ５ ４ ３ ２ １\n+---------------------------+\n';
 for(let r=0;r<9;r++){s+='|';for(let c=0;c<9;c++){const x=p.b[r][c];s+=x?(x.o?'v':' ')+(x.p?BODP[x.k]:BODCH[x.k]):' ・';}s+='|'+KAN[r+1]+'\n';}
 return s+'+---------------------------+\n先手の持駒：'+handStr(p.h[0])+'\n'+(p.turn?'後手番\n':'');}
function parseBOD(lines){const rows=lines.filter(l=>/^\|.*\|[一二三四五六七八九]/.test(l));if(rows.length!==9)return null;
 const b=Array.from({length:9},()=>Array(9).fill(null));const rev={};for(const k in BODCH)rev[BODCH[k]]=[k,false];for(const k in BODP)rev[BODP[k]]=[k,true];rev['王']=['K',false];rev['竜']=['R',true];
 rows.forEach((l,r)=>{const t=l.slice(1,l.lastIndexOf('|'));for(let c=0;c<9;c++){const cell=t.substr(c*2,2);const ch=cell[1];if(rev[ch])b[r][c]={k:rev[ch][0],o:cell[0]==='v'?1:0,p:rev[ch][1]};}});
 const h=[emptyHand(),emptyHand()];
 for(const l of lines){const m=l.match(/^(先手|後手|下手|上手)の持駒[：:](.*)/);if(!m)continue;const o=/後手|上手/.test(m[1])?1:0;
  for(const t of m[2].split(/[\s　]+/)){const k=Object.keys(NAME).find(k=>NAME[k]===t[0]);if(!k)continue;const n=t.slice(1);h[o][k]+=n?Math.max(1,NUMK.indexOf(n)):1;}}
 return{b,h,turn:lines.some(l=>/^(後手番|上手番)/.test(l))?1:0};}
G.Shogi={toBOD,parseBOD,NAME,PNAME,CH1,KAN,ZEN,HAND_ORDER,HANDICAPS,initial,clone,apply,legal,inCheck,notation,kifMove,toKIF,parseKIF,positions,sq,mustPromote};
})(typeof window!=='undefined'?window:globalThis);
