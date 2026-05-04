# Vendor Login & Registration Flow - Complete Guide

This document describes the complete vendor authentication and registration flow with all API endpoints and proper error handling.

## Quick Summary

| Flow Type | Steps | Outcome |
|-----------|-------|---------|
| **Existing Vendor** | Check → Send OTP → Verify OTP | Get JWT Token |
| **New Vendor** | Check → Register Step 1 → Step 2 → Step 3 | Account under review |

---

## PART 1: LOGIN FLOW (EXISTING VENDORS)

### Step 1: Check if Vendor Exists

**Endpoint:** `POST /api/vendor/check-vendor`

**Purpose:** Determine if the mobile number belongs to a registered vendor

**Request:**
```json
{
  "mobileNumber": "9398447214"
}
```

**Response - Vendor Exists:**
```json
{
  "success": true,
  "exists": true,
  "vendorId": "507f191e810c19729de860ea",
  "status": "active",
  "registrationStep": 3,
  "message": "Vendor found"
}
```

**Response - Vendor Not Found (should redirect to register):**
```json
{
  "success": true,
  "exists": false,
  "vendorId": null,
  "status": null,
  "message": "Vendor not found - please register"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Valid 10-digit mobile number is required (starting with 6-9)",
  "exists": false
}
```

**HTTP Status Codes:**
- `200 OK` - Request successful (check `exists` field)
- `400 Bad Request` - Invalid mobile number
- `500 Internal Server Error` - Server error

---

### Step 2: Send OTP (For Existing Vendors)

**Endpoint:** `POST /api/vendor/send-otp`

**Purpose:** Send one-time password to vendor's mobile

**When to call:** After `check-vendor` returns `exists: true`

**Request:**
```json
{
  "mobileNumber": "9398447214"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully to your mobile number",
  "mobileNumber": "9398447214"
}
```

**Error Responses:**
```json
{
  "success": false,
  "message": "Vendor not found. Please register using /register"
}
```

**Testing Notes:**
- OTP is hardcoded as `1234` for testing purposes
- Check server logs: `[SIMULATION] Vendor OTP for 9398447214: 1234`

**HTTP Status Codes:**
- `200 OK` - OTP sent successfully
- `400 Bad Request` - Invalid mobile number or vendor not found
- `500 Internal Server Error` - Server error

---

### Step 3: Verify OTP & Login

**Endpoint:** `POST /api/vendor/verify-otp`

**Purpose:** Verify OTP and generate JWT authentication token

**When to call:** After user enters OTP and clicks "Verify"

**Request:**
```json
{
  "mobileNumber": "9398447214",
  "otp": "1234"
}
```

