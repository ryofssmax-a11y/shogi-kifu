// オフライン用キャッシュ ＋ クロスオリジン分離(COOP/COEP)ヘッダーの付与
// （GitHub Pages ではヘッダーを設定できないため、coi-serviceworker と同じ方法で SharedArrayBuffer を有効にする）
const V='sk-v8',F=['./','index.html','style.css','shogi.js','vision.js','griddetect.js','app.js','auto.js','recog.js','recog-ui.js','kento.js','taikyoku.js','model/piece-model.json','model/piece-model.bin','manifest.json','icon.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(F)).catch(()=>{}));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x.startsWith('sk-v')&&x!==V).map(x=>caches.delete(x)))));self.clients.claim()});
const withCOI=r=>{if(!r||r.status===0||r.type==='opaque')return r;const h=new Headers(r.headers);h.set('Cross-Origin-Embedder-Policy','require-corp');h.set('Cross-Origin-Opener-Policy','same-origin');h.set('Cross-Origin-Resource-Policy','same-origin');
 return new Response(r.body,{status:r.status,statusText:r.statusText,headers:h});};
self.addEventListener('fetch',e=>{const req=e.request;if(req.method!=='GET'||new URL(req.url).origin!==location.origin)return;
 const noCache=/\/engine\/eval\//.test(req.url); // 評価関数は検討画面で同意後に別のキャッシュへ保存する
 e.respondWith(fetch(req).then(r=>{if(!noCache&&r.ok){const c=r.clone();caches.open(V).then(x=>x.put(req,c));}return withCOI(r);}).catch(async()=>withCOI(await caches.match(req))));});
