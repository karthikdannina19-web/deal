# Location Visibility System

## Overview

This implementation adds a normalized, location-aware visibility system for:

- Vendors
- Ads
- Banners

The system now uses:

- normalized master location collections
- user GPS resolution into internal location IDs
- backend-only visibility filtering
- admin-controlled visibility targeting
- reusable location and visibility services

Frontend clients must never apply their own geo-targeting filters. The backend is the source of truth.

## Implemented Architecture

### Master Data

Collections:

- `states`
- `districts`
- `mandals`

Relationships:

- `State -> District -> Mandal`

Seed behavior:

- On first access, the master tables are auto-seeded from [`utils/locationData.js`](/abs/path/c:/KARTHIKDCMOON/rhock/utils/locationData.js)
- Existing environments do not need a separate migration script to start using the collections

### Core Services

- [`services/location-master.service.js`](/abs/path/c:/KARTHIKDCMOON/rhock/services/location-master.service.js)
  Handles seeding, cached tree loading, name-to-ID mapping, hierarchy validation, and legacy location syncing.

- [`services/location-resolver.service.js`](/abs/path/c:/KARTHIKDCMOON/rhock/services/location-resolver.service.js)
  Provider abstraction for reverse geocoding. Current provider is `nominatim`, selected by `GEO_PROVIDER`.

- [`services/visibility.service.js`](/abs/path/c:/KARTHIKDCMOON/rhock/services/visibility.service.js)
  Central validation and reusable MongoDB visibility matching logic.

- [`services/home-feed.service.js`](/abs/path/c:/KARTHIKDCMOON/rhock/services/home-feed.service.js)
  Central home feed aggregator for vendors, ads, and banners.

## Data Model Changes

### User

Added:

- `stateId`
- `districtId`
- `mandalId`
- `latitude`
- `longitude`
- `locationUpdatedAt`
- nested `location.stateId`
- nested `location.districtId`
- nested `location.mandalId`
- nested `location.mandal`
- nested `location.provider`

Used for:

- current resolved user location
- feed visibility filtering
- stale location detection

### Vendor

Added:

- `storeStateId`
- `storeDistrictId`
- `storeMandalId`
- `visibilityLevel`
- `visibilityStateId`
- `visibilityDistrictId`
- `visibilityMandalId`
- `visibilityEnabled`

Used for:

- store ownership hierarchy
- admin approval targeting
- home-feed visibility

### Ad

Added:

- `visibilityLevel`
- `visibilityStateId`
- `visibilityDistrictId`
- `visibilityMandalId`
- `visibilityEnabled`

Used for:

- ad moderation targeting
- feed filtering

### Banner

Added:

- `visibilityLevel`
- `visibilityStateId`
- `visibilityDistrictId`
- `visibilityMandalId`
- `visibilityEnabled`

Used for:

- admin-managed manual banner targeting

## Visibility Rules

### Supported Levels

- `state`
- `district`
- `mandal`

### Matching Logic

If `visibilityLevel = state`:

- match `visibilityStateId === user.stateId`

If `visibilityLevel = district`:

- match `visibilityStateId === user.stateId`
- match `visibilityDistrictId === user.districtId`

If `visibilityLevel = mandal`:

- match `visibilityStateId === user.stateId`
- match `visibilityDistrictId === user.districtId`
- match `visibilityMandalId === user.mandalId`

### Important Business Rule

User location controls visibility.

Store location does not decide who sees a vendor/ad/banner directly. Store location is only used to derive which visibility targets an admin may assign.

## Location Resolution Flow

### App Startup Flow

1. App starts.
2. App checks location permission.
3. If granted, app requests GPS.
4. App sends latitude and longitude to `POST /api/location/resolve`.
5. Backend reverse geocodes the coordinates.
6. Backend maps the resolved names to internal state, district, and mandal IDs.
7. If the request is authenticated, backend stores the resolved location on the user.
8. App requests `GET /api/home-feed`.
9. Backend returns filtered vendors, ads, and banners only.

### Permission Denial Flow

1. App asks for location permission.
2. User denies permission.
3. App must not call home feed yet.
4. App should show a location-required state with retry and open-settings options.
5. Once permission is granted later, app repeats the resolution flow.

### Offline Flow

1. If device is offline before GPS resolve:
   app should keep last known local coordinates only for temporary UI purposes.
2. Do not assume visibility locally.
3. Retry `POST /api/location/resolve` when connectivity returns.
4. Until server resolution succeeds, app should avoid rendering geo-targeted feed content as authoritative.

