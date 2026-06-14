/** Body of POST /push/subscribe — the browser's PushSubscription.toJSON(). */
export interface PushSubscriptionInput {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
}

export type PushType =
  | 'request:new'      // → staff: a new request needs attention
  | 'request:update'   // → requester: status changed (accepted/in_progress/done/delayed/cancelled)
  | 'request:note'     // → other party: a note was added
  | 'compliment:new';  // → staff: someone appreciated you

/**
 * JSON payload of every Web Push message. The service worker either shows it
 * as a notification (app closed) or forwards it to an open window via
 * postMessage as a SwForwardedMessage (app open).
 */
export interface PushPayload {
  type: PushType;
  title: string;
  body: string;
  /** In-app path to open on notification click, e.g. /requests/<id> */
  url: string;
  requestId?: string;
  /** API base URL so the SW can call PATCH /requests/:id/status directly */
  apiBase?: string;
}

/** Shape of messages the service worker posts to open window clients. */
export interface SwForwardedMessage {
  source: 'officeping-sw';
  payload: PushPayload;
}
