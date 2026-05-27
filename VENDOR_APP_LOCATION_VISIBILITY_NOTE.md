# Vendor App Location Visibility Note

## Purpose

This note is for the vendor app team.

The vendor app must:

- collect store location using the normalized location tree
- save exact `state`, `district`, and `mandal`
- show approval status
- show admin-assigned visibility details for store and ads
- show section and category assignment on ads when returned by backend

## Important Rules

- Vendor app must not decide visibility.
- Vendor app must not let vendor directly choose `global`, `state`, `district`, or `mandal` targeting.
- Admin controls vendor visibility and ad visibility.
- Ads only appear in assigned sections and categories after admin moderation.

## Authentication

```http
Authorization: Bearer <vendor_token>
```

## API 1: Load Master Location Tree

`GET /api/locations/tree`

Use this for the same location flow as user app and vendor registration.

Success:

```json
{
  "success": true,
  "data": [
    {
      "id": "stateId",
      "name": "Andhra Pradesh",
      "districts": [
        {
          "id": "districtId",
          "name": "Visakhapatnam",
          "mandals": [
            {
              "id": "mandalId",
              "name": "Gajuwaka"
            }
          ]
        }
      ]
    }
  ]
}
```

## Vendor Registration Flow

### Step 1

`POST /api/vendor/register/step-1`

```json
{
  "mobileNumber": "9493865702",
  "ownerName": "Karthik Dannina",
  "email": "karthikdannina07@gmail.com"
}
```

### Step 2

`POST /api/vendor/register/step-2`

Use normalized manual location values:

```json
{
  "vendorId": "vendorId",
  "storeName": "Digitweets",
  "category": "Fashion",
  "storeAbout": "Store description",
  "state": "Andhra Pradesh",
  "district": "Visakhapatnam",
  "mandal": "Gajuwaka",
  "thumbnailUrl": "https://...",
  "thumbnailKey": "vendors/thumb.jpg",
  "bannerUrl": "https://...",
  "bannerKey": "vendors/banner.jpg"
}
```

### Step 3

`POST /api/vendor/register/step-3`

```json
{
  "vendorId": "vendorId",
  "fullAddress": "Purna Market, Maharani Peta, Visakhapatnam, Andhra Pradesh, 530014, India",
  "locationCoordinates": [83.311385, 17.706988],
  "agentCode": "",
  "supervisorCode": ""
}
```

Success:

```json
{
  "success": true,
  "message": "Registration completed successfully! Your application is under review.",
  "vendorId": "vendorId",
  "status": "pending_approval",
  "registrationStep": 3
}
```

## API 2: Vendor Status

`GET /api/vendor/status`

Success:

```json
{
  "success": true,
  "vendor": {
    "id": "vendorId",
    "status": "active",
    "approvalStatus": "approved",
    "storeName": "Digitweets",
    "visibility": {
      "visibilityLevel": "district",
      "visibilityStateId": "stateId",
      "visibilityDistrictId": "districtId",
      "visibilityMandalId": null,
      "visibilityEnabled": true
    }
  }
}
```

Vendor UI should show:

- `Global Visible`
- `State Visible`
- `District Visible`
- `Mandal Visible`

## API 3: Vendor Profile

`GET /api/vendor/profile`

Success:

```json
{
  "success": true,
  "vendor": {
    "id": "vendorId",
    "storeName": "Digitweets",
    "fullAddress": "Visakhapatnam",
    "state": "Andhra Pradesh",
    "district": "Visakhapatnam",
    "mandal": "Gajuwaka",
    "storeStateId": "stateId",
    "storeDistrictId": "districtId",
    "storeMandalId": "mandalId",
    "visibilityLevel": "district",
    "visibilityStateId": "stateId",
    "visibilityDistrictId": "districtId",
    "visibilityMandalId": null,
    "visibilityEnabled": true
  }
}
```

## API 4: Update Vendor Profile

`PATCH /api/vendor/profile`

Vendor can update store location, but not visibility target.

Request:

```json
{
  "storeName": "Digitweets",
  "fullAddress": "Updated address",
  "state": "Andhra Pradesh",
  "district": "Visakhapatnam",
  "mandal": "Gajuwaka"
}
```

Success:

```json
{
  "success": true,
  "vendor": {
    "id": "vendorId",
    "storeName": "Digitweets",
    "storeStateId": "stateId",
    "storeDistrictId": "districtId",
    "storeMandalId": "mandalId",
    "visibilityLevel": "district",
    "visibilityStateId": "stateId",
    "visibilityDistrictId": "districtId",
    "visibilityMandalId": null
  }
}
```

## API 5: Create Vendor Ad

`POST /api/vendor/ads`

Vendor does not send visibility or section assignment.

```json
{
  "title": "Big Mobile Offer",
  "description": "Offer details with enough content",
  "category": "Mobiles",
  "url": "https://...",
  "price": 9999,
  "priceType": "fixed"
}
```

Success:

```json
{
  "success": true,
  "ad": {
    "id": "adId",
    "status": "pending",
    "category": "Mobiles"
  }
}
```

## API 6: Vendor Ads List

`GET /api/vendor/ads`

Success:

```json
{
  "success": true,
  "ads": [
    {
      "id": "adId",
      "title": "Big Mobile Offer",
      "status": "approved",
      "category": "Mobiles",
      "categoryId": "categoryId",
      "section": {
        "_id": "sectionId",
        "name": "Electronics Offers"
      },
      "visibilityLevel": "global",
      "visibilityStateId": null,
      "visibilityDistrictId": null,
      "visibilityMandalId": null,
      "visibilityEnabled": true
    }
  ]
}
```

## Vendor UI Rules

- Show store visibility as read-only badge.
- Show each ad status as `Pending`, `Approved`, `Rejected`, `Suspended`, or `Expired`.
- If ad is approved, show:
  - assigned section
  - assigned category if present
  - visibility level
- Do not build custom location-based placement previews in vendor app.

## Refresh Strategy

- Refresh vendor status after login.
- Refresh profile after profile save.
- Refresh ad list after ad creation or edit.
- Poll or refresh when opening dashboard if approval updates are important.

## Error Handling

Handle:

- `400` invalid location data
- `401` auth expired
- `403` subscription required or insufficient credits
- `404` vendor or ad not found
- `500` retry state

## Edge Cases

- Vendor updated store location but admin visibility still points to old targeting until admin edits it.
- Vendor ad can remain pending with no section/category until admin moderates it.
- Approved ad may have `visibilityLevel = global`.
- Approved ad may have section assigned and no category assigned, which means visible inside that section across all categories of that section.
