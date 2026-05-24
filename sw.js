/**
 * Service Worker - Control de Maquinaria Pajarita
 * © Copyright Vibras Positivas. Todos los derechos reservados.
 */

const CACHE_NAME = 'pajarita-control-cache-v1';
const ASSETS = [
    'index.html',
    'styles.css',
    'app.js',
    'manifest.json',
    'icon.png'
];

// Instalación e inyección de archivos estáticos en caché
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('SW: Archivos cacheados con éxito');
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

// Activación y limpieza de cachés antiguas
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Estrategia de red: Cache First, Fallback to Network (Ideal para zonas rurales sin señal)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).catch(() => {
                // Si falla la red y no está en caché, maneja el error silenciosamente
                console.log('SW: Recurso no encontrado en caché ni disponible en red offline.');
            });
        })
    );
});
