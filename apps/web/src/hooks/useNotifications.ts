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

async function resumeCtx(): Promise<AudioContext | null> {
  const ctx = getAudioCtx();
  if (!ctx) return null;
  if (ctx.state === 'suspended') await ctx.resume();
  return ctx;
}

function playTone(ctx: AudioContext, frequency: number, startAt: number, durationMs: number, gain = 0.6, type: OscillatorType = 'sine') {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startAt);
  gainNode.gain.setValueAtTime(gain, startAt);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startAt + durationMs / 1000);
  osc.start(startAt);
  osc.stop(startAt + durationMs / 1000);
}

async function soundAlarm() {
  // Loud repeating alarm — new request for staff
  const ctx = await resumeCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const seq = [880, 1100, 880, 1100, 880, 1100];
  seq.forEach((freq, i) => {
    playTone(ctx, freq, t + i * 0.18, 160, 0.8, 'square');
  });
}

async function soundDing() {
  const ctx = await resumeCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  playTone(ctx, 880, t, 300, 0.5);
}

async function soundSuccess() {
  const ctx = await resumeCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  playTone(ctx, 523, t, 200, 0.5);
  playTone(ctx, 783, t + 0.13, 300, 0.5);
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

// Unlock AudioContext on first user gesture so sounds work on mobile
function unlockAudio() {
  const ctx = getAudioCtx();
  if (ctx?.state === 'suspended') ctx.resume().catch(() => null);
  document.removeEventListener('touchstart', unlockAudio);
  document.removeEventListener('click', unlockAudio);
}
document.addEventListener('touchstart', unlockAudio, { passive: true });
document.addEventListener('click', unlockAudio);

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
      vibrate([300, 100, 300, 100, 300, 100, 300]);
      soundAlarm();
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
      vibrate([100, 50, 100]);
      soundDing();
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