**Response - Success:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OWY4MzI4MjgwOWFlZDA4NzNlMWRlZjEiLCJ2ZW5kb3JJZCI6IjY5ZjgzMjgyODA5YWVkMDg3M2UxZGVmMyIsInJvbGUiOiJ2ZW5kb3IiLCJtb2JpbGVOdW1iZXIiOiI5Mzk4NDQ3MjE0IiwiZW1haWwiOiJ2ZW5kb3JAZXhhbXBsZS5jb20iLCJpYXQiOjE3Nzc5MDU4NjksImV4cCI6MTc3ODUxMDY2OX0.xyz",
  "vendor": {
    "vendorId": "507f191e810c19729de860ea",
    "mobileNumber": "9398447214",
    "email": "vendor@example.com",
    "storeName": "My Electronics Store",
    "status": "active",
    "registrationStep": 3
  }
}
```

**Error Responses:**

Invalid OTP:
```json
{
  "success": false,
  "message": "Invalid OTP. Attempt 1 of 3."
}
```

OTP Expired:
```json
{
  "success": false,
  "message": "OTP has expired. Please request a new OTP."
}
```

Max Attempts Exceeded:
```json
{
  "success": false,
  "message": "Maximum verification attempts exceeded. Please request a new OTP."
}
```

**Storing the Token:**
```javascript
// After successful verification
localStorage.setItem('vendor_token', response.token);
localStorage.setItem('vendor_id', response.vendor.vendorId);
```

**Using the Token:**
Add to authorization header in all subsequent requests:
```javascript
headers: {
  'Authorization': `Bearer ${localStorage.getItem('vendor_token')}`
}
```

**HTTP Status Codes:**
- `200 OK` - OTP verified successfully
- `400 Bad Request` - Invalid/expired OTP or missing fields
- `401 Unauthorized` - OTP verification failed
- `500 Internal Server Error` - Server error

---

## PART 2: REGISTRATION FLOW (NEW VENDORS)

### Registration Step 1: Basic Information

**Endpoint:** `POST /api/vendor/register/step-1`

**Purpose:** Create vendor account with basic information

**When to call:** After `check-vendor` returns `exists: false`

**Request:**
```json
{
  "mobileNumber": "9398447214",
  "ownerName": "Raj Kumar",
  "email": "raj@example.com"
}
```

**Field Validation Rules:**
- **Mobile Number**: Must be 10 digits, starting with 6-9
- **Owner Name**: Minimum 2 characters
- **Email**: Valid email format (xxx@xxx.xxx)

**Response - Success:**
```json
{
  "success": true,
  "message": "Step 1 completed successfully",
  "vendorId": "507f191e810c19729de860ea",
  "status": "draft",
  "registrationStep": 1,
  "isNewVendor": true
}
```

**Error Response - Missing Email:**
```json
{
  "success": false,
  "message": "Valid email address is required"
}
```

**Error Response - Invalid Mobile:**
```json
{
  "success": false,
  "message": "Valid 10-digit mobile number is required (starting with 6-9)"
}
```

**Storing Data for Next Step:**
```javascript
sessionStorage.setItem('vendor_id', response.vendorId);
sessionStorage.setItem('registration_step', 1);
```

**HTTP Status Codes:**
- `200 OK` - Registration step completed
- `400 Bad Request` - Validation failed
- `500 Internal Server Error` - Database error

---

### Registration Step 2: Business Details

**Endpoint:** `POST /api/vendor/register/step-2`

**Purpose:** Collect store information and media

**When to call:** After Step 1 is completed

**Request:**
```json
{
  "vendorId": "507f191e810c19729de860ea",
  "storeName": "Raj's Electronics",
  "category": "Electronics",
  "storeAbout": "We provide quality electronics and gadgets with best prices in the city",
  "state": "Telangana",
  "district": "Hyderabad",
  "mandal": "Khairatabad",
  "thumbnailUrl": "https://rhockbucket.s3.com/profiles/thumb-123.jpg",
  "bannerUrl": "https://rhockbucket.s3.com/profiles/banner-123.jpg"
}
```

**Field Validation Rules:**
- **Store Name**: Minimum 2 characters
- **Category**: Required (can be category name or ID)
- **Store About**: Minimum 10 characters
- **State, District, Mandal**: All required
- **Thumbnail/Banner URLs**: Optional (can be added later)

**Response - Success:**
```json
{
  "success": true,
  "message": "Step 2 completed successfully",
  "vendorId": "507f191e810c19729de860ea",
  "status": "draft",
  "registrationStep": 2
}
```

**Error Response - Missing Category:**
```json
{
  "success": false,
  "message": "Store category is required"
}
```

**Error Response - Short Description:**
```json
{
  "success": false,
  "message": "Store description must be at least 10 characters long"
}
```

**Image Upload Process:**
1. Upload thumbnail and banner to S3 separately using file upload API
2. Get the URLs from S3 response
3. Pass URLs in Step 2 request

**Category Examples:**
- Electronics
- Clothing
- Food & Beverages
- Beauty & Wellness
- Home & Garden
- Sports & Outdoor
- Books & Media

**HTTP Status Codes:**
- `200 OK` - Step 2 completed
- `400 Bad Request` - Validation failed
- `500 Internal Server Error` - Database error

---

### Registration Step 3: Final Details & Submission

**Endpoint:** `POST /api/vendor/register/step-3`

**Purpose:** Complete registration with location and finalize

**When to call:** After Step 2 is completed

**Request:**
```json
{
  "vendorId": "507f191e810c19729de860ea",
  "fullAddress": "123 Main Street, Opp. Railway Station, Hyderabad, Telangana 500095",
  "locationCoordinates": [78.4772, 17.3609],
  "agentCode": "AGENT001"
}
```

**Field Validation Rules:**
- **Full Address**: Minimum 10 characters (street, landmark, city, state, pincode)
- **Location Coordinates**: Optional (format: [longitude, latitude])
- **Agent Code**: Optional (only if vendor has a referral agent)

**Obtaining Location Coordinates:**
```javascript
// Using browser geolocation API
navigator.geolocation.getCurrentPosition(position => {
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  const locationCoordinates = [lng, lat]; // [78.4772, 17.3609]
});
```

**Response - Success:**
```json
{
  "success": true,
  "message": "Registration completed successfully! Your application is under review.",
  "vendorId": "507f191e810c19729de860ea",
  "status": "pending_approval",
  "registrationStep": 3
}
```

**What Happens After Step 3:**
- Your registration is submitted for approval
- Admin will review your details
- You'll receive an email once approved
- Status will change from `pending_approval` to `active`
- You can then create stores and list products

**Error Response - Missing Address:**
```json
{
  "success": false,
  "message": "Full address is required and must be at least 10 characters"
}
```

**Error Response - Too Early (Not completed Step 2):**
```json
{
  "success": false,
  "message": "Please complete Step 2 (Business Details) first"
}
```

**Error Response - Invalid Agent Code:**
```json
{
  "success": false,
  "message": "Invalid or inactive agent code"
}
```

**HTTP Status Codes:**
- `200 OK` - Registration completed
- `400 Bad Request` - Validation failed or prerequisite steps not completed
- `500 Internal Server Error` - Database error

---

## VENDOR STATUSES

| Status | Meaning | Can Login? | Can Add Stores? |
|--------|---------|-----------|-----------------|
| `draft` | Registration incomplete | No | No |
| `pending_approval` | Awaiting admin review | No | No |
| `active` | Approved and active | Yes | Yes |
| `suspended` | Temporarily disabled | No | No |
| `rejected` | Registration rejected | No | No |

---

## REGISTRATION STEP PROGRESS

| Step | Data Collected | What Happens |
|------|-----------------|---------------|
| 1 | Name, Email, Mobile | User account created |
| 2 | Store details, Images | Business info stored |
| 3 | Address, Location, Agent | Application submitted |

Only after completing ALL 3 steps can the vendor login and start managing their store.

---

## Common Frontend Implementation

### Step 1: Check & Route
```javascript
async function handleVendorLogin(mobileNumber) {
  const response = await fetch('/api/vendor/check-vendor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobileNumber })
  });
  
  const data = await response.json();
  
  if (data.exists) {
    // Existing vendor - show OTP screen
    router.push(`/vendor/login?mobile=${mobileNumber}`);
  } else {
    // New vendor - show registration
    router.push(`/vendor/register?mobile=${mobileNumber}`);
  }
}
```

### Step 2: OTP Login Flow
```javascript
async function sendOTP(mobileNumber) {
  const response = await fetch('/api/vendor/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobileNumber })
  });
  return response.json();
}

