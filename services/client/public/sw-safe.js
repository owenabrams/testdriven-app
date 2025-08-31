/**
 * Safe Service Worker - Production Ready
 * 
 * This service worker is designed to never break the app.
 * It provides progressive enhancement - if it fails, the app continues working.
 */

// Configuration
const CACHE_NAME = 'testdriven-v1';  // Always define variables!
const STATIC_CACHE_NAME = `${CACHE_NAME}-static`;
const API_CACHE_NAME = `${CACHE_NAME}-api`;

// Assets to cache
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Safe execution wrapper
function safeExecute(fn, fallback = null) {
  try {
    return fn();
  } catch (error) {
    console.error('[SW Error]', error);
    return fallback;
  }
}

// Safe async execution wrapper
async function safeExecuteAsync(fn, fallback = null) {
  try {
    return await fn();
  } catch (error) {
    console.error('[SW Async Error]', error);
    return fallback;
  }
}

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    safeExecuteAsync(async () => {
      const cache = await caches.open(STATIC_CACHE_NAME);
      await cache.addAll(STATIC_ASSETS);
      console.log('[SW] Static assets cached');
      await self.skipWaiting();
    })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    safeExecuteAsync(async () => {
      // Clean old caches
      const cacheNames = await caches.keys();
      const oldCaches = cacheNames.filter(name => 
        name.startsWith('testdriven-') && 
        name !== STATIC_CACHE_NAME && 
        name !== API_CACHE_NAME
      );
      
      await Promise.all(oldCaches.map(name => caches.delete(name)));
      await self.clients.claim();
      console.log('[SW] Activated and claimed clients');
    })
  );
});

// Fetch event - the critical part that must not break
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip non-HTTP requests
  if (!event.request.url.startsWith('http')) {
    return;
  }
  
  event.respondWith(
    safeExecuteAsync(
      () => handleFetch(event.request),
      // Fallback: always try network if our handler fails
      fetch(event.request)
    )
  );
});

// Safe fetch handler
async function handleFetch(request) {
  const url = new URL(request.url);
  
  // Handle API requests (network first)
  if (url.pathname.includes('/api/') || url.pathname.includes('/users')) {
    return await handleApiRequest(request);
  }
  
  // Handle static assets (cache first)
  return await handleStaticRequest(request);
}

// API request handler (network first)
async function handleApiRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, networkResponse.clone()).catch(err => {
        console.warn('[SW] Failed to cache API response:', err);
      });
    }
    
    return networkResponse;
    
  } catch (networkError) {
    console.log('[SW] Network failed, trying cache for:', request.url);
    
    // Fallback to cache
    const cache = await caches.open(API_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Serving API from cache:', request.url);
      return cachedResponse;
    }
    
    // No cache available, throw the network error
    throw networkError;
  }
}

// Static request handler (cache first)
async function handleStaticRequest(request) {
  try {
    // Try cache first
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache the response
      cache.put(request, networkResponse.clone()).catch(err => {
        console.warn('[SW] Failed to cache static asset:', err);
      });
    }
    
    return networkResponse;
    
  } catch (error) {
    console.error('[SW] Failed to handle static request:', error);
    
    // For navigation requests, return a basic offline page
    if (request.mode === 'navigate') {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Offline - TestDriven App</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 50px; 
              background: #f5f5f5; 
            }
            .offline-message { 
              background: white; 
              padding: 30px; 
              border-radius: 8px; 
              box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
              max-width: 400px; 
              margin: 0 auto; 
            }
            button { 
              background: #007bff; 
              color: white; 
              border: none; 
              padding: 10px 20px; 
              border-radius: 4px; 
              cursor: pointer; 
              margin-top: 20px; 
            }
          </style>
        </head>
        <body>
          <div class="offline-message">
            <h1>📱 You're Offline</h1>
            <p>TestDriven App is not available right now.</p>
            <p>Please check your internet connection and try again.</p>
            <button onclick="location.reload()">Try Again</button>
          </div>
        </body>
        </html>
      `, {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // For other requests, throw the error
    throw error;
  }
}

// Error handling
self.addEventListener('error', (event) => {
  console.error('[SW] Global error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled rejection:', event.reason);
  event.preventDefault();
});

// Message handling
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service worker loaded successfully');
