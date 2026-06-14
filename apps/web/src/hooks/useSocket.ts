import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { getSocket, onSocketChange } from '@/lib/socket';

/** Returns the current socket instance, updating whenever it's (re)created. */
export function useSocket(): Socket | null {
  const [sock, setSock] = useState<Socket | null>(() => getSocket());

  useEffect(() => {
    // Sync immediately in case socket was created between render and effect
    setSock(getSocket());
    return onSocketChange(setSock);
  }, []);

  return sock;
}
