# Location Visibility System

## Scope

This system now supports backend-controlled visibility for:

- Vendors
- Ads
- Banners
- Categories
- Sections

It also supports explicit placement rules so that:

- ads only appear in assigned sections and optional assigned categories
- banners only appear in assigned sections and optional assigned categories
- categories only appear in assigned sections

## Visibility Levels

- `global`
- `state`
- `district`
- `mandal`

If admin skips location targeting, backend stores `visibilityLevel = global`.

## Core Services

- [services/location-master.service.js](/abs/path/c:/KARTHIKDCMOON/rhock/services/location-master.service.js)
- [services/location-resolver.service.js](/abs/path/c:/KARTHIKDCMOON/rhock/services/location-resolver.service.js)
- [services/visibility.service.js](/abs/path/c:/KARTHIKDCMOON/rhock/services/visibility.service.js)
- [services/section-visibility.service.js](/abs/path/c:/KARTHIKDCMOON/rhock/services/section-visibility.service.js)
- [services/home-feed.service.js](/abs/path/c:/KARTHIKDCMOON/rhock/services/home-feed.service.js)

## Data Model

### Users

- `stateId`
- `districtId`
- `mandalId`
- `latitude`
- `longitude`
- `locationUpdatedAt`

### Vendors

- `storeStateId`
- `storeDistrictId`
- `storeMandalId`
- `visibilityLevel`
- `visibilityStateId`
- `visibilityDistrictId`
- `visibilityMandalId`
- `visibilityEnabled`

### Ads

- `section`
- `tagId`
- `categoryId`
- `visibilityLevel`
- `visibilityStateId`
- `visibilityDistrictId`
- `visibilityMandalId`
- `visibilityEnabled`

### Banners

- `section`
- `tagId`
- `categoryId`
- `visibilityLevel`
- `visibilityStateId`
- `visibilityDistrictId`
- `visibilityMandalId`
- `visibilityEnabled`

### Categories

- `sectionId`
- `visibilityLevel`
- `visibilityStateId`
- `visibilityDistrictId`
- `visibilityMandalId`
- `visibilityEnabled`

### Sections

- `visibilityLevel`
- `visibilityStateId`
- `visibilityDistrictId`
- `visibilityMandalId`
- `visibilityEnabled`

## Matching Rules

### Global

Visible for all users.

### State

- `visibilityStateId === user.stateId`

### District

- `visibilityStateId === user.stateId`
- `visibilityDistrictId === user.districtId`

### Mandal

- `visibilityStateId === user.stateId`
- `visibilityDistrictId === user.districtId`
- `visibilityMandalId === user.mandalId`

## Placement Rules

- Home feed returns only section-mapped ads and section-mapped banners.
- Section APIs return only ads and banners mapped to that section.
- Category filters inside section APIs work on assigned `categoryId`.
- Public category APIs return only categories assigned to sections.
- Backend does not auto-inject ads, banners, or categories into unrelated sections.

## Main APIs

- `POST /api/location/resolve`
- `GET /api/locations/tree`
- `PUT /api/user/location`
- `GET /api/home-feed`
- `GET /api/sections`
- `GET /api/categories`
- `GET /api/sections/[slug]/ads`
- `GET /api/vendor/profile`
- `GET /api/vendor/status`
- `GET /api/vendor/ads`
- `GET /api/admin/sections`
- `GET /api/admin/categories`
- `GET /api/admin/banners`
- `GET /api/admin/ads`

## Admin Capabilities

- edit section visibility
- edit category section mapping and visibility
- edit banner section/category mapping and visibility
- edit ad section/category mapping and visibility
- edit vendor visibility

## Feed Flow

1. User location is resolved and saved.
2. Backend finds visible sections for that user.
3. Backend finds visible section-mapped categories.
4. Backend finds visible vendors.
5. Backend finds visible section-mapped ads.
6. Backend finds visible section-mapped banners.
7. Backend returns filtered payload.

## Frontend Rule

Frontend only renders backend response.

Frontend must not:

- compute geo visibility
- auto-group ads into random sections
- move banners to unrelated sections
- show categories outside assigned sections

## Verification

Current build verification:

- `npm run build` passed on May 27, 2026
