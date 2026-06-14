/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import type { PushPayload, SwForwardedMessage } from '@officeping/shared';

declare const self: ServiceWorkerGlobalScope & { __token?: string };

// Receive auth token from the page so we can use it in background fetches
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SET_TOKEN') {
    self.__token = event.data.token as string;
  }
});

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('push', (event) => {
  const payload = event.data?.json() as PushPayload;
  console.log('[SW] push received', payload);

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      console.log('[SW] clients:', clients.map(c => ({ url: c.url, focused: c.focused, visibility: c.visibilityState })));

      // Always forward to any visible page so in-app toast fires
      const visible = clients.find((c) => c.visibilityState === 'visible');
      if (visible) {
        console.log('[SW] forwarding to visible page');
        const msg: SwForwardedMessage = { source: 'officeping-sw', payload };
        visible.postMessage(msg);
      }

      // Always show OS notification regardless — let the OS deduplicate if app is foreground
      console.log('[SW] showing OS notification');
      const isNewRequest = payload.type === 'request:new';

      const options: NotificationOptions = {
        body: payload.body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: payload.requestId ?? payload.type,
        renotify: true,
        vibrate: isNewRequest ? [200, 100, 200, 100, 200] : [150, 75, 150],
        data: { url: payload.url, fullUrl: payload.fullUrl, requestId: payload.requestId, apiBase: payload.apiBase },
        silent: false,
      };

      if (isNewRequest && payload.requestId) {
        options.actions = [
          { action: 'accept', title: '✅ Accept' },
          { action: 'reject', title: '❌ Reject' },
        ];
        options.requireInteraction = true;
      }

      return self.registration.showNotification(payload.title, options)
        .then(() => console.log('[SW] showNotification called successfully'))
        .catch((err) => console.error('[SW] showNotification failed:', err));
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data as { url: string; fullUrl?: string; requestId?: string; apiBase?: string };
  const action = event.action;

  // For accept/reject actions, open the request page — user can act from there
  if ((action === 'accept' || action === 'reject') && data.fullUrl) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        const existing = clients.find((c) => c.url.includes(data.requestId ?? ''));
        if (existing) return existing.focus();
        return self.clients.openWindow(data.fullUrl);
      }),
    );
    return;
  }

  // Default: open or focus the relevant page
  const targetUrl = data.fullUrl ?? data.url;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(data.requestId ?? data.url));
      if (existing) return existing.focus();
      return self.clients.openWindow(targetUrl);
    }),
  );
});
