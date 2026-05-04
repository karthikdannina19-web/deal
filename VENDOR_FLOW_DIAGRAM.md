# Vendor Login and Registration Flow (Working Reference)

Last verified: May 4, 2026

## 1) Working Flow

### Step A: User enters mobile number
- Frontend calls `POST /api/vendor/check-vendor`
- Request body:
```json
{ "mobileNumber": "9398447214" }
```

- Response always comes as HTTP `200` on valid input:
```json
{
  "success": true,
  "exists": true,
  "vendorId": "...or null",
  "status": "active or draft or pending_approval or null",
  "message": "Vendor found"
}
```

Decision:
- If `exists = true`: go to OTP login flow.
- If `exists = false`: go to registration step-1.

### Step B1: Existing vendor login with OTP
1. Call `POST /api/vendor/send-otp`
```json
{ "mobileNumber": "9398447214" }
```
2. For development, OTP is fixed as `1234` and logged in server console.
3. Call `POST /api/vendor/verify-otp`
```json
{ "mobileNumber": "9398447214", "otp": "1234" }
```
4. On success:
```json
{
  "success": true,
  "message": "Login successful",
  "token": "<jwt>",
  "vendor": {
    "vendorId": "...",
    "mobileNumber": "9398447214",
    "email": "...",
    "storeName": "...",
    "status": "active|pending_approval|draft",
    "registrationStep": 1
  }
}
```
5. Store token (`localStorage`), then route to dashboard.

### Step B2: New vendor registration (3 steps)

#### Register Step-1
- API: `POST /api/vendor/register/step-1`
- Request:
```json
{
  "mobileNumber": "9398447214",
  "ownerName": "Raj Kumar",
  "email": "raj@example.com"
}
```
- Success response:
```json
{
  "success": true,
  "message": "Step 1 completed successfully",
  "vendorId": "...",
  "status": "draft",
  "registrationStep": 1,
  "isNewVendor": true
}
```

#### Register Step-2
- API: `POST /api/vendor/register/step-2`
- Request:
```json
{
  "vendorId": "...",
  "storeName": "Raj Electronics",
  "category": "Electronics",
  "storeAbout": "Quality electronics and accessories",
  "state": "Telangana",
  "district": "Hyderabad",
  "mandal": "Khairatabad",
  "thumbnailUrl": "https://...",
  "bannerUrl": "https://..."
}
```
- Success response:
```json
{
  "success": true,
  "message": "Step 2 completed successfully",
  "vendorId": "...",
  "status": "draft",
  "registrationStep": 2
}
```

#### Register Step-3 (final submit)
- API: `POST /api/vendor/register/step-3`
- Request:
```json
{
  "vendorId": "...",
  "fullAddress": "123 Main St, Hyderabad",
  "locationCoordinates": [78.4772, 17.3609],
  "agentCode": "AGENT001"
}
```
- Success response:
```json
{
  "success": true,
  "message": "Registration completed successfully! Your application is under review.",
  "vendorId": "...",
  "status": "pending_approval",
  "registrationStep": 3
}
```

After step-3:
- Vendor status becomes `pending_approval`.
- Admin must approve vendor to make status `active`.

## 2) Validation Rules (Backend)

- Mobile number: `^[6-9]\d{9}$`
- Owner name: min 2 chars
- Email: valid email format
- Store name: min 2 chars
- Store about: min 10 chars
- `state`, `district`, `mandal`: required in step-2
- Full address: min 10 chars
- `agentCode`: optional, but if provided must be active/valid

## 3) Error Behavior

- `400`: validation error or bad input
- `401`: OTP verify failures (`invalid`, `expired`, `max attempts`) from `verify-otp`
- `500`: server error
- `check-vendor` does not return `404` for "not found"; it returns `200` with `exists: false`

## 4) API List for App Developer (Handoff)

### Vendor auth and onboarding
1. `POST /api/vendor/check-vendor`
2. `POST /api/vendor/send-otp`
3. `POST /api/vendor/verify-otp`
4. `POST /api/vendor/register/step-1`
5. `POST /api/vendor/register/step-2`
6. `POST /api/vendor/register/step-3`

### Supporting endpoints used by current UI
7. `GET /api/categories` (category dropdown)

### Optional post-approval vendor operation
8. `POST /api/vendor/store/create` (requires vendor bearer token and active status)

## 5) Frontend Integration Notes

- Use query key `mobileNumber` while navigating to register page.
- Save `vendorId` from step-1 response and reuse for step-2 and step-3.
- Save JWT from verify-otp in `localStorage` (key currently used in UI: `vendorToken`).
- For testing, OTP is `1234` (server simulation mode).
