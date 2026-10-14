require('/workspace/shogi-kifu-app/shogi.js');const S=globalThis.Shogi;let ok=0,ng=0;
const t=(n,c)=>{c?ok++:ng++;console.log((c?'PASS ':'FAIL ')+n)};
let p=S.initial();t('初期局面の合法手30',S.legal(p).length===30);
const kif=`手合割：平手
   1 ７六歩(77)
   2 ３四歩(33)
   3 ２二角成(88)
   4 同　銀(31)
   5 ４五角打
   6 ５二金(41)
   7 ３四角(45)
   8 ６二銀(71)
   9 ２三角成(34)`;
const g=S.parseKIF(kif);t('KIF読込 9手',g.moves.length===9);
const ps=S.positions('平手',g.moves);let not=[];g.moves.forEach((m,i)=>not.push(S.notation(ps[i],m,g.moves[i-1])));console.log(not.join(' '));
t('表記',not.join(' ')==='▲７六歩 △３四歩 ▲２二角成 △同銀 ▲４五角打 △５二金左 ▲３四角 △６二銀 ▲２三角成'||console.log('got',not));
t('角取り→持ち駒',ps[3].h[0].B===1&&ps[4].h[1].B===1);
t('打った後は持ち駒0',ps[5].h[0].B===0);
t('成った駒は馬',ps[9].b[2][7].p&&ps[9].b[2][7].k==='B'&&ps[9].h[0].P===2);
const out=S.toKIF({moves:g.moves,handicap:'平手'});console.log(out);
const g2=S.parseKIF(out);t('KIF往復',JSON.stringify(g2.moves)===JSON.stringify(g.moves));
// 二歩
let q=S.initial();q.b[6][2]=null;q.h[0].P=1;t('二歩禁止',!S.legal(q).some(m=>m.drop&&m.k==='P'&&m.tc===0));
// 打ち歩詰め
let e={b:Array.from({length:9},()=>Array(9).fill(null)),h:[{R:0,B:0,G:0,S:0,N:0,L:0,P:1},{R:0,B:0,G:0,S:0,N:0,L:0,P:0}],turn:0};
e.b[0][8]={k:'K',o:1,p:false};e.b[0][7]={k:'L',o:1,p:false};e.b[2][8]={k:'G',o:0,p:false};e.b[8][0]={k:'K',o:0,p:false};
t('打ち歩詰め禁止',!S.legal(e).some(m=>m.drop&&m.tr===1&&m.tc===8));
e.b[0][7]=null;t('逃げ道あれば歩打ち可',S.legal(e).some(m=>m.drop&&m.tr===1&&m.tc===8));
// 行き所のない駒
let f=S.initial();f.b[2][4]=null;f.b[0][4]=null;f.b[3][4]={k:'P',o:0,p:false};f.b[6][4]=null;
let f2=S.apply(S.apply(f,S.legal(f).find(m=>m.fr===3&&m.fc===4&&!m.promote)),S.legal(S.apply(f,S.legal(f)[0])).find(m=>!m.drop));
t('不成の選択可',S.legal(f).filter(m=>m.fr===3&&m.fc===4).length===2);
t('駒落ちは上手から',S.initial('香落ち').turn===1&&!S.initial('香落ち').b[0][8]);
console.log(`${ok} passed, ${ng} failed`);process.exit(ng?1:0);
