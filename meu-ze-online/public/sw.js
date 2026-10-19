/* Only cache app icons; never cache accounts, chat, feed or API data. */
const ICON_CACHE='meu-ze-icons-v1';
const ICONS=['/icon-192.png?v=dino1','/icon-512.png?v=dino1','/apple-touch-icon.png?v=dino1'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(ICON_CACHE).then(cache=>cache.addAll(ICONS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('meu-ze-icons-')&&k!==ICON_CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||event.request.mode==='navigate')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin||!/^\/(icon-192|icon-512|apple-touch-icon)\.png$/.test(url.pathname))return;
  event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(ICON_CACHE).then(cache=>cache.put(event.request,copy));}
    return response;
  })));
});
