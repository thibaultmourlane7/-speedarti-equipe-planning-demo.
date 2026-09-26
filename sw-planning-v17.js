const CACHE='speedarti-equipe-planning-v17';
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./','./index.html','./planning-v17-standard.js','./planning-v17-expert.js','./planning-v17-ultra.js','./planning-v17-contracts.js']))));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
