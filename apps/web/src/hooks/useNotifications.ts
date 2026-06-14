import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RequestStatus, SocketEvents, UserRole } from '@officeping/shared';
import type { RequestNewEvent, RequestUpdateEvent, ComplimentNewEvent } from '@officeping/shared';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useRequestStore } from '@/store/requestStore';
import { useSocket } from './useSocket';

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (globalThis.AudioContext === undefined) return null;
  if (!audioCtx) audioCtx = new globalThis.AudioContext();
  return audioCtx;
}

function playTone(frequency: number, durationMs: number, gain = 0.25, type: OscillatorType = 'sine') {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  gainNode.gain.setValueAtTime(gain, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + durationMs / 1000);
}

function soundDing() {
  // Soft single ding — status update for member
  playTone(880, 300, 0.2);
}

function soundAlert() {
  // Two-tone alert — new request for staff
  playTone(660, 150, 0.25);
  setTimeout(() => playTone(880, 200, 0.25), 160);
}

function soundSuccess() {
  // Rising two-note chord — request done
  playTone(523, 200, 0.2);
  setTimeout(() => playTone(783, 300, 0.2), 120);
}

const STATUS_LABEL: Partial<Record<RequestStatus, string>> = {
  [RequestStatus.ACCEPTED]:    'Accepted',
  [RequestStatus.IN_PROGRESS]: 'In progress',
  [RequestStatus.DONE]:        'Done',
  [RequestStatus.CANCELLED]:   'Cancelled',
};

function vibrate(pattern: number[]) {
  if ('vibrate' in navigator) navigator.vibrate(pattern);
}

export function useNotifications() {
  const { user } = useAuthStore();
  const socket = useSocket();
  const { push } = useNotificationStore();
  const { patchRequest, appendNote } = useRequestStore();
  const navigate = useNavigate();

  const isStaff = user?.role === UserRole.STAFF || user?.role === UserRole.ADMIN;

  useEffect(() => {
    if (!socket || !user) return;

    // ── Staff: incoming new request ─────────────────────────────────────────
    function onRequestNew(req: RequestNewEvent) {
      if (!isStaff) return;
      vibrate([100, 50, 100]);
      soundAlert();
      push({
        title: 'New request',
        body: `${req.requester.name}: ${req.description}`,
        icon: req.category?.icon ?? '🔔',
        variant: 'warning',
        actionLabel: 'View',
        onAction: () => navigate(`/requests/${req.id}`),
        durationMs: 6000,
      });
    }

    // ── Member: their request was updated ───────────────────────────────────
    function onRequestUpdate(event: RequestUpdateEvent) {
      // Always patch the store so the UI reflects the new state
      patchRequest(event.requestId, {
        status: event.status,
        staff: event.staff ?? undefined,
        delayReason: event.delayReason,
        cancelReason: event.cancelReason,
      });

      // Only show toast to the member (staff sees their own action, no need to notify)
      if (isStaff) return;

      const label = STATUS_LABEL[event.status];
      if (!label) return;

      let icon = '📋'; let variant: 'default' | 'success' | 'warning' | 'info' = 'info';
      if (event.status === RequestStatus.ACCEPTED)    { icon = '✅'; variant = 'success'; }
      if (event.status === RequestStatus.IN_PROGRESS) { icon = '⚡'; variant = 'info'; }
      if (event.status === RequestStatus.DONE)        { icon = '🎉'; variant = 'success'; }
      if (event.status === RequestStatus.CANCELLED)   { icon = '❌'; variant = 'warning'; }

      vibrate([80, 40, 80]);
      if (event.status === RequestStatus.DONE) soundSuccess();
      else soundDing();
      push({
        title: `Request ${label.toLowerCase()}`,
        body: event.staff ? `by ${event.staff.name}` : undefined,
        icon,
        variant,
        actionLabel: 'View',
        onAction: () => navigate(`/requests/${event.requestId}`),
        durationMs: 5000,
      });
    }

    // ── Staff: someone left a note ──────────────────────────────────────────
    function onRequestUpdateNote(event: RequestUpdateEvent) {
      if (!event.notes?.length) return;
      const latest = event.notes[event.notes.length - 1];
      if (!latest || latest.author.id === user?.id) return; // don't notify yourself

      appendNote(event.requestId, latest);
      push({
        title: `Note from ${latest.author.name}`,
        body: latest.message,
        icon: '💬',
        variant: 'default',
        actionLabel: 'View',
        onAction: () => navigate(`/requests/${event.requestId}`),
        durationMs: 5000,
      });
    }

    // ── Staff: compliment received ──────────────────────────────────────────
    function onComplimentNew(c: ComplimentNewEvent) {
      if (!isStaff) return;
      vibrate([200]);
      push({
        title: '⭐ You got a compliment!',
        body: c.message,
        icon: '🌟',
        variant: 'success',
        durationMs: 7000,
      });
    }

    socket.on(SocketEvents.RequestNew, onRequestNew);
    socket.on(SocketEvents.RequestUpdate, onRequestUpdate);
    socket.on(SocketEvents.RequestUpdate, onRequestUpdateNote);
    socket.on(SocketEvents.ComplimentNew, onComplimentNew);

    return () => {
      socket.off(SocketEvents.RequestNew, onRequestNew);
      socket.off(SocketEvents.RequestUpdate, onRequestUpdate);
      socket.off(SocketEvents.RequestUpdate, onRequestUpdateNote);
      socket.off(SocketEvents.ComplimentNew, onComplimentNew);
    };
  }, [socket, user?.id, isStaff]);
}
