# Vendor App Integration Note

## Purpose

This note is for the vendor app team.

The vendor app does not decide visibility targeting.

Visibility is decided by admin, based on:

- vendor store location
- admin-selected targeting level
- admin-selected target hierarchy when edited

Vendor app responsibilities are:

- collect and submit store location correctly during registration/profile setup
- show vendor approval status
- show vendor and ad visibility information returned by backend
- avoid offering vendor-side visibility editing unless backend support is added for vendors

## Important Rule

Vendor app must not send visibility fields while creating vendor profile or creating ads.

Current flow:

- vendor submits store location
- admin approves vendor and assigns visibility
- vendor creates ads
- admin approves ads and assigns visibility

## Authentication

Use bearer token:

```http
Authorization: Bearer <vendor_token>
```

## Registration Flow

### Step 1: Basic Vendor Account

#### Endpoint

`POST /api/vendor/register/step-1`

#### Headers

```http
Content-Type: application/json
```

#### Request Body

```json
{
  "mobileNumber": "9493865702",
  "ownerName": "Karthik Dannina",
  "email": "karthikdannina07@gmail.com"
}
```

#### Success Response

```json
{
  "success": true,
  "message": "Step 1 completed successfully",
  "vendorId": "vendorId",
  "status": "draft",
  "registrationStep": 1,
  "isNewVendor": true
}
```

### Step 2: Business Details

#### Endpoint

`POST /api/vendor/register/step-2`

#### Headers

```http
Content-Type: application/json
```

#### Request Body

```json
{
  "vendorId": "vendorId",
  "storeName": "Digitweets",
  "category": "Fashion",
  "storeAbout": "Store description with at least 10 characters.",
  "state": "Andhra Pradesh",
  "district": "Visakhapatnam",
  "mandal": "Gajuwaka",
  "thumbnailUrl": "https://...",
  "thumbnailKey": "vendors/.../thumb.jpg",
  "bannerUrl": "https://...",
  "bannerKey": "vendors/.../banner.jpg"
}
```

#### Success Response

```json
{
  "success": true,
  "message": "Step 2 completed successfully",
  "vendorId": "vendorId",
  "status": "draft",
  "registrationStep": 2
}
```

### Step 3: Full Address and GPS

#### Endpoint

`POST /api/vendor/register/step-3`

#### Headers

```http
Content-Type: application/json
```

#### Request Body

```json
{
  "vendorId": "vendorId",
  "fullAddress": "Purna Market, Maharani Peta, Visakhapatnam, Andhra Pradesh, 530014, India",
  "locationCoordinates": [83.311385, 17.706988],
  "agentCode": "",
  "supervisorCode": ""
}
```

#### Success Response

```json
{
  "success": true,
  "message": "Registration completed successfully! Your application is under review.",
  "vendorId": "vendorId",
  "status": "pending_approval",
  "registrationStep": 3
}
```

## Vendor Login and Status

### Check Vendor Exists

#### Endpoint

`POST /api/vendor/check-vendor`

#### Request Body

```json
{
  "mobileNumber": "9493865702"
}
```

#### Success Response

```json
{
  "success": true,
  "exists": true,
  "vendorId": "vendorId",
  "status": "active",
  "message": "Vendor found"
}
```

### Send OTP

#### Endpoint

`POST /api/vendor/send-otp`

#### Request Body

```json
{
  "mobileNumber": "9493865702"
}
```

#### Success Response

```json
{
  "success": true,
  "message": "OTP sent successfully",
  "mobileNumber": "9493865702"
}
```

### Verify OTP

#### Endpoint

`POST /api/vendor/verify-otp`

#### Request Body

```json
{
  "mobileNumber": "9493865702",
  "otp": "1234"
}
```

#### Success Response

```json
{
  "success": true,
  "message": "Login successful",
  "token": "vendor_jwt_token",
  "vendor": {
    "vendorId": "vendorId",
    "mobileNumber": "9493865702",
    "email": "karthikdannina07@gmail.com",
    "storeName": "Digitweets",
    "status": "active",
    "registrationStep": 3
  }
}
```

### Fetch Vendor Status

#### Endpoint

`GET /api/vendor/status`

#### Headers

```http
Authorization: Bearer <vendor_token>
```

#### Success Response

```json
{
  "success": true,
  "status": "active",
  "rejectionReason": "",
  "registrationStep": 3,
  "message": "Your account is active.",
  "visibility": {
    "level": "district",
    "stateId": "68342d5a0a5e4b2d8f1e0001",
    "districtId": "68342d5a0a5e4b2d8f1e0002",
    "mandalId": null,
    "enabled": true
  }
}
```

