# Vendor API - Quick Reference & Troubleshooting

## API Endpoints Summary

```
LOGIN FLOW (for existing vendors):
POST /api/vendor/check-vendor          → Check if vendor exists
POST /api/vendor/send-otp              → Send OTP to mobile
POST /api/vendor/verify-otp            → Verify OTP & get token

REGISTRATION FLOW (for new vendors):
POST /api/vendor/register/step-1       → Basic info (name, email, mobile)
POST /api/vendor/register/step-2       → Business details (store, category, location)
POST /api/vendor/register/step-3       → Final details (address, coordinates)
```

---

## Common Errors & Solutions

### ❌ 404 Not Found
**Problem:** Endpoint not found  
**Causes:**
- Typo in URL path
- Using GET instead of POST
- Incorrect API version

**Solution:**
```javascript
// ❌ Wrong
fetch('/api/vendor/check')

// ✅ Correct
fetch('/api/vendor/check-vendor', { method: 'POST' })
```

---

### ❌ 400 Bad Request
**Problem:** Invalid request parameters

#### Missing Mobile Number
```json
{
  "success": false,
  "message": "Valid 10-digit mobile number is required (starting with 6-9)"
}
```
**Solution:** Ensure mobile number is provided and matches format

#### Invalid Mobile Format
```javascript
// ❌ Wrong formats
"1234567890"     // Starts with 1
"9398ABC7214"    // Contains letters
"93984472"       // Only 8 digits

// ✅ Correct format
"9398447214"     // 10 digits starting with 6-9
```

#### Missing Required Field
```json
{
  "success": false,
  "message": "Owner name must be at least 2 characters long"
}
```
**Solution:** Provide all required fields in request body

#### Invalid Email
```json
{
  "success": false,
  "message": "Valid email address is required"
}
```
**Solution:** Use proper email format (example@domain.com)

---

### ❌ 401 Unauthorized
**Problem:** Authentication failed

#### Invalid OTP
```json
{
  "success": false,
  "message": "Invalid OTP. Attempt 1 of 3."
}
```
**Solution:** Enter correct OTP (test OTP is `1234`)

#### OTP Expired
```json
{
  "success": false,
  "message": "OTP has expired. Please request a new OTP."
}
```
**Solution:** Request new OTP by calling send-otp again

#### Max Attempts Exceeded
```json
{
  "success": false,
  "message": "Maximum verification attempts exceeded. Please request a new OTP."
}
```
**Solution:** Request new OTP (you get 3 attempts per OTP)

---

### ❌ 404 Vendor Not Found
**Problem:** Vendor doesn't exist for login

#### During OTP Send
```json
{
  "success": false,
  "message": "Vendor not found. Please register using /register"
}
```
**Cause:** Trying to login with unregistered mobile number  
**Solution:** Complete registration first (Step 1, 2, 3)

---

### ❌ 500 Internal Server Error
**Problem:** Server-side issue

**Common Causes:**
- Database connection failed
- Missing environment variables
- Unexpected data format

**Solution:**
1. Check server logs
2. Verify database connection
3. Ensure AWS_BUCKET_NAME and other env vars are set
4. Retry after a short delay

---

## Step-by-Step Troubleshooting

### Scenario 1: User Can't Check Vendor
```javascript
// Step 1: Verify mobile number format
const mobile = input.value;
if (!/^[6-9]\d{9}$/.test(mobile)) {
  alert('Mobile must be 10 digits starting with 6-9');
  return;
}

// Step 2: Check API response
const response = await fetch('/api/vendor/check-vendor', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ mobileNumber: mobile })
});

console.log('Status:', response.status);
const data = await response.json();
console.log('Response:', data);

if (data.exists) {
  // Route to OTP screen
} else {
  // Route to registration
}
```

### Scenario 2: OTP Not Received (Testing)
```javascript
// For testing, OTP is printed to server console
// Check your server logs for:
// [SIMULATION] Vendor OTP for 9398447214: 1234

// Never actually shows in SMS, just log in console
```

### Scenario 3: Registration Step 1 Fails
```javascript
// Check validation errors
const errors = {
  'ownerName': 'Must be at least 2 characters',
  'email': 'Must be valid email@example.com',
  'mobileNumber': 'Must be 10 digits starting with 6-9'
};

// Example validation
function validateStep1(data) {
  if (data.ownerName.trim().length < 2) {
    return { valid: false, error: 'Name too short' };
  }
  if (!data.email.includes('@')) {
    return { valid: false, error: 'Invalid email' };
  }
  if (!/^[6-9]\d{9}$/.test(data.mobileNumber)) {
    return { valid: false, error: 'Invalid mobile' };
  }
  return { valid: true };
}
```