async function verifyOTP(mobileNumber, otp) {
  const response = await fetch('/api/vendor/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobileNumber, otp })
  });
  
  const data = await response.json();
  if (data.success) {
    localStorage.setItem('vendor_token', data.token);
    router.push('/vendor/dashboard');
  }
  return data;
}
```

### Step 3: Registration Flow
```javascript
async function registerStep1(mobileNumber, ownerName, email) {
  const response = await fetch('/api/vendor/register/step-1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobileNumber, ownerName, email })
  });
  
  const data = await response.json();
  if (data.success) {
    sessionStorage.setItem('vendor_id', data.vendorId);
    router.push('/vendor/register/step2');
  }
  return data;
}
```

---

## Testing the Flow

**Test Mobile Number:** `9398447214`  
**Test OTP:** `1234`

### Login Flow Test
1. POST to `/api/vendor/check-vendor` with `{"mobileNumber": "9398447214"}`
2. Should receive `exists: false` initially
3. Complete registration first (Step 1, 2, 3)
4. Try check-vendor again → should return `exists: true`
5. Call `/api/vendor/send-otp`
6. Call `/api/vendor/verify-otp` with OTP `1234`

### Registration Flow Test
1. POST `/api/vendor/register/step-1` with name, email, mobile
2. Save returned `vendorId`
3. POST `/api/vendor/register/step-2` with business details and vendorId
4. POST `/api/vendor/register/step-3` with address and vendorId
5. Should see `status: pending_approval`

---

## Error Handling Best Practices

```javascript
async function apiCall(endpoint, method, body) {
  try {
    const response = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    
    if (!data.success) {
      // Show user-friendly error message
      showError(data.message);
      return null;
    }
    
    return data;
    
  } catch (error) {
    showError('Network error. Please try again.');
    console.error(error);
  }
}
```

---

## Support & Issues

If you encounter issues:
1. Check the error message from the API
2. Verify all required fields are provided
3. Ensure mobile number format is correct (10 digits)
4. For registration, complete steps in order (1→2→3)
5. Check server logs for `[SIMULATION]` OTP messages