### Vendor App Meaning

Use this response to show:

- account under review
- active
- rejected
- suspended
- current store visibility level

## Vendor Profile

### Fetch Vendor Profile

#### Endpoint

`GET /api/vendor/profile`

#### Headers

```http
Authorization: Bearer <vendor_token>
```

#### Success Response

```json
{
  "success": true,
  "data": {
    "_id": "vendorId",
    "vendorId": "vendorId",
    "ownerName": "Karthik Dannina",
    "storeName": "Digitweets",
    "phoneNumber": "9493865702",
    "email": "karthikdannina07@gmail.com",
    "fullAddress": "Purna Market, Maharani Peta, Visakhapatnam, Andhra Pradesh, 530014, India",
    "state": "Andhra Pradesh",
    "district": "Visakhapatnam",
    "mandal": "Gajuwaka",
    "thumbnailUrl": "https://...",
    "bannerUrl": "https://...",
    "category": "Fashion",
    "visibilityLevel": "district",
    "visibilityStateId": "68342d5a0a5e4b2d8f1e0001",
    "visibilityDistrictId": "68342d5a0a5e4b2d8f1e0002",
    "visibilityMandalId": null,
    "visibilityEnabled": true,
    "subscription": {
      "planName": "Gold Plan",
      "status": "active",
      "creditsAllocated": 10,
      "creditsRemaining": 4,
      "creditsUsed": 6
    }
  }
}
```

### Vendor App Meaning

Show on vendor profile:

- store location
- current approved visibility level
- if visibility is `state`, `district`, or `mandal`

Do not let vendor edit these values unless product changes later.

### Update Vendor Profile

#### Endpoint

`PATCH /api/vendor/profile`

#### Headers

```http
Content-Type: application/json
Authorization: Bearer <vendor_token>
```

#### Request Body Example

```json
{
  "ownerName": "Karthik Dannina",
  "storeName": "Digitweets",
  "storeAbout": "Updated store description",
  "state": "Andhra Pradesh",
  "district": "Visakhapatnam",
  "mandal": "Gajuwaka",
  "fullAddress": "Purna Market, Maharani Peta, Visakhapatnam, Andhra Pradesh, 530014, India",
  "website": "",
  "instagram": "",
  "facebook": ""
}
```

