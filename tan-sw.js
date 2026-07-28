const CACHE = 'tan-v3';
const ASSETS = [
  '/tan-app/',
  '/tan-app/index.html',
  '/tan-app/manifest.json',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// 安装：预缓存核心资源，跳过等待尽快激活
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(()=>{})
  );
  self.skipWaiting();
});

// 激活：删除所有非 v3 的旧缓存（包括 v1/v2/其他），立即接管
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => {
        console.log('[SW] 删除旧缓存:', k);
        return caches.delete(k);
      }))
    ).then(() => self.clients.claim())
  );
});

// 请求拦截：network-first，永远优先用最新代码，离线才回退缓存
self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  // 只拦截同源请求和 CDN
  const url = new URL(e.request.url);
  if(url.origin !== self.location.origin && url.origin !== 'https://cdn.jsdelivr.net') return;

  e.respondWith(
    fetch(e.request).then(resp => {
      if(resp.ok && resp.status === 200){
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return resp;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('/tan-app/')))
  );
});
