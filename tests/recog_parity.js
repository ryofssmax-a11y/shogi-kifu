// JS 推論と PyTorch 出力の一致を確認
const fs=require('fs');require(__dirname+'/../recog.js');const R=globalThis.Recog;
const meta=JSON.parse(fs.readFileSync(__dirname+'/../model/piece-model.json'));const b=fs.readFileSync(__dirname+'/../model/piece-model.bin');
const m=R.build(meta,b.buffer.slice(b.byteOffset,b.byteOffset+b.length));
const npy=f=>{const d=fs.readFileSync(f),hl=d.readUInt16LE(8),h=d.slice(10,10+hl).toString();return{shape:JSON.parse(h.match(/shape': \(([^)]*)\)/)[1].replace(/,\s*$/,'').replace(/^/,'[')+']'),data:new Float32Array(d.buffer.slice(d.byteOffset+10+hl,d.byteOffset+d.length))};};
const X=npy((process.env.ML_REF||'/workspace/shogi-ml')+'/ref_in.npy'),Y=npy((process.env.ML_REF||'/workspace/shogi-ml')+'/ref_out.npy');let agree=0,maxd=0;const t=Date.now();
for(let i=0;i<64;i++){const o=R.forward(m,X.data.subarray(i*3072,(i+1)*3072)),ref=Y.data.subarray(i*29,(i+1)*29);
 const am=a=>a.indexOf(Math.max(...a));if(am(Array.from(o))===am(Array.from(ref)))agree++;for(let k=0;k<29;k++)maxd=Math.max(maxd,Math.abs(o[k]-ref[k]));}
console.log('argmax一致',agree,'/64  最大差',maxd.toFixed(3),' ms/マス',((Date.now()-t)/64).toFixed(1));