#### Success Response

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "vendorId": "vendorId",
    "ownerName": "Karthik Dannina",
    "storeName": "Digitweets",
    "state": "Andhra Pradesh",
    "district": "Visakhapatnam",
    "mandal": "Gajuwaka",
    "visibilityLevel": "district",
    "visibilityStateId": "68342d5a0a5e4b2d8f1e0001",
    "visibilityDistrictId": "68342d5a0a5e4b2d8f1e0002",
    "visibilityMandalId": null,
    "visibilityEnabled": true
  }
}
```

### Important Note

Vendor profile edits currently move vendor status back to `pending_approval`.

Vendor app should handle that and show:

- `Profile updated`
- `Changes are under admin review`

## Vendor Store Create API

This is for protected store creation flow when using vendor token.

### Endpoint

`POST /api/vendor/store/create`

### Headers

```http
Content-Type: application/json
Authorization: Bearer <vendor_token>
```

### Request Body

```json
{
  "businessName": "Digitweets",
  "category": "Fashion",
  "phone": "9493865702",
  "email": "karthikdannina07@gmail.com",
  "address": "Purna Market, Maharani Peta, Visakhapatnam, Andhra Pradesh, 530014, India",
  "state": "Andhra Pradesh",
  "district": "Visakhapatnam",
  "mandal": "Gajuwaka",
  "location": {
    "lat": 17.706988,
    "lng": 83.311385
  },
  "businessHours": "10:00 AM - 9:00 PM",
  "images": []
}
```

### Success Response

```json
{
  "success": true,
  "message": "Store created successfully",
  "storeId": "storeId",
  "status": "pending_approval"
}
```

## Vendor Ads

### Create Ad

#### Endpoint

`POST /api/vendor/ads`

#### Headers

```http
Authorization: Bearer <vendor_token>
```

Use `multipart/form-data`.

#### Form Data Fields

- `title`
- `description`
- `url` optional
- `media` required image file

#### Example Logical Payload

```json
{
  "title": "Festival Offer",
  "description": "Get 50% off on selected items for this week only.",
  "url": "https://example.com"
}
```

#### Success Response

```json
{
  "success": true,
  "message": "Ad created successfully and is pending admin approval.",
  "data": {
    "_id": "adId",
    "title": "Festival Offer",
    "description": "Get 50% off on selected items for this week only.",
    "url": "https://example.com",
    "mediaUrl": "https://...",
    "status": "pending",
    "createdAt": "2026-05-26T10:00:00.000Z",
    "viewCount": 0,
    "canEdit": true,
    "visibilityLevel": null,
    "visibilityStateId": null,
    "visibilityDistrictId": null,
    "visibilityMandalId": null,
    "visibilityEnabled": true
  },
  "remainingCredits": 4,
  "creditSummary": {
    "allocated": 10,
    "remaining": 4,
    "used": 6,
    "display": "4/10"
  }
}
```

### Important Ad Rule

Vendor app must not ask vendor to choose visibility target.

Admin approves ad later and assigns visibility.

### List Vendor Ads

#### Endpoint

`GET /api/vendor/ads`

#### Headers

```http
Authorization: Bearer <vendor_token>
```

#### Optional Query Params

- `status`
- `page`
- `limit`

#### Example

```http
GET /api/vendor/ads?status=approved&page=1&limit=10
Authorization: Bearer <vendor_token>
```

#### Success Response

```json
{
  "success": true,
  "data": [
    {
      "_id": "adId",
      "title": "Festival Offer",
      "description": "Offer details",
      "url": "https://example.com",
      "mediaUrl": "https://...",
      "status": "approved",
      "viewCount": 12,
      "createdAt": "2026-05-26T10:00:00.000Z",
      "updatedAt": "2026-05-26T12:00:00.000Z",
      "canEdit": false,
      "visibilityLevel": "mandal",
      "visibilityStateId": "68342d5a0a5e4b2d8f1e0001",
      "visibilityDistrictId": "68342d5a0a5e4b2d8f1e0002",
      "visibilityMandalId": "68342d5a0a5e4b2d8f1e0003",
      "visibilityEnabled": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "hasMore": false
  }
}
```

### Vendor App Meaning

For each ad, vendor app can show:

- pending approval
- approved
- rejected
- suspended
- current visibility level after admin approval

### Update Vendor Ad

#### Endpoint

`PATCH /api/vendor/ads/{id}`

#### Headers

```http
Authorization: Bearer <vendor_token>
```

Can be `multipart/form-data` or JSON.

#### JSON Body Example

```json
{
  "title": "Updated Festival Offer",
  "description": "Updated offer details",
  "url": "https://example.com"
}
```

#### Success Response

```json
{
  "success": true,
  "message": "Ad updated successfully and submitted for re-approval",
  "data": {
    "_id": "adId",
    "status": "pending"
  }
}
```

### Important Note

If vendor edits an ad, it can go back for admin review depending on backend logic.

Vendor app should inform the vendor:

- `Your updated ad is under review`

## Credit Status

### Endpoint

`GET /api/vendor/ads/credits`

### Headers

```http
Authorization: Bearer <vendor_token>
```

### Success Response

```json
{
  "success": true,
  "credits": 4,
  "creditSummary": {
    "allocated": 10,
    "remaining": 4,
    "used": 6,
    "display": "4/10"
  }
}
```

## Vendor App UI Requirements

### Registration Screens

- owner details
- store details
- state dropdown
- district dropdown
- mandal dropdown
- map / GPS coordinate capture
- full address

### Vendor Dashboard

Show:

- account status
- current store visibility
- visibility target level
- remaining ad credits

### Ad List Screen

Show:

- ad status
- ad visibility level
- pending/rejected labels

## Error Cases Vendor App Must Handle

### Registration

- invalid mobile
- invalid email
- missing state/district/mandal
- invalid coordinates

### Login

- account deleted
- invalid OTP
- OTP expired

### Status

- `pending_approval`
- `rejected`
- `suspended`

### Ad Creation

- account not active
- subscription required
- subscription expired
- insufficient credits

## Vendor App Minimum Changes Summary

1. Collect correct store hierarchy in step 2.
2. Collect full address and coordinates in step 3.
3. Show vendor status from `GET /api/vendor/status`.
4. Show store visibility from `GET /api/vendor/profile`.
5. Show ad visibility from `GET /api/vendor/ads`.
6. Do not allow vendor-side visibility selection.
7. Handle `pending_approval` and `rejected` review states clearly.
