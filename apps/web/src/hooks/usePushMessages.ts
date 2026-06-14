import { useEffect } from 'react';
import type { SwForwardedMessage } from '@officeping/shared';
import { useRequestStore } from '@/store/requestStore';

export function usePushMessages() {
  const { patchRequest } = useRequestStore();

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handler = (event: MessageEvent) => {
      const data = event.data as SwForwardedMessage | undefined;
      if (data?.source !== 'officeping-sw') return;

      const { payload } = data;
      if (payload.requestId && (payload.type === 'request:update' || payload.type === 'request:note')) {
        patchRequest(payload.requestId, {});
      }
    };

    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [patchRequest]);
}
