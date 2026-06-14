export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function registerPush(): Promise<boolean> {
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  console.log('[Push] registerPush called', {
    vapidKey: vapidKey ? `${vapidKey.slice(0, 10)}…` : 'MISSING',
    supported: isPushSupported(),
    permission: 'Notification' in window ? Notification.permission : 'API unavailable',
    swAvailable: 'serviceWorker' in navigator,
  });

  if (!vapidKey) { console.warn('[Push] VITE_VAPID_PUBLIC_KEY is not set'); return false; }
  if (!isPushSupported()) { console.warn('[Push] Push not supported in this browser'); return false; }
  if (Notification.permission === 'denied') { console.warn('[Push] Notification permission denied'); return false; }

  if (Notification.permission !== 'granted') {
    console.log('[Push] Requesting notification permission…');
    const perm = await Notification.requestPermission();
    console.log('[Push] Permission result:', perm);
    if (perm !== 'granted') return false;
  }

  console.log('[Push] Waiting for service worker…');
  const reg = await navigator.serviceWorker.ready;
  console.log('[Push] SW ready, active:', reg.active?.state);

  let sub: PushSubscription;
  try {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  } catch (err) {
    console.error('[Push] pushManager.subscribe failed:', err);
    // If existing sub has a different key, unsubscribe and retry once
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      console.log('[Push] Stale subscription found, unsubscribing and retrying…');
      await existing.unsubscribe();
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    } else {
      throw err;
    }
  }
  console.log('[Push] Subscribed, endpoint:', sub.endpoint.slice(0, 60) + '…');

  const { subscribePush } = await import('./api');
  await subscribePush(sub.toJSON() as import('@officeping/shared').PushSubscriptionInput);
  console.log('[Push] Subscription saved to backend ✓');
  return true;
}
