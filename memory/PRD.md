# Seldaesthetic — PRD

## Original Problem Statement
Premium, minimalist web app for **Seldaesthetic** (Norwegian luxury aesthetic clinic).
Soft beige / cream + gold theme. Cormorant Garamond serif headings + Manrope sans body.
4-tab bottom nav: Hjem · Bestill · Lojalitet · Kontakt.
Critical features:
1. Aktuelle Tilbud — promo cards (16:9), dynamic, admin-editable
2. Digital loyalty stamp card (10 stamps; milestones 3→10%, 6→20%, 10→Gratis peel) with QR-modal using anonymous localStorage device id
3. Hidden admin panel — 5 taps on tiny lock in footer, password-protected (`selda123`), with QR scanner (camera + manual) and offers CRUD

## User Choices
- MongoDB backend (synchronised across devices)
- html5-qrcode camera + manual fallback for stamp scanning
- Bestill tab → iframe `https://bestill.timma.no/seldaesthetic`
- Kjøp Gavekort → iframe `https://bestill.timma.no/giftcard/seldaesthetic`
- Admin password verified by backend (JWT issued)
- Image upload to Emergent object storage
- PWA installable + offline shell caching

## User Personas
- **Customer (anonymous)**: visits app, browses offers, collects loyalty stamps, books via Timma, can install to home screen.
- **Clinic Staff (admin)**: logs in (JWT), scans customer QRs to award stamps, manages offers with direct image upload, reviews each customer's loyalty history.

## Architecture
- Backend: FastAPI + Motor (Mongo) + PyJWT, all routes prefixed `/api`
  - Public: `GET /offers`, `GET /loyalty/{device_id}`, `POST /admin/login`, `GET /files/{path}`
  - **Bearer-protected** (`require_admin` dep): `POST/PUT/DELETE /offers`, `POST /loyalty/stamp`, `POST /loyalty/reset`, `GET /admin/loyalty`, `GET /admin/loyalty/{id}/history`, `POST /upload`, `GET /admin/verify`
  - Logs every loyalty event (stamp/reset + milestone) in `loyalty_events` collection
  - Stamp response includes `milestone` field (`"10%"`, `"20%"`, `"Gratis peel"`, or `null`)
  - Auto-seeds default offer at startup, initializes Emergent object storage session
- Frontend: React 19 + React Router 7 + Tailwind + shadcn/ui
  - Pages: Hjem, Bestill (iframe), Gavekort (iframe), Lojalitet, Kontakt, Admin (3 tabs: Scan / Tilbud / Historikk)
  - Axios interceptor injects Bearer token; 401 clears session
  - ImageUploader: drag-style button, file picker, 8MB cap, mobile camera capture, JPG/PNG/WEBP, URL fallback toggle
  - Customer milestone celebration: previous-stamps tracked in sessionStorage, toast + haptic vibrate on transition to 3/6/10
  - PWA: `/manifest.json`, `/service-worker.js` (network-first nav, stale-while-revalidate assets), `InstallPrompt` banner using `beforeinstallprompt`

## Implementation Log
### Feb 2026 — v1 MVP
- 4-tab bottom nav (Hjem / Bestill / Lojalitet / Kontakt), Timma iframes, 10-stamp card with QR modal, 5-tap admin entry, password-protected admin with Scan + Offers CRUD
- Testing: 6/6 backend, all critical frontend flows ✅

### Feb 2026 — v1.1 Production Hardening
- ✅ Bearer JWT auth on all admin write endpoints (12-hour expiry, HS256)
- ✅ Image upload via Emergent object storage (`/api/upload` + `/api/files/{path}`)
- ✅ Loyalty history per customer + 3rd admin tab "Historikk" with search & detail view
- ✅ Customer milestone celebration toasts (stamps 3 → 10%, 6 → 20%, 10 → Gratis peel)
- ✅ PWA: manifest, service worker, install prompt, app icons (192/512 SVG)
- Testing: 12/12 backend, 100% frontend critical flows ✅

## Backlog
**P0**
- Convert FastAPI lifecycle events from `@on_event` → `lifespan` context manager
- Cache headers on `/api/files/{path}` (immutable UUID paths)
- Atomic stamp update via `find_one_and_update` with `stamps < 10` filter

**P1**
- Server-side push notifications (Web Push API) for milestone events
- Multi-language toggle (NO / EN)
- Booking & loyalty analytics dashboard in admin
- Admin user management (multiple staff accounts, audit log)