## API Reference

### 1. Get Location Tree

`GET /api/locations/tree`

Purpose:

- load state, district, mandal hierarchy for admin dropdowns or guided manual selection

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "stateId",
      "name": "Andhra Pradesh",
      "code": "AP",
      "districts": [
        {
          "id": "districtId",
          "name": "Anantapur",
          "mandals": [
            {
              "id": "mandalId",
              "name": "Hindupur"
            }
          ]
        }
      ]
    }
  ]
}
```

### 2. Resolve User Location

`POST /api/location/resolve`

Headers:

- `Authorization: Bearer <token>` when the app wants the backend to save the location to the user profile

Request:

```json
{
  "latitude": 13.8281,
  "longitude": 77.4914,
  "accuracy": 24
}
```

Success response:

```json
{
  "success": true,
  "location": {
    "state": {
      "id": "stateId",
      "name": "Andhra Pradesh"
    },
    "district": {
      "id": "districtId",
      "name": "Anantapur"
    },
    "mandal": {
      "id": "mandalId",
      "name": "Hindupur"
    },
    "latitude": 13.8281,
    "longitude": 77.4914,
    "addressLine": "Resolved address",
    "area": "Area",
    "city": "City",
    "pincode": "515201"
  }
}
```

Failure examples:

```json
{
  "success": false,
  "message": "Unsupported district for state Andhra Pradesh: Example"
}
```

```json
{
  "success": false,
  "message": "Missing geocode response for state, district, or mandal"
}
```

### 3. Save User Location

Compatibility endpoint:

`PUT /api/user/location`

Recommended body:

```json
{
  "latitude": 13.8281,
  "longitude": 77.4914,
  "accuracy": 24
}
```

Behavior:

- if IDs and resolved names are missing, backend resolves automatically
- if IDs and resolved names are provided, backend saves directly

Success response:

```json
{
  "success": true,
  "message": "Location saved successfully",
  "location": {
    "latitude": 13.8281,
    "longitude": 77.4914,
    "state": "Andhra Pradesh",
    "district": "Anantapur",
    "mandal": "Hindupur",
    "stateId": "stateId",
    "districtId": "districtId",
    "mandalId": "mandalId"
  },
  "resolvedLocation": {
    "state": {
      "id": "stateId",
      "name": "Andhra Pradesh"
    },
    "district": {
      "id": "districtId",
      "name": "Anantapur"
    },
    "mandal": {
      "id": "mandalId",
      "name": "Hindupur"
    }
  }
}
```

### 4. Read Saved User Location

`GET /api/user/location`

Response:

```json
{
  "success": true,
  "location": {
    "latitude": 13.8281,
    "longitude": 77.4914,
    "state": "Andhra Pradesh",
    "district": "Anantapur",
    "mandal": "Hindupur"
  },
  "locationIds": {
    "stateId": "stateId",
    "districtId": "districtId",
    "mandalId": "mandalId"
  }
}
```

### 5. Home Feed

`GET /api/home-feed`

Auth:

- required

Query params:

- `vendorLimit`
- `adLimit`
- `bannerLimit`

Success response:

```json
{
  "success": true,
  "data": {
    "vendors": [],
    "ads": [],
    "banners": []
  }
}
```

Failure: missing location

```json
{
  "success": false,
  "message": "Location not set",
  "data": {
    "vendors": [],
    "ads": [],
    "banners": []
  }
}
```

Failure: stale location

```json
{
  "success": false,
  "message": "Location stale",
  "data": {
    "vendors": [],
    "ads": [],
    "banners": []
  }
}
```

Notes:

- stale currently means older than 24 hours

### 6. Approve Vendor

New endpoint:

`POST /api/admin/vendors/{id}/approve`

Request:

```json
{
  "visibility_level": "district"
}
```

Behavior:

- resolves store location IDs from the vendor’s saved store text location
- assigns visibility from store hierarchy
- activates vendor

Compatibility:

- legacy `PATCH /api/admin/vendors/{id}` still works

### 7. Approve Ad

Supported endpoints:

- `POST /api/admin/ads/{id}/approve`
- `PATCH /api/admin/ads/{id}/approve`
- `PUT /api/admin/ads/review/{adId}`

Approve request:

```json
{
  "status": "approve",
  "notes": "Looks good",
  "sectionId": "sectionId",
  "category": "Fashion",
  "visibility_level": "mandal"
}
```

Behavior:

- derives targeting from the owning vendor’s store location
- stores normalized visibility fields on the ad

### 8. Create Banner

`POST /api/admin/banners`

Multipart form fields:

- `section`
- `image`
- `title`
- `locationLabel`
- `visibilityLevel`
- `visibilityStateId`
- `visibilityDistrictId`
- `visibilityMandalId`
- `viewUrl`
- `whatsappLink`
- `storeLink`
- `order`

Example logical payload:

```json
{
  "title": "Festival Offer",
  "visibilityLevel": "district",
  "visibilityStateId": "stateId",
  "visibilityDistrictId": "districtId"
}
```

Validation:

- `state` target required for all visibility levels
- `district` target required for `district` and `mandal`
- `mandal` target required for `mandal`
- hierarchy must be valid

## Frontend Integration Guide

### Required App Permissions

- foreground location permission

Recommended client messaging:

- explain that the location is used to show nearby and eligible vendors, ads, and banners
- explain that content accuracy depends on current location

### Integration Order

1. App boot
2. Read auth token
3. Check location permission
4. If denied, show blocked state
5. If granted, get GPS coordinates
6. Call `POST /api/location/resolve` with auth header
7. On success, call `GET /api/home-feed`
8. Render only returned data

### Refresh Strategy

Call `POST /api/location/resolve` again when:

- app first opens
- app returns from long background session
- user manually refreshes
- user moves significantly
- backend returns `Location stale`

Suggested app policy:

- refresh at startup
- refresh after 15 to 30 minutes in background
- refresh before important home feed loads if last successful resolve timestamp is old

### Retry Logic

For `POST /api/location/resolve`:

- retry once immediately for transient network failure
- retry with backoff on `5xx`
- do not hot-loop on `4xx`

Suggested backoff:

1. 2 seconds
2. 5 seconds
3. 15 seconds

### Loading State Flow

Recommended states:

- `checking_permission`
- `getting_gps`
- `resolving_location`
- `loading_feed`
- `ready`
- `permission_denied`
- `unsupported_area`
- `network_error`
- `stale_location`
- `empty_feed`

### UI States

Show specific UI states for:

- permission required
- GPS in progress
- location resolving
- feed loading
- no vendors/ads/banners available
- unsupported area
- retry available

### Error Handling

Map backend messages to UI:

- `Token required`
  route to login

- `Location not set`
  prompt location capture flow

- `Location stale`
  silently refresh if possible, otherwise show refresh CTA

- `Unsupported state...`
  show unsupported area UI

- `Missing geocode response...`
  ask user to retry or move outdoors for better GPS accuracy

- `Vendor store location is incomplete`
  admin-side validation issue

- `District does not belong to selected state`
  admin form correction required

- `Mandal does not belong to selected district`
  admin form correction required

### Edge Cases

- GPS available but geocoder returns incomplete hierarchy
- geocoder returns names not present in master tables
- user has auth token but saved location is stale
- user opens home feed before location resolve finishes
- empty valid result set for a remote or newly added area
- admin tries to approve vendor with incomplete store location
- admin chooses mismatched district/mandal during banner creation
- existing legacy vendors lack normalized store IDs until approved

## Admin Panel Notes

### Vendor Admin

Current UI changes:

- vendor approval modal now includes visibility level selection
- admin can choose `state`, `district`, or `mandal`
- target location is derived from the vendor’s store location

### Ad Admin

Current UI changes:

- ad moderation modal now includes visibility level selection
- target location is derived from the vendor’s store location

### Banner Admin

Current UI changes:

- banner form loads dynamic location tree
- admin selects:
  - visibility level
  - state
  - district if needed
  - mandal if needed

## Operational Notes

### Geo Provider Configuration

Environment:

- `GEO_PROVIDER=nominatim`
- optional `GEO_USER_AGENT=your-app-name/version`

### Performance

Implemented:

- cached master location tree
- visibility indexes
- backend filtering only
- eager population for feed joins

Recommended future improvements:

- add dedicated DB migration and seed command
- add Redis cache for location tree in multi-instance deployments
- add pagination tokens for each home-feed section
- add background backfill for legacy vendor location IDs

## Future Extensions

The current architecture is designed to support:

- radius targeting
- multiple districts per campaign
- multiple states per campaign
- pincode targeting
- premium audience layers
- campaign segmentation rules

The clean extension point is:

- keep normalized geography in master collections
- keep reusable targeting logic in `VisibilityService`
- add new targeting operators instead of embedding logic directly into controllers
