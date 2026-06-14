import { io, Socket } from 'socket.io-client';
import { SocketEvents } from '@officeping/shared';

let socket: Socket | null = null;

type ConnectListener = (connected: boolean) => void;
const connectListeners = new Set<ConnectListener>();

type SocketListener = (socket: Socket | null) => void;
const socketListeners = new Set<SocketListener>();

export function onSocketConnectChange(fn: ConnectListener): () => void {
  connectListeners.add(fn);
  return () => connectListeners.delete(fn);
}

/** Subscribe to the socket instance itself — fires when a new socket is created or destroyed. */
export function onSocketChange(fn: SocketListener): () => void {
  socketListeners.add(fn);
  return () => socketListeners.delete(fn);
}

function notifyListeners(connected: boolean) {
  connectListeners.forEach((fn) => fn(connected));
}

export function connectSocket(token: string) {
  if (socket?.connected) socket.disconnect();
  socket = io(import.meta.env.VITE_API_URL || '', {
    auth: { token },
    transports: ['websocket', 'polling'],
  });
  socket.on('connect', () => notifyListeners(true));
  socket.on('disconnect', () => notifyListeners(false));
  socket.on('connect_error', () => notifyListeners(false));
  socketListeners.forEach((fn) => fn(socket));
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  socketListeners.forEach((fn) => fn(null));
}

export function getSocket() {
  return socket;
}

export function subscribeRequest(requestId: string) {
  socket?.emit(SocketEvents.SubscribeRequest, { requestId });
}

export function unsubscribeRequest(requestId: string) {
  socket?.emit(SocketEvents.UnsubscribeRequest, { requestId });
}
