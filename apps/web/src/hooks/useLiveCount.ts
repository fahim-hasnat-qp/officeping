import { useEffect } from 'react';
import { RequestStatus, SocketEvents, UserRole } from '@officeping/shared';
import { getRequests } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useRequestStore } from '@/store/requestStore';
import { useSocket } from './useSocket';

const MEMBER_LIVE = [RequestStatus.PENDING, RequestStatus.ACCEPTED, RequestStatus.IN_PROGRESS].join(',');
const STAFF_LIVE = [RequestStatus.ACCEPTED, RequestStatus.IN_PROGRESS].join(',');

/**
 * Runs once at the app level. Loads the initial live/pending count and keeps
 * it up-to-date via socket so every TabBar badge stays accurate regardless of
 * which page is mounted.
 */
export function useLiveCount() {
  const { user } = useAuthStore();
  const { setLiveCount } = useRequestStore();
  const socket = useSocket();

  const isStaff = user?.role === UserRole.STAFF || user?.role === UserRole.ADMIN;

  useEffect(() => {
    if (!user) return;
    const status = isStaff ? STAFF_LIVE : MEMBER_LIVE;
    getRequests({ status, limit: 100 })
      .then((res) => setLiveCount(res.length))
      .catch(() => {});
  }, [user?.id, isStaff]);

  useEffect(() => {
    if (!user || !socket) return;

    const refresh = () => {
      const status = isStaff ? STAFF_LIVE : MEMBER_LIVE;
      getRequests({ status, limit: 100 })
        .then((res) => setLiveCount(res.length))
        .catch(() => {});
    };

    socket.on(SocketEvents.RequestNew, refresh);
    socket.on(SocketEvents.RequestUpdate, refresh);
    return () => {
      socket.off(SocketEvents.RequestNew, refresh);
      socket.off(SocketEvents.RequestUpdate, refresh);
    };
  }, [user?.id, socket, isStaff]);
}
