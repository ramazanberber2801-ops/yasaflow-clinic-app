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
- Admin password verified by backend

## User Personas
- **Customer (anonymous)**: visits app, browses offers, collects loyalty stamps, books via Timma.
- **Clinic Staff (admin)**: scans customer QRs to award stamps, manages "Aktuelle Tilbud" content.

## Architecture
- Backend: FastAPI + Motor (Mongo), all routes prefixed `/api`
  - `GET/POST/PUT/DELETE /api/offers`
  - `GET /api/loyalty/{device_id}`, `POST /api/loyalty/stamp`, `POST /api/loyalty/reset`
  - `POST /api/admin/login`
  - Auto-seeds default offer "Hydra Skin Deluxe Behandling"
- Frontend: React 19 + React Router 7 + Tailwind + shadcn/ui
  - Pages: Hjem, Bestill (iframe), Gavekort (iframe), Lojalitet, Kontakt, Admin
  - libs: `qrcode.react` (QR display), `html5-qrcode` (QR scan), `sonner` (toasts)
  - Anonymous device id stored in `localStorage` key `seld_device_id`
  - Admin gate uses `sessionStorage` key `seld_admin`

## What's Implemented (Feb 2026)
- [x] Hjem dashboard (hero + 2 action cards + Aktuelle Tilbud with 16:9 promo cards)
- [x] Bestill tab (Timma iframe embed)
- [x] Gavekort route (Timma giftcard iframe)
- [x] Lojalitet tab (10 stamps, milestone visuals at 3/6/10, QR modal)
- [x] Kontakt tab (clinic info card, Ring oss CTA, maps + Instagram links, embedded map)
- [x] Hidden admin (5-tap lock icon in footer → password modal)
- [x] Admin Scan Lojalitetskort (camera + manual modes, success animation, reset at 10/10)
- [x] Admin Administrere Tilbud (full CRUD with image preview)
- [x] Backend tests passing 6/6 + frontend e2e flows verified

## P0 Backlog (Next)
- Token-verified admin API endpoints (currently password gate is frontend + login endpoint only)
- Loyalty history view per customer
- Push/email notifications when customer hits a milestone

## P1 Backlog
- PWA install / offline support
- Image upload to object storage (replace URL paste in admin)
- Multi-language toggle (NO/EN)
- Booking analytics dashboard