### Scenario 4: Getting "Vendor not found" on Login
```javascript
const { exists } = await checkVendor(mobileNumber);

if (!exists) {
  // This mobile is NOT registered yet
  // You must complete registration first
  router.push('/vendor/register?mobile=' + mobileNumber);
} else {
  // This mobile is registered
  // Proceed to OTP login
  router.push('/vendor/login?mobile=' + mobileNumber);
}
```

---

## HTTP Status Codes Explained

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Proceed with response data |
| 400 | Bad Request | Check fields and retry |
| 401 | Unauthorized | Invalid credentials, try again |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Try again later, check logs |

---

## Request Body Templates

### Check Vendor
```json
{
  "mobileNumber": "9398447214"
}
```

### Send OTP
```json
{
  "mobileNumber": "9398447214"
}
```

### Verify OTP
```json
{
  "mobileNumber": "9398447214",
  "otp": "1234"
}
```

### Register Step 1
```json
{
  "mobileNumber": "9398447214",
  "ownerName": "Raj Kumar",
  "email": "raj@example.com"
}
```

### Register Step 2
```json
{
  "vendorId": "507f191e810c19729de860ea",
  "storeName": "Electronics Store",
  "category": "Electronics",
  "storeAbout": "Quality electronics retailer with 10+ years experience",
  "state": "Telangana",
  "district": "Hyderabad",
  "mandal": "Khairatabad",
  "thumbnailUrl": "https://example.s3.com/thumb.jpg",
  "bannerUrl": "https://example.s3.com/banner.jpg"
}
```

### Register Step 3
```json
{
  "vendorId": "507f191e810c19729de860ea",
  "fullAddress": "123 Main St, Near Railway Station, Hyderabad, TG 500095",
  "locationCoordinates": [78.4772, 17.3609],
  "agentCode": "AGENT001"
}
```

---

## Validation Rules Quick Reference

```javascript
// Mobile Number
/^[6-9]\d{9}$/ 
// Examples: 9398447214 ✅, 1234567890 ❌, 939844721 ❌

// Email
/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/
// Examples: user@example.com ✅, user@example ❌, @example.com ❌

// Owner Name
.length >= 2
// Examples: "Raj" ✅, "R" ❌, "" ❌

// Store Name
.length >= 2  
// Examples: "Electronics" ✅, "E" ❌

// Store About
.length >= 10
// Examples: "Sell quality electronics..." ✅, "Good store" ❌

// Address
.length >= 10
// Examples: "123 Main St, City, State" ✅, "Main St" ❌
```

---

## Success Response Templates

### Check Vendor Success
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

### OTP Verification Success
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "vendor": {
    "vendorId": "507f191e810c19729de860ea",
    "mobileNumber": "9398447214",
    "email": "vendor@example.com",
    "storeName": "My Store",
    "status": "active",
    "registrationStep": 3
  }
}
```

### Registration Step Success
```json
{
  "success": true,
  "message": "Step X completed successfully",
  "vendorId": "507f191e810c19729de860ea",
  "status": "draft",
  "registrationStep": 1
}
```

---

## Testing Checklist

- [ ] Mobile number format validation works
- [ ] check-vendor returns correct exists status
- [ ] send-otp responds with success message
- [ ] OTP verification accepts "1234" for testing
- [ ] JWT token is returned after successful OTP verification
- [ ] Registration step 1 creates vendor account
- [ ] Registration step 2 updates business details
- [ ] Registration step 3 changes status to pending_approval
- [ ] Cannot proceed to step 2 without completing step 1
- [ ] Cannot proceed to step 3 without completing step 2
- [ ] Error messages are descriptive and helpful

---

## Debug Mode

Enable detailed logging in your frontend:

```javascript
const apiCall = async (endpoint, body) => {
  console.log('📤 Request:', endpoint, body);
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  const data = await response.json();
  console.log('📥 Response:', data);
  console.log('🔍 Status:', response.status);
  
  return data;
};
```

---

## Support Contacts

For issues not resolved by this guide:
1. Check server logs for `[Vendor]` or `[SIMULATION]` messages
2. Verify database connectivity
3. Ensure all environment variables are set
4. Review the detailed flow documentation in VENDOR_LOGIN_FLOW.md
