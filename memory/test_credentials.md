# Test Credentials

## Admin Panel
- **URL**: Open app → tap small lock icon in footer 5 times → enter password
- **Password**: `selda123`
- **Path**: `/admin` (only accessible after login, session-stored via sessionStorage key `seld_admin`)

## Notes
- Loyalty cards use anonymous `localStorage` device id (key: `seld_device_id`) - no login required for customers
- Backend env override available via `ADMIN_PASSWORD` env variable
- API endpoints (all prefixed with `/api`):
  - GET `/offers`, POST `/offers`, PUT `/offers/{id}`, DELETE `/offers/{id}`
  - GET `/loyalty/{device_id}`, POST `/loyalty/stamp`, POST `/loyalty/reset`
  - POST `/admin/login` (body: `{password: "selda123"}`)
