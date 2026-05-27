# User App Location Visibility Note

## Purpose

This note is for the user app team.

The app must:

- get user GPS or let user finish manual location setup
- send location data to backend
- render only backend-filtered sections, categories, ads, banners, and vendors
- never apply visibility logic locally

## Core Rules

- Visibility depends on saved user location on backend.
- Supported visibility levels are `global`, `state`, `district`, and `mandal`.
- `global` means visible to every user in every location.
- Ads, banners, and categories must render only inside their assigned section and optional assigned category.
- The app must not create "nearby deals", "random banners", or "recommended ad blocks" from raw ad/banner APIs unless the backend response explicitly provides them.

## Required Startup Flow

1. Check auth token.
2. Check location permission.
3. If granted, get GPS.
4. Call `POST /api/location/resolve`.
5. After success, call `GET /api/home-feed`.
6. Render returned `sections`, `categories`, `vendors`, `ads`, and `banners`.
7. For section pages, call `GET /api/sections/[slug]/ads`.

## Permission Denied Flow

Show:

- title: `Location Required`
- message: `Allow location to load stores and offers available for your area.`
- actions:
  - `Allow Location`
  - `Retry`
  - `Open Settings`

Do not guess visibility on device.

## Authentication

```http
Authorization: Bearer <user_token>
```

## API 1: Resolve User Location

`POST /api/location/resolve`

Headers:

```http
Content-Type: application/json
Authorization: Bearer <user_token>
```

Request:

```json
{
  "latitude": 17.385,
  "longitude": 78.4867,
  "accuracy": 25
}
```

Success:

```json
{
  "success": true,
  "location": {
    "state": {
      "id": "68342d5a0a5e4b2d8f1e0001",
      "name": "Andhra Pradesh"
    },
    "district": {
      "id": "68342d5a0a5e4b2d8f1e0002",
      "name": "Visakhapatnam"
    },
    "mandal": {
      "id": "68342d5a0a5e4b2d8f1e0003",
      "name": "Gajuwaka"
    },
    "latitude": 17.385,
    "longitude": 78.4867,
    "addressLine": "Resolved address",
    "area": "Example Area",
    "city": "Visakhapatnam",
    "pincode": "530026"
  }
}
```

Error:

```json
{
  "success": false,
  "message": "Missing geocode response for state, district, or mandal"
}
```

## API 2: Save or Refresh User Location

`PUT /api/user/location`

Use this when the app supports manual selection using the same hierarchy flow as vendor registration.

Manual request:

```json
{
  "stateId": "68342d5a0a5e4b2d8f1e0001",
  "districtId": "68342d5a0a5e4b2d8f1e0002",
  "mandalId": "68342d5a0a5e4b2d8f1e0003",
  "state": "Andhra Pradesh",
  "district": "Visakhapatnam",
  "mandal": "Gajuwaka"
}
```

GPS request:

```json
{
  "latitude": 17.385,
  "longitude": 78.4867,
  "accuracy": 25
}
```

Success:

```json
{
  "success": true,
  "message": "Location saved successfully",
  "location": {
    "latitude": 17.385,
    "longitude": 78.4867,
    "accuracy": 25,
    "state": "Andhra Pradesh",
    "district": "Visakhapatnam",
    "mandal": "Gajuwaka",
    "stateId": "68342d5a0a5e4b2d8f1e0001",
    "districtId": "68342d5a0a5e4b2d8f1e0002",
    "mandalId": "68342d5a0a5e4b2d8f1e0003"
  }
}
```

## API 3: Get Saved User Location

`GET /api/user/location`

Success:

```json
{
  "success": true,
  "location": {
    "state": "Andhra Pradesh",
    "district": "Visakhapatnam",
    "mandal": "Gajuwaka",
    "stateId": "68342d5a0a5e4b2d8f1e0001",
    "districtId": "68342d5a0a5e4b2d8f1e0002",
    "mandalId": "68342d5a0a5e4b2d8f1e0003",
    "latitude": 17.385,
    "longitude": 78.4867,
    "locationUpdatedAt": "2026-05-27T09:10:00.000Z"
  }
}
```

## API 4: Home Feed

`GET /api/home-feed`

Optional query:

- `vendorLimit`
- `adLimit`
- `bannerLimit`
- `categoryLimit`
- `sectionLimit`

Success:

```json
{
  "success": true,
  "data": {
    "sections": [
      {
        "id": "sectionId",
        "name": "Electronics Offers",
        "slug": "electronics-offers",
        "description": "Latest curated offers",
        "image": {
          "url": "https://..."
        },
        "banner": {
          "url": "https://..."
        },
        "order": 1,
        "visibilityLevel": "global"
      }
    ],
    "categories": [
      {
        "id": "categoryId",
        "name": "Mobiles",
        "iconUrl": "https://...",
        "imageUrl": "https://...",
        "section": {
          "id": "sectionId",
          "name": "Electronics Offers",
          "slug": "electronics-offers"
        },
        "visibilityLevel": "district"
      }
    ],
    "vendors": [
      {
        "id": "vendorId",
        "storeName": "Digitweets",
        "storeAbout": "Fashion and electronics",
        "fullAddress": "Visakhapatnam",
        "location": {},
        "media": {},
        "visibilityLevel": "state"
      }
    ],
    "ads": [
      {
        "id": "adId",
        "title": "Big Mobile Offer",
        "description": "Discount details",
        "category": "Mobiles",
        "images": [],
        "url": "https://...",
        "price": 9999,
        "priceType": "fixed",
        "views": 120,
        "clicks": 25,
        "visibilityLevel": "global",
        "vendor": {
          "id": "vendorId",
          "storeName": "Digitweets",
          "fullAddress": "Visakhapatnam",
          "location": {},
          "media": {}
        }
      }
    ],
    "banners": [
      {
        "id": "bannerId",
        "title": "Festival Banner",
        "image": {
          "url": "https://..."
        },
        "section": {
          "id": "sectionId",
          "name": "Electronics Offers"
        },
        "viewUrl": "https://...",
        "whatsappLink": "",
        "storeLink": "",
        "visibilityLevel": "global"
      }
    ]
  }
}
```

## API 5: Visible Sections

`GET /api/sections`

Success:

```json
{
  "success": true,
  "data": [
    {
      "id": "sectionId",
      "name": "Electronics Offers",
      "slug": "electronics-offers",
      "imageUrl": "https://...",
      "bannerUrl": "https://..."
    }
  ]
}
```

## API 6: Visible Categories

`GET /api/categories?sectionId=<sectionId>`

If `sectionId` is omitted, backend returns only categories that are assigned to some section and visible to the user.

Success:

```json
{
  "success": true,
  "categories": [
    {
      "id": "categoryId",
      "name": "Mobiles",
      "iconUrl": "https://...",
      "imageUrl": "https://...",
      "section": {
        "id": "sectionId",
        "name": "Electronics Offers",
        "slug": "electronics-offers"
      }
    }
  ]
}
```

## API 7: Section Page Data

`GET /api/sections/[slug]/ads?page=1&limit=20&categoryId=<categoryId>`

This is the main API for rendering a section screen.

Success:

```json
{
  "success": true,
  "data": {
    "section": {
      "_id": "sectionId",
      "name": "Electronics Offers",
      "slug": "electronics-offers"
    },
    "categories": [
      {
        "_id": "categoryId",
        "name": "Mobiles"
      }
    ],
    "banners": [
      {
        "id": "bannerId",
        "title": "Festival Banner",
        "imageUrl": "https://..."
      }
    ],
    "ads": [
      {
        "id": "adId",
        "title": "Big Mobile Offer",
        "category": "Mobiles",
        "storeId": "vendorId",
        "storeName": "Digitweets",
        "image": {
          "url": "https://..."
        },
        "viewCount": 120,
        "clickCount": 25,
        "status": "approved"
      }
    ]
  },
  "pagination": {
    "total": 24,
    "page": 1,
    "limit": 20,
    "totalPages": 2
  }
}
```

## Rendering Rules

- Render section cards from `GET /api/sections` or `GET /api/home-feed`.
- Render section categories from `GET /api/sections/[slug]/ads` or `GET /api/categories?sectionId=...`.
- Render ads only from the section API or filtered ad API using a section/category query.
- Render banners only from the section API or filtered banner API using a section query.
- Do not inject ads or banners into unrelated sections.

## Global Visibility Flow

- If admin skips target location, backend stores `visibilityLevel = global`.
- Global records must render without checking user state/district/mandal.
- The app does not need a special client branch; just render backend response.

## Error Handling

Handle:

- `400` invalid GPS or invalid hierarchy
- `401` auth expired
- `404` section not found
- `500` retry state
- empty arrays as valid success

UI states:

- loading location
- resolving location
- loading feed
- empty section
- empty category
- permission denied
- offline retry

## Refresh Strategy

- Resolve location on first app open after login.
- Refresh location when app opens after long inactivity.
- Refresh home feed after successful location update.
- Refresh section data on pull-to-refresh and when category tab changes.

## Offline Flow

- cache last rendered section/category/feed response for temporary UI
- mark cached state as stale
- retry location resolve and feed refresh when connectivity returns
- never locally recalculate visibility
