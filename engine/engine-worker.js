// やねうら王(WASM) を Web Worker 内で動かす。UI スレッドとは USI 文字列でやりとり
let Y=null;
self.onmessage=async e=>{const d=e.data;
 if(d.type==='init'){try{
  importScripts(d.base+'yaneuraou.js');
  Y=await YaneuraOu({locateFile:f=>d.base+f,mainScriptUrlOrBlob:d.base+'yaneuraou.js'});
  Y.FS.mkdir('/eval');for(const n in d.files)Y.FS.writeFile('/eval/'+n,new Uint8Array(d.files[n]));
  Y.addMessageListener(l=>self.postMessage({type:'line',line:l}));
  for(const c of['usi','setoption name EvalDir value /eval','setoption name FV_SCALE value 24','setoption name USI_Hash value '+d.hash,'setoption name Threads value '+d.threads,'setoption name BookFile value no_book','setoption name ConsiderationMode value true','setoption name NetworkDelay value 0','setoption name NetworkDelay2 value 0','setoption name MinimumThinkingTime value 100','isready'])Y.postMessage(c);
  self.postMessage({type:'loaded'});
 }catch(err){self.postMessage({type:'error',message:String(err&&err.message||err)});}}
 else if(d.type==='cmd'&&Y)Y.postMessage(d.cmd);};
