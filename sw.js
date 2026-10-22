// Service worker: guarda só a "casca" do app para abrir rápido e funcionar como app instalado.
// Dados financeiros nunca são guardados aqui; sempre vêm do Supabase com login.
const CACHE = "caixa-v10";
const CASCA = ["./", "index.html", "manifest.webmanifest", "js/config.js", "js/core.js", "js/importar.js", "js/db.js", "js/ui.js", "js/chat.js", "js/admin.js", "js/notif.js", "js/dividas.js", "js/painel.js", "js/sync.js", "icons/icon-192.png", "icons/icon.svg"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CASCA)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return; // Supabase e CDNs vão direto para a rede
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(k => k.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
