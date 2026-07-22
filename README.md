# Yasaflow Clinic

Yasaflow Clinic is the clinic module in the wider Yasaflow platform. This repository contains the customer-facing clinic application and clinic administration experience. Platform-wide architecture and the other Yasaflow modules are documented in the main `yasaflow-platform` repository.

## Included functionality

- Tenant-aware clinic configuration
- Customer profiles and authentication
- Booking and gift-card links
- Loyalty campaigns, stamps and rewards
- Campaigns and notifications
- Web push subscriptions
- Configurable clinic information and About content
- Clinic-specific logo and About images
- Feature toggles for booking, gift cards, campaigns, loyalty and push notifications

## Technology

- React 18 and React Router
- Supabase Auth, Postgres, Row Level Security and Storage
- Vercel deployments
- Tailwind CSS and Radix UI components

## Repository structure

```text
frontend/                 React application
supabase/                 Database and backend configuration when present
README.md                 Clinic-module documentation
```

## Local development

The frontend is located in `frontend`.

```bash
cd frontend
yarn install
yarn start
```

Create a local environment file using the variables configured for the deployment. The application expects a Supabase URL and a browser-safe Supabase publishable or anon key. Never place a Supabase service-role or secret key in frontend environment variables.

Common runtime configuration includes:

```text
REACT_APP_SUPABASE_URL
REACT_APP_SUPABASE_ANON_KEY
REACT_APP_DEFAULT_CLINIC_ID
REACT_APP_DEFAULT_CLINIC_SLUG
REACT_APP_CLINIC_QUERY_PARAM
REACT_APP_SETTINGS_RECORD_KEY
```

Only the variables actually referenced by the current frontend build need to be configured. Production clinic resolution normally uses the request hostname; local and preview environments may use the configured default clinic or the clinic query parameter.

## Clinic and tenant model

`clinics` is the top-level tenant table. Tenant-owned records include a `clinic_id`, and clinic membership is stored in `clinic_members`.

A clinic administrator should only manage records belonging to clinics where that user has an active owner or administrator membership. Customer-facing reads are resolved using the current clinic before data is requested.

To add a clinic:

1. Create a row in `clinics` with a unique slug and optional primary domain.
2. Add the clinic owner or administrator to `clinic_members`.
3. Create or save the clinic's `clinic_settings` record.
4. Configure the deployment domain so it resolves to the correct clinic.
5. Upload clinic branding assets from the clinic settings page.

## Clinic settings

The clinic settings page controls:

- Clinic name and subtitle
- Contact information and opening hours
- Booking and gift-card availability
- Campaign, loyalty and push-notification availability
- About title, description and information cards
- Website and social links
- Clinic logo
- About hero and secondary images

Branding assets are stored in the public `clinic-assets` Supabase Storage bucket under a clinic-specific folder. Upload, replacement and deletion remain restricted by Storage RLS policies to administrators of that clinic.

## Supabase

Apply committed migrations in order and review Supabase security advisors after schema, function, RLS or Storage changes.

Important security expectations:

- All tenant-owned tables must enforce clinic isolation.
- Public frontend code must use only browser-safe publishable or anon keys.
- Privileged keys must never be committed or exposed to the browser.
- Storage uploads require explicit `INSERT`, `SELECT` and `UPDATE` policies when files are replaced with upsert.
- `SECURITY DEFINER` functions require explicit review, restricted execution and internal authorization checks.

## Deployment

The frontend is deployed through Vercel and connected to this GitHub repository. Configure production and preview environment variables in Vercel, then deploy from the relevant branch or commit.

After deployment, verify:

- The correct clinic resolves for the hostname.
- Public clinic settings load without authentication.
- Admin settings are protected.
- Tenant data cannot be read or changed from another clinic.
- Disabled features are hidden and their routes are protected.
- Uploaded branding assets display correctly.

## Wider Yasaflow documentation

This README intentionally documents only Yasaflow Clinic. For the complete Yasaflow platform, shared services and other modules, use the documentation in the `yasaflow-platform` repository.
