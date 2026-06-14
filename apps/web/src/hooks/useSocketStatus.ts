import { useEffect, useState } from 'react';
import { getSocket, onSocketConnectChange } from '@/lib/socket';

export function useSocketStatus(): boolean {
  const [connected, setConnected] = useState(() => getSocket()?.connected ?? false);

  useEffect(() => {
    setConnected(getSocket()?.connected ?? false);
    return onSocketConnectChange(setConnected);
  }, []);

  return connected;
}
