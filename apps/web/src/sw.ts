/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import type { PushPayload, SwForwardedMessage } from '@officeping/shared';

declare const self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('push', (event) => {
  const payload = event.data?.json() as PushPayload;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // App is open and visible — forward to the page instead of showing OS notification
      const focused = clients.find((c) => c.visibilityState === 'visible');
      if (focused) {
        const msg: SwForwardedMessage = { source: 'officeping-sw', payload };
        focused.postMessage(msg);
        return;
      }

      const isNewRequest = payload.type === 'request:new';

      const options: NotificationOptions = {
        body: payload.body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: payload.requestId ?? payload.type,
        renotify: true,
        vibrate: isNewRequest ? [200, 100, 200, 100, 200] : [150, 75, 150],
        data: { url: payload.url, requestId: payload.requestId, apiBase: payload.apiBase },
        silent: false,
      };

      if (isNewRequest && payload.requestId) {
        options.actions = [
          { action: 'accept', title: '✅ Accept' },
          { action: 'reject', title: '❌ Reject' },
        ];
        options.requireInteraction = true;
      }

      return self.registration.showNotification(payload.title, options);
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data as { url: string; requestId?: string; apiBase?: string };
  const action = event.action;

  if ((action === 'accept' || action === 'reject') && data.requestId && data.apiBase) {
    const status = action === 'accept' ? 'ACCEPTED' : 'CANCELLED';
    const url = `${data.apiBase}/api/requests/${data.requestId}/status`;

    event.waitUntil(
      fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
        credentials: 'include',
      }).catch(() => {
        // If fetch fails (e.g. no auth cookie in SW context), open the request page instead
        return self.clients.openWindow(data.url);
      }),
    );
    return;
  }

  // Default: open or focus the relevant page
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(data.url));
      if (existing) return existing.focus();
      return self.clients.openWindow(data.url);
    }),
  );
});
