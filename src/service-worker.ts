// Disables access to DOM typings like `HTMLElement` which are not available
// inside a service worker and instantiates the correct globals
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// Ensures that the `$service-worker` import has proper type definitions
/// <reference types="@sveltejs/kit" />

// Only necessary if you have an import from `$env/static/public`
/// <reference types="../.svelte-kit/ambient.d.ts" />

import { build, files, version } from '$service-worker';

// This gives `self` the correct types
const self = globalThis.self as unknown as ServiceWorkerGlobalScope;

// Create a unique cache name for this deployment
const CACHE = `cache-${version}`;

const ASSETS = [
  ...build, // the app itself
  ...files  // everything in `static`
];

self.addEventListener('install', (event) => {
  // Create a new cache and add all files to it
  async function addFilesToCache() {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
  }

  event.waitUntil(addFilesToCache());
});

self.addEventListener('activate', (event) => {
  // Remove previous cached data from disk
  async function deleteOldCaches() {
    for (const key of await caches.keys()) {
      if (key !== CACHE) await caches.delete(key);
    }
  }

  event.waitUntil(deleteOldCaches());
});

self.addEventListener('fetch', (event) => {
  // ignore POST requests etc
  if (event.request.method !== 'GET') return;

  async function respond() {
    const url = new URL(event.request.url);
    const cache = await caches.open(CACHE);

    // `build`/`files` can always be served from the cache
    if (ASSETS.includes(url.pathname)) {
      const response = await cache.match(url.pathname);

      if (response) {
        return response;
      }
    }

    const invalidated = url.searchParams.get('x-sveltekit-invalidated');
    if (url.pathname.endsWith('__data.json') && invalidated) {
      // Block specific invalidated values
      if (['01', '10', '11'].includes(invalidated)) {

        return new Response(JSON.stringify({
          "type": "data",
          "nodes": [
            {
              "type": "skip"
            },
            {
              "type": "data",
              "data": [{
                "x": -1
              }],
              "uses": {}
            }
          ]
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',

          }
        });
      }
    }

    // Handle navigation requests (HTML pages) - DO NOT CACHE THEM
    if (event.request.destination === 'document') {
      try {
        const response = await fetch(event.request);

        if (!(response instanceof Response)) {
          throw new Error('invalid response from fetch');
        }

        // Return the response WITHOUT caching it
        return response;
      } catch {
        // Network failed for navigation - serve the app shell if available
        const appShell = await cache.match('/');
        if (appShell) {
          return appShell;
        }

        // If no app shell available, show offline message
        return new Response(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Offline</title>
              <meta charset="utf-8">
            </head>
            <body>
              <h1>You're offline</h1>
              <p>This page is not available offline. Please check your connection.</p>
            </body>
          </html>
        `, {
          status: 503,
          headers: {
            'Content-Type': 'text/html',
          }
        });
      }
    }

    // for everything else, try the network first, but
    // fall back to the cache if we're offline
    try {
      const response = await fetch(event.request);

      // if we're offline, fetch can return a value that is not a Response
      // instead of throwing - and we can't pass this non-Response to respondWith
      if (!(response instanceof Response)) {
        throw new Error('invalid response from fetch');
      }

      if (response.status === 200 && (url.protocol === 'http:' || url.protocol === 'https:')) {
        cache.put(event.request, response.clone());
      }

      return response;
    } catch (err) {
      const response = await cache.match(event.request);

      if (response) {
        return response;
      }

      // if there's no cache, then just error out
      // as there is nothing we can do to respond to this request
      throw err;
    }
  }

  event.respondWith(respond());
});