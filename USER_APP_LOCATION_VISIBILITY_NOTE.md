# User App Integration Note

## Purpose

This note is for the user app team.

The user app must:

- collect device GPS
- send latitude and longitude to backend
- let backend resolve `state`, `district`, and `mandal`
- use backend feed APIs only
- never apply location visibility filtering inside the app

## Important Rule

Visibility depends on the authenticated user location saved on backend.

Frontend must not decide:

- which vendors are visible
- which ads are visible
- which banners are visible

Frontend only:

- requests permission
- gets GPS
- calls location APIs
- displays backend response

## Required User App Flow

### App Startup Flow

1. Check if user is logged in.
2. Check location permission.
3. If permission granted, get GPS coordinates.
4. Call `POST /api/location/resolve`.
5. After success, call `GET /api/home-feed`.
6. Render returned `vendors`, `ads`, and `banners`.

### If Permission Is Denied

Show a blocking or semi-blocking state:

- title: `Location Required`
- reason: `We use your current location to show stores, ads, and banners available in your area.`
- actions:
  - `Allow Location`
  - `Retry`
  - `Open Settings`

Do not show location-targeted content until backend location is resolved.

## Authentication

Use bearer token:

```http
Authorization: Bearer <user_token>
```

## API 1: Resolve User Location

### Endpoint

`POST /api/location/resolve`

### Headers

```http
Content-Type: application/json
Authorization: Bearer <user_token>
```

### Request Body

```json
{
  "latitude": 17.385,
  "longitude": 78.4867,
  "accuracy": 25
}
```

### Success Response

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
      "name": "Anantapur"
    },
    "mandal": {
      "id": "68342d5a0a5e4b2d8f1e0003",
      "name": "Hindupur"
    },
    "latitude": 17.385,
    "longitude": 78.4867,
    "addressLine": "Resolved address",
    "area": "Example Area",
    "city": "Example City",
    "pincode": "515201"
  }
}
```

### Error Response Examples

```json
{
  "success": false,
  "message": "Latitude and longitude are required"
}
```

```json
{
  "success": false,
  "message": "Missing geocode response for state, district, or mandal"
}
```

```json
{
  "success": false,
  "message": "Unsupported district for state Andhra Pradesh: Example"
}
```

### App Behavior

On success:

- store the resolved hierarchy locally for UI only if needed
- immediately request home feed

On failure:

- show retry state
- do not try to locally guess visibility

## API 2: Save or Refresh User Location

### Endpoint

`PUT /api/user/location`

This is a compatibility endpoint. You can use it if you want the backend to both resolve and store location in one place for the user profile flow.

### Headers

```http
Content-Type: application/json
Authorization: Bearer <user_token>
```

### Recommended Request Body

```json
{
  "latitude": 17.385,
  "longitude": 78.4867,
  "accuracy": 25
}
```

### Optional Direct-Save Body

Use only if you already have server-resolved IDs and names.

```json
{
  "latitude": 17.385,
  "longitude": 78.4867,
  "accuracy": 25,
  "state": "Andhra Pradesh",
  "district": "Anantapur",
  "mandal": "Hindupur",
  "stateId": "68342d5a0a5e4b2d8f1e0001",
  "districtId": "68342d5a0a5e4b2d8f1e0002",
  "mandalId": "68342d5a0a5e4b2d8f1e0003"
}
```

### Success Response

```json
{
  "success": true,
  "message": "Location saved successfully",
  "location": {
    "latitude": 17.385,
    "longitude": 78.4867,
    "accuracy": 25,
    "state": "Andhra Pradesh",
    "district": "Anantapur",
    "mandal": "Hindupur",
    "stateId": "68342d5a0a5e4b2d8f1e0001",
    "districtId": "68342d5a0a5e4b2d8f1e0002",
    "mandalId": "68342d5a0a5e4b2d8f1e0003"
  },
  "resolvedLocation": {
    "state": {
      "id": "68342d5a0a5e4b2d8f1e0001",
      "name": "Andhra Pradesh"
    },
    "district": {
      "id": "68342d5a0a5e4b2d8f1e0002",
      "name": "Anantapur"
    },
    "mandal": {
      "id": "68342d5a0a5e4b2d8f1e0003",
      "name": "Hindupur"
    }
  }
}
```

## API 3: Get Saved User Location

### Endpoint

`GET /api/user/location`

### Headers

```http
Authorization: Bearer <user_token>
```

### Success Response

```json
{
  "success": true,
  "location": {
    "latitude": 17.385,
    "longitude": 78.4867,
    "state": "Andhra Pradesh",
    "district": "Anantapur",
    "mandal": "Hindupur",
    "stateId": "68342d5a0a5e4b2d8f1e0001",
    "districtId": "68342d5a0a5e4b2d8f1e0002",
    "mandalId": "68342d5a0a5e4b2d8f1e0003"
  },
  "locationIds": {
    "stateId": "68342d5a0a5e4b2d8f1e0001",
    "districtId": "68342d5a0a5e4b2d8f1e0002",
    "mandalId": "68342d5a0a5e4b2d8f1e0003"
  }
}
```

## API 4: Home Feed

### Endpoint

`GET /api/home-feed`

### Headers

```http
Authorization: Bearer <user_token>
```

### Optional Query Params

```text
vendorLimit=20
adLimit=20
bannerLimit=20
```

### Example Request

```http
GET /api/home-feed?vendorLimit=20&adLimit=20&bannerLimit=10
Authorization: Bearer <user_token>
```

### Success Response

```json
{
  "success": true,
  "data": {
    "vendors": [
      {
        "id": "vendorId",
        "storeName": "Digitweets",
        "storeAbout": "Store description",
        "fullAddress": "Purna Market, Maharani Peta, Visakhapatnam, Andhra Pradesh",
        "location": {
          "state": "Andhra Pradesh",
          "district": "Visakhapatnam",
          "mandal": "Gajuwaka"
        },
        "media": {
          "thumbnailUrl": "https://...",
          "bannerUrl": "https://..."
        },
        "visibilityLevel": "district"
      }
    ],
    "ads": [
      {
        "id": "adId",
        "title": "Festival Offer",
        "description": "Discount details",
        "category": "Fashion",
        "images": [
          {
            "url": "https://..."
          }
        ],
        "url": "https://example.com",
        "price": 199,
        "priceType": "fixed",
        "views": 12,
        "clicks": 4,
        "visibilityLevel": "mandal",
        "vendor": {
          "id": "vendorId",
          "storeName": "Digitweets",
          "fullAddress": "Purna Market, Maharani Peta, Visakhapatnam, Andhra Pradesh",
          "location": {
            "state": "Andhra Pradesh",
            "district": "Visakhapatnam",
            "mandal": "Gajuwaka"
          },
          "media": {
            "thumbnailUrl": "https://..."
          }
        }
      }
    ],
    "banners": [
      {
        "id": "bannerId",
        "title": "Big Sale",
        "image": {
          "url": "https://..."
        },
        "section": {
          "id": "sectionId",
          "name": "Trending Stores"
        },
        "viewUrl": "https://example.com",
        "whatsappLink": "https://wa.me/919999999999",
        "storeLink": "app://store/vendorId",
        "visibilityLevel": "state"
      }
    ]
  }
}
```

### Error Response: Location Missing

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

### Error Response: Location Stale

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

## API 5: Public Banners and Ads Endpoints

These existing endpoints can still be used, but when the user is authenticated and has location IDs saved, backend will apply visibility rules:

- `GET /api/banners`
- `GET /api/banners/top`
- `GET /api/ads`

### Recommendation

For the new app home screen, prefer `GET /api/home-feed`.

Use legacy list endpoints only for:

- section pages
- dedicated ad pages
- special browsing screens

## Location Permission UX

### Recommended Copy

`We need your location to show stores, ads, and banners available in your area.`

### Recommended Permission Handling

If OS permission is:

- `granted`
  continue with GPS

- `denied`
  show retry + settings CTA

- `blocked/permanently denied`
  show `Open Settings`

## Refresh Rules

Refresh location when:

- app launches
- app returns from background after long time
- user pulls to refresh home
- backend says `Location stale`
- OS location changes significantly

## Offline Handling

If offline:

- show last loaded feed if available
- mark it as cached content
- do not assume it matches current location
- retry `POST /api/location/resolve` when online again

## UI States Required

- loading GPS
- resolving location
- loading feed
- permission denied
- unsupported area
- stale location
- empty feed
- retry state

## Error Mapping

### `401 Token required`

- send user to login

### `400 Location not set`

- restart location flow

### `409 Location stale`

- refresh coordinates and call location resolve again

### `400 Unsupported state/district/mandal`

- show unsupported coverage message

## Minimum App Changes Summary

1. Add location permission flow.
2. Call `POST /api/location/resolve` after GPS fetch.
3. Call `GET /api/home-feed` after successful resolve.
4. Handle `Location stale` and `Location not set`.
5. Never filter vendors, ads, or banners in frontend.
