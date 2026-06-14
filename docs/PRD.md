# OfficePing — Product Requirements & Design Documentation

> Internal office request system with push notifications
> Hackathon submission · Deadline: Monday, June 15, 2026 · 9:00 AM

---

## Table of Contents

1. [Challenge Brief](#1-challenge-brief)
2. [Core Concept](#2-core-concept)
3. [Roles & Permissions](#3-roles--permissions)
4. [Feature Requirements](#4-feature-requirements)
5. [Screen Map](#5-screen-map)
6. [Screen-by-Screen Design Spec](#6-screen-by-screen-design-spec)
   - [User Screens](#user-screens)
   - [Staff Screens](#staff-screens)
   - [Admin Screens](#admin-screens)
7. [Design System](#7-design-system)
8. [Tech Stack Recommendation](#8-tech-stack-recommendation)
9. [Judging Criteria Alignment](#9-judging-criteria-alignment)

---

## 1. Challenge Brief

Build an **internal office request system** — a web portal with PWA/Android/iOS support where office staff receive instant phone notifications the moment a request comes in.

**Example request types:**
- Tea / coffee (including custom orders — milk tea, black coffee, custom sugar level)
- Chanachur makha and other snacks
- Office supplies (A4 paper, stationery)
- Parcel collection from entrance
- Any general assistance

**The core flow:**
```
User creates request → Staff notified instantly on phone → Staff accepts & fulfils → Request completed → User can appreciate staff
```

**Competition rules:**
- Solo participation
- Any tech stack
- AI tools allowed
- Public Git repository
- Self-contained Docker Compose setup (`docker compose up` = fully running app)
- Demo: 5 minutes or less

---

## 2. Core Concept

**OfficePing** — a warm, fast, frictionless internal request tool built for the new office. The signature experience is that a staff member receives an actionable push notification the instant a request is created, and the requester sees a live status update the moment the request is accepted.

**Signature UX elements:**
- **Quick send / saved requests** — users can save any request and re-send it in one tap, eliminating repetitive input (e.g. "Morning tea" every day)
- **Request notes** — requester and staff can send short one-off notes on an active request (e.g. "no sugar please"); each note is delivered as a push notification to the other party and shown as a timeline inside the request card, auto-deleted 24 hours after completion
- **Delay notification** — staff can proactively notify the requester if a request will be late
- **Compliment feed** — after delivery, users can appreciate the staff member; compliments are visible to staff and broadcast as a live feed on the staff home screen

---

## 3. Roles & Permissions

| Role | Description | Access |
|---|---|---|
| **Member** | Regular office employee | Home, New Request, Meals (user-side), track own requests |
| **Staff** | Office staff who fulfil requests | Home (staff view), Requests list, Meals dashboard |
| **Admin / Moderator** | Office admin or manager | Same Home as Member (they are employees too) + Manage page |

**Key notes:**
- Admins and Moderators are also employees — they use the same Home screen as Members for placing their own requests
- Admins do **not** get a separate requests view — that is for Staff only
- Admin/Mod-exclusive access is the **Manage** page only
- Admins and Moderators can create and edit categories, assign staff roles, and view statistics

---

## 4. Feature Requirements

### 4.1 Request System

- Users can create requests with a category, description, optional note, and location
- Staff receive an instant push notification on their phone when a request is created
- Staff can **accept**, **delay** (with a reason sent back to the user), or **cancel** (with a reason) any request
- Once accepted, the requester sees a live "In progress" status update
- Staff mark requests as **done** when complete
- Requester and assigned staff can attach **notes** to an active request after creation (e.g. "forgot to say — no sugar"); each note triggers a push notification to the other party — no live chat connection involved
- Requests are visible to the requester and the assigned staff member only (not other users)
- Admins can see aggregate statistics but not the full request detail after delivery

### 4.2 Saved Requests (Quick Send)

- Users can save any request as a quick request during creation (toggle: "Save as quick request")
- Saved requests appear on the Home screen as one-tap "Send now" cards
- This eliminates repetitive setup for recurring needs (morning tea, standard paper restock, etc.)

### 4.3 Meals

#### Breakfast
- Users confirm whether they will have breakfast at the office each day
- Breakfast is always a **custom order** — users type their specific order (e.g. "Paratha + egg, no chili")
- There is a daily **cutoff time** (e.g. 8:30 AM); after that, the form locks
- If the toggle is off (not having breakfast), no order form is shown — no assumptions are made
- Users can see their breakfast history for the current week

#### Lunch
- Users confirm whether they will be eating lunch at the office that day
- Lunch is a **simple yes/no toggle only** — no custom order, no food selection
- The system assumes a standard lunch will be prepared; staff just need the headcount
- Staff see the full lunch attendance list: who is joining and who is not

### 4.4 Compliments

- After a request is marked done, the requester sees an "Appreciate [staff name]" prompt
- Tapping it sends a compliment visible to the staff member
- Staff see received compliments on their Home screen
- Compliments are shown in a live broadcast feed on the staff side (e.g. "Fahim appreciated Karim for their hard work")

### 4.5 Staff Availability

- Staff can toggle their status between **Online** and **Offline**
- Offline staff do not receive push notifications for new requests
- Admin can see which staff members are currently online

### 4.6 Push Notifications

- Web Push API (VAPID keys) for browser-based push
- Works on Android Chrome natively and iOS 16.4+ when installed to the Home Screen as a PWA (permission must be requested via a user gesture)
- Notifications are **actionable** — staff can accept directly from the notification without opening the app (Android/Chrome only; iOS does not support notification action buttons, so tapping opens the app deep-linked to the request)
- Request notes are delivered via push as well — push is the single delivery channel whether the app is open or closed (when open, the service worker forwards the note to the page instead of showing a notification)
- Sound and vibration on incoming request notifications for staff

### 4.7 Admin / Manage

- View today's statistics: total requests, completion rate, average response time, compliments count
- View requests broken down by category (bar chart)
- View staff performance: requests completed, average response time, online status
- Manage people: view all members, assign or change roles (Member → Staff, Staff → Admin, etc.)
- Add person by email: pre-provisions an account so staff with personal (non-domain) Gmail accounts can sign in with Google; company-domain emails auto-provision on first login without being added
- Manage categories: view, edit, and create request categories
- Moderators have the same Manage access as Admins

---

## 5. Screen Map

```
Member / User
├── Home          — active requests, quick send, recent history
├── New Request   — category chips, order input, location, save toggle
└── Meals         — breakfast toggle + custom order / lunch yes-no toggle

Staff
├── Home          — stats, new incoming requests with actions, compliments feed
├── Requests      — active requests (accept/done/delay) + completed history
└── Meals         — breakfast order list per person + lunch headcount

Admin / Moderator
├── Home          — same as Member (they are employees too)
├── Meals         — same as Member
└── Manage        — stats overview + category chart + staff perf + people management + categories
```

---

## 6. Screen-by-Screen Design Spec

### User Screens

---

#### Home (User)

**Purpose:** Give the user a fast overview of their active request and let them send new or saved requests in one tap.

**Layout:**
- Dark header with greeting ("Good morning, Fahim") and today's date
- Primary CTA: full-width "New request" button at the top of the content area
- **Active** section: shows the current in-progress request card with status badge and notes timeline
  - Gold left-border accent on urgent/active cards
  - Shows who is handling it ("Karim is on it")
  - Inline notes timeline between user and staff with a "Send a note" input
- **Quick send** section: saved request cards with one-tap "Send now" button
- **Recent** section: last completed request with "Appreciate [staff]" prompt if not yet sent

**Interactions:**
- Tapping "New request" → navigates to New Request screen
- Tapping "Send now" on a saved card → confirms and sends without additional input
- Tapping "Appreciate Rafi ↗" → sends a compliment
- Bottom tab bar: Home (active), Meals

---

#### New Request

**Purpose:** Create a new request quickly with minimal friction.

**Layout:**
- Back arrow header ("New request")
- **Category chips** — horizontal scrollable pill row: Tea/coffee, Snacks, Supplies, Parcel, Assistance (tap to select, only one active)
- **What do you need?** — text input, pre-populated if re-ordering
- **Note (optional)** — textarea for extra detail
- **Your location** — text input (e.g. "Room 302", "Meeting room")
- **Save as quick request** toggle — saves this request for one-tap reuse
- Full-width "Send request" CTA

**Interactions:**
- Chip selection is single-select
- Toggling "Save as quick request" on will show this request on the Home quick send section after submission
- Submitting sends the request and notifies staff immediately

---

#### Meals (User)

**Purpose:** Let users confirm their breakfast order and lunch attendance each day.

**Layout:**

**Breakfast section:**
- Section header with today's date
- "Having breakfast at office?" toggle row with cutoff time label (e.g. "Cutoff 8:30 AM")
- When toggle is ON → custom order text input appears: "What will you have?" + "Confirm breakfast" CTA
- When toggle is OFF → no order form is shown; the staff is not notified
- No assumption is made — if not confirmed, staff do not prepare anything

**Lunch section:**
- Divider separating it from breakfast
- Single row: "Eating lunch at office?" toggle
- No order field — staff prepare a standard lunch; they just need the headcount
- Confirmation text shows beneath the toggle: "You're marked as joining lunch today."

**History section:**
- This week's breakfast log (day, order, status: confirmed / not at office)

**Interactions:**
- Breakfast toggle shows/hides the order form dynamically
- "Confirm breakfast" submits the custom order and locks the form until tomorrow
- Lunch toggle is a simple boolean update

---

### Staff Screens

---

#### Home (Staff)

**Purpose:** Give staff a live dashboard of incoming requests and their compliments.

**Layout:**
- Dark header with personal greeting and count of waiting requests
- Online/Offline status indicator in the header (tappable to toggle)
- **Stats row** — 2-column grid: "Completed today" and "Compliments received"
- **New requests** section — incoming request cards with:
  - Gold left-border accent on the most urgent/newest
  - Category icon, request title, requester name, room, time
  - Action buttons: Accept (primary), Delay, Cancel (danger)
- **Compliments** section — live compliment cards from requesters

**Interactions:**
- Accept → moves request to "Active", sends push notification back to requester confirming in progress
- Delay → prompts for a reason/message sent to requester
- Cancel → prompts for a reason sent to requester
- Compliment cards are display only

---

#### Requests (Staff)

**Purpose:** Full management view of active and historical requests.

**Layout:**
- Toggle tabs: Active / History
- **Active tab:**
  - Cards with left-accent for accepted requests (in progress)
  - "Mark done" (green) and "Notify delay" buttons
  - Unaccepted requests show Accept / Cancel
- **History tab (completed today):**
  - Completed request cards showing requester, room, time, and response time
  - Read-only — no actions

**Interactions:**
- "Mark done" marks request complete, triggers compliment prompt on the user side
- "Notify delay" sends a message to the requester
- Toggle between Active and History tabs

---

#### Meals (Staff)

**Purpose:** Staff preparation dashboard showing breakfast orders and lunch headcount.

**Layout:**
- Stats row: "Breakfast today" count and "Lunch today" count
- **Breakfast orders** section:
  - Each person's name and their custom order on a card row
  - Status badge per row: Pending / Preparing / Served
- **Lunch attendance** section:
  - Simple list: person name + "At office" or "Not joining" badge
  - No order details — just headcount

**Interactions:**
- Status badges on breakfast rows are tappable to advance status (Pending → Preparing → Served)

---

### Admin Screens

---

#### Home (Admin)

Identical to the Member/User Home screen. Admins are employees too — they place their own requests, use quick send, and confirm their meals just like anyone else. The only difference is the additional "Manage" tab in the bottom navigation.

---

#### Manage (Admin)

**Purpose:** Full operational oversight — statistics, people, and category management in one place.

**Layout:**

**Overview stats (2×2 grid):**
- Total requests today
- Completion rate (%)
- Average response time
- Total compliments

**By category (bar chart):**
- Horizontal bar per category showing request volume
- Gold fill for top category, muted fills for the rest

**Staff performance:**
- Each staff member: avatar, name, requests completed today, average response time, online/offline status

**People management:**
- List of all users with role badge (Admin / Staff / Member)
- Chevron → tapping opens a role edit sheet

**Categories management:**
- List of active categories with icon, name, and today's request count
- Edit (pencil) icon per row
- "Add category" CTA at the bottom

**Interactions:**
- Tapping a person opens a role management sheet (change role, remove access)
- Tapping a category's edit icon opens an edit sheet (rename, change icon, deactivate)
- "Add category" opens a new category creation form

---

## 7. Design System

### Color Palette

| Token | Hex | Usage |
|---|---|---|
| `--ink` | `#1A1714` | Header backgrounds, primary CTAs, body text |
| `--ink2` | `#3D3830` | Avatars, secondary dark elements |
| `--ink3` | `#7A7369` | Muted labels, secondary text, timestamps |
| `--surface` | `#F7F5F1` | App background (warm off-white) |
| `--surface2` | `#EDE9E3` | Toggle backgrounds, row hover, section fills |
| `--surface3` | `#DDD8CF` | Card borders, dividers |
| `--gold` | `#B07D2E` | Primary accent — active indicators, CTAs |
| `--gold-light` | `#F5E8CC` | Badge backgrounds, icon fills |
| `--green` | `#2D6A4F` | Success states, "Mark done", online dot |
| `--red` | `#9B2335` | Danger/cancel actions |
| `--blue` | `#1B4F8A` | "In progress" / informational state |

### Typography

- Font: system sans-serif (Inter or equivalent)
- Header titles: 15px / weight 500 / `--header-fg`
- Section labels: 10px / weight 500 / uppercase / letter-spacing 0.07em / `--ink3`
- Card titles: 13px / weight 500 / `--ink`
- Card subtitles: 11px / weight 400 / `--ink3`
- Badges: 10px / weight 500

### Component Patterns

**Cards:**
- White (`#FFFFFF`) background on warm surface
- `0.5px` border in `--surface3`
- `12px` border radius
- `12px` padding

**Active/urgent card accent:**
- `2.5px` left border in `--gold`
- Right-side corners only rounded (left-side radius = 0)
- This is the single most recognisable element in the design — it immediately tells staff "this needs action"

**Status badges:**
- Pill shape, `10px` font, colored background + matching dark text
- Pending → gold; In progress → blue; Done → green; Offline/neutral → gray

**CTA buttons:**
- Full-width, `13px`, `12px` padding, `--ink` background, `--surface` text
- Rounded `12px`

**Bottom tab bar:**
- White background, `0.5px` top border
- Active tab: gold icon + gold label
- Inactive: `--ink3`

### Signature Design Element

The **gold left-border accent on urgent cards** is the single thing that makes OfficePing feel distinct. It appears on:
- The user's active in-progress request
- Staff's newest incoming requests that need action

It functions like a physical urgency marker — the eye catches it immediately without any additional badge noise.

---

## 8. Tech Stack Recommendation

> **Note:** The final stack decision lives in the [TRD](./TRD.md) — monorepo with NestJS + PostgreSQL backend and React + Vite frontend. The table below is the original recommendation, kept for reference.

Given the Monday 9AM deadline and Docker Compose requirement:

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Next.js + Tailwind CSS | Single codebase for web + PWA; fast to build |
| Push notifications | Web Push API + `web-push` npm package | Works on Android natively, iOS 16.4+ as PWA |
| Realtime updates | Socket.io | Instant status sync without polling |
| Backend | Node.js + Fastify (or Express) | Lightweight, Docker-friendly |
| Database | PostgreSQL | Reliable, clean Docker Compose setup |
| Auth | Google OAuth (GIS) + backend-issued JWT | Domain emails auto-provision as members; staff personal Gmails pre-added by admin (allowlist); no passwords to manage |
| Containerisation | Docker Compose (app + db + nginx) | Single command startup for reviewers |

**Key technical notes:**
- VAPID keys for push must be pre-generated and baked into the Docker Compose env
- Service Worker registration needed for PWA installability and push
- Push notification payload should include action buttons (Accept) so staff can act from the lock screen
- Socket.io room per request ID for real-time requester ↔ staff status sync

---

## 9. Judging Criteria Alignment

| Criterion | How OfficePing addresses it |
|---|---|
| **Product usefulness** | Solves a real daily problem in the office — tea, snacks, supplies, parcels. Saved requests eliminate repetitive work. Meal confirmation streamlines kitchen planning. |
| **User experience** | Warm, premium feel with gold accents. One-tap quick send. Minimal input friction. Clear status at a glance. |
| **Notification experience** | Actionable push notifications (staff can accept from lock screen). Sound + vibration. Real-time status updates back to requester. |
| **Technical implementation** | Web Push API, Socket.io for live updates, PWA installable on Android and iOS, self-contained Docker Compose. |
| **Architecture** | Clean separation of user/staff/admin roles. Single frontend SPA. Stateless backend. Postgres for persistence. |
| **Creativity** | Compliment feed as a morale layer. Delay notification keeps requesters informed proactively. Saved requests as a personal shortcut system. |

---

*Document generated June 12, 2026*
