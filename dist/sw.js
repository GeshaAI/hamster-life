const CACHE='hamster-life-0.4.2';
const ASSETS=['./','./index.html','./style.css','./js/model.js','./js/layout.js','./js/save.js','./js/homes.js','./js/renderer.js','./js/model3d.js','./js/geometry3d.js','./js/habitat3d.js','./js/hamster3d.js','./assets/hamster.glb','./js/app.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('hamster-life-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));});
