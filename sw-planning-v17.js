const CACHE='speedarti-equipe-planning-v192-20260928';
const ASSETS=['./','./index.html','./planning-v17-standard.js','./planning-v17-expert.js','./planning-v17-ultra.js','./planning-v17-contracts.js','./planning-v18-core.js','./planning-v19-gantt.js','./planning-v18-conductor.js','./planning-v18-field.js','./planning-v18-client-transmission-core.js','./planning-v18-client-transmission-ui.js','./planning-v18-ai.js','./planning-v18-contracts.js','./planning-v19-ux-simple.js'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE&&key.startsWith('speedarti-equipe-planning-v')).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  event.respondWith(
    fetch(event.request)
      .then(response=>{
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        return response;
      })
      .catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./index.html')))
  );
});