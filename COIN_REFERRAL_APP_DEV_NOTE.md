# Coin & Referral API Note For App Developers

This note covers all user-app and vendor-app APIs related to:

- referral signup
- referral share
- referral rewards
- coin wallet
- coin redemption

Use this as the implementation handoff for mobile app integration.

## Base Rules

- Base URL: use your deployed app base URL
- Auth header for protected APIs:

```http
Authorization: Bearer <jwt_token>
```

- User auth token comes from:
  - `POST /api/auth/verify-otp`
- Vendor auth token comes from:
  - `POST /api/vendor/verify-otp`

## User App APIs

### 1. Register User With Optional Referral

Endpoint:

```http
POST /api/auth/register
```

Purpose:

- creates a pending user
- accepts referral code during signup
- sends OTP automatically

Request JSON:

```json
{
  "fullName": "Karthik D",
  "email": "karthik@example.com",
  "mobileNumber": "9876543210",
  "state": "Andhra Pradesh",
  "district": "Visakhapatnam",
  "mandal": "Gajuwaka",
  "referralCode": "USR-ABCDE"
}
```

Accepted referral aliases also supported by backend:

- `referralCode`
- `referral_code`
- `ref`
- `referrerCode`
- `referredByCode`
- `referCode`
- `code`

Success response:

```json
{
  "success": true,
  "message": "Registration successful. OTP has been sent to your mobile number."
}
```

Common error response:

```json
{
  "success": false,
  "message": "Invalid referral code"
}
```

### 2. Verify User OTP

Endpoint:

```http
POST /api/auth/verify-otp
```

Purpose:

- activates pending user
- applies referral reward if signup had referral code
- returns login token

Request JSON:

```json
{
  "mobileNumber": "9876543210",
  "otp": "1234"
}
```

Success response:

```json
{
  "success": true,
  "message": "Login successful",
  "isNewUser": false,
  "token": "jwt_token_here",
  "user": {
    "_id": "6652c6d6b3a1c5d4e8f10111",
    "name": "Karthik D",
    "email": "karthik@example.com",
    "mobileNumber": "9876543210",
    "state": "Andhra Pradesh",
    "district": "Visakhapatnam",
    "mandal": "Gajuwaka",
    "profileImage": "",
    "role": "user",
    "isVerified": true,
    "coinBalance": 50,
    "profileCompleted": true
  }
}
```

### 3. Apply Referral Later

Endpoint:

```http
POST /api/user/apply-referral
```

Auth:

- required
- user token only

Purpose:

- lets a logged-in user apply referral after account creation if not already used

Request JSON:

```json
{
  "referralCode": "USR-ABCDE",
  "deviceId": "device-12345"
}
```

Success response:

```json
{
  "success": true,
  "message": "Referral applied successfully",
  "reward": {
    "referrerCoins": 25,
    "newUserCoins": 10
  }
}
```

Common error responses:

```json
{
  "success": false,
  "message": "Referral code already applied for this account"
}
```

```json
{
  "success": false,
  "message": "The provided referral code is invalid"
}
```

### 4. Generate Referral Link

Endpoint:

```http
POST /api/referral/generate-link
```

Auth:

- required

Purpose:

- gets the user referral code and shareable referral link

Request body:

- no body required

Success response:

```json
{
  "success": true,
  "referralCode": "USR-ABCDE",
  "referralLink": "https://your-app-domain.com/register?ref=USR-ABCDE"
}
```

### 5. Referral History

Endpoint:

```http
GET /api/referral/history
```

Auth:

- required

Success response:

```json
{
  "success": true,
  "referrals": [
    {
      "_id": "6652d6d6b3a1c5d4e8f10001",
      "referrer": "6652c6d6b3a1c5d4e8f10111",
      "referred": {
        "_id": "6652d6d6b3a1c5d4e8f10002",
        "firstName": "Anu",
        "lastName": "R",
        "email": "anu@example.com",
        "phone": "9123456789",
        "coinBalance": 10
      },
      "rewardCoins": 25,
      "status": "completed",
      "createdAt": "2026-05-26T09:00:00.000Z"
    }
  ]
}
```

### 6. Referral Tree

Endpoint:

```http
GET /api/referral/tree
```

Auth:

- required

Success response:

```json
{
  "success": true,
  "tree": {
    "id": "6652c6d6b3a1c5d4e8f10111",
    "name": "Karthik D",
    "coinsEarned": 50,
    "children": [
      {
        "id": "6652d6d6b3a1c5d4e8f10002",
        "name": "Anu R",
        "coinsEarned": 25,
        "children": []
      }
    ]
  }
}
```

### 7. Referral Dashboard

Endpoint:

```http
GET /api/referrals/dashboard
```

Auth:

- required

Purpose:

- compact dashboard endpoint for referral summary and activity
- returns data for logged-in user only
- used by the Referrals & Coins screen

Success response:

```json
{
  "success": true,
  "data": {
    "referralCode": "USER1CODE",
    "availableCoins": 500,
    "totalReferrals": 1,
    "totalReferralCoins": 500,
    "coinsForReferrer": 500,
    "coinsForReferred": 0,
    "shareMessage": "Use my referral code USER1CODE to join Rhock Deals",
    "shareUrl": "https://example.com/register?ref=USER1CODE",
    "infoText": "Coins are digital rewards you can redeem at any partner vendor during your purchase.",
    "activity": [
      {
        "id": "referral_transaction_id",
        "type": "referral_reward",
        "referredUserName": "vamshi",
        "title": "vamshi",
        "subtitle": "Joined on 27 May 2026, 10:30 AM",
        "amount": 500,
        "isPositive": true,
        "createdAt": "2026-05-26T10:00:00.000Z"
      }
    ]
  }
}
```

Screen mapping:

- `availableCoins` -> `Your Balance`
- `totalReferrals` -> `Total Referrals`
- `totalReferralCoins` -> `Referral Coins`
- `activity[].title` -> left title
- `activity[].subtitle` -> joined date/time line
- `activity[].amount` + `activity[].isPositive` -> right-side `+500` UI

Backend reward flow:

1. User A shares referral code.
2. User B registers with `POST /api/auth/register`.
3. User B verifies OTP using `POST /api/auth/verify-otp`.
4. Backend maps User B to the referral code owner.
5. Backend credits 500 coins to the referrer after successful verification.
6. Backend stores referral activity.
7. `GET /api/referrals/dashboard` returns updated balance, totals, and activity.

### 8. Wallet Balance

Endpoint:

```http
GET /api/wallet/balance
```

Auth:

- required

Success response:

```json
{
  "success": true,
  "stats": {
    "balance": 120,
    "totalEarned": 250,
    "totalSpent": 80,
    "pendingRedemption": 20
  },
  "uniqueRedeemCode": "RHU12345"
}
```

### 9. Wallet Transactions

Endpoint:

```http
GET /api/wallet/transactions
```

Auth:

- required

Success response:

```json
{
  "success": true,
  "transactions": [
    {
      "_id": "6652e6d6b3a1c5d4e8f10003",
      "user": "6652c6d6b3a1c5d4e8f10111",
      "type": "credit",
      "amount": 25,
      "balanceBefore": 95,
      "balanceAfter": 120,
      "transactionType": "REFERRAL_REWARD",
      "referenceId": "6652d6d6b3a1c5d4e8f10001",
      "createdAt": "2026-05-26T10:00:00.000Z"
    }
  ]
}
```

### 10. Coins History

Endpoint:

```http
GET /api/coins/history?page=1&limit=20
```

Auth:

- required

Purpose:

- app-friendly formatted coin history

Success response:

```json
{
  "success": true,
  "message": "Coins history fetched successfully",
  "data": {
    "summary": {
      "totalEarned": 250,
      "availableBalance": 120
    },
    "transactions": [
      {
        "id": "6652e6d6b3a1c5d4e8f10003",
        "title": "Referral Reward",
        "subtitle": "Referral reward credited",
        "amount": 25,
        "type": "referral_reward",
        "createdAt": "2026-05-26T10:00:00.000Z"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### 11. Pending Redemption Requests For User

Endpoint:

```http
GET /api/redemption/pending
```

Auth:

- required

Purpose:

- shows user all vendor requests waiting for approval/rejection

Success response:

```json
{
  "success": true,
  "pending": [
    {
      "_id": "6652f6d6b3a1c5d4e8f10004",
      "user": "6652c6d6b3a1c5d4e8f10111",
      "vendor": {
        "_id": "6652f6d6b3a1c5d4e8f10005",
        "storeName": "Digitweets",
        "profileImage": ""
      },
      "coinAmount": 20,
      "userUniqueCode": "RHU12345",
      "status": "PENDING",
      "createdAt": "2026-05-26T10:10:00.000Z"
    }
  ]
}
```

### 12. Approve Redemption Request

Endpoint:

```http
POST /api/redemption/approve
```

Auth:

- required

Request JSON:

```json
{
  "requestId": "6652f6d6b3a1c5d4e8f10004"
}
```

Success response:

```json
{
  "success": true,
  "message": "Redemption approved successfully",
  "request": {
    "_id": "6652f6d6b3a1c5d4e8f10004",
    "status": "APPROVED",
    "approvedAt": "2026-05-26T10:15:00.000Z"
  }
}
```

### 13. Reject Redemption Request

Endpoint:

```http
POST /api/redemption/reject
```

Auth:

- required

Request JSON:

```json
{
  "requestId": "6652f6d6b3a1c5d4e8f10004"
}
```

Success response:

```json
{
  "success": true,
  "message": "Redemption request rejected",
  "request": {
    "_id": "6652f6d6b3a1c5d4e8f10004",
    "status": "REJECTED",
    "rejectedAt": "2026-05-26T10:15:00.000Z"
  }
}
```

## Vendor App APIs

### 1. Vendor Wallet Summary

Endpoint:

```http
GET /api/vendor/wallet
```

Auth:

- required
- vendor token

Success response:

```json
{
  "success": true,
  "balance": 340,
  "storeName": "Digitweets",
  "totalRedeemed": 1120
}
```

### 2. Vendor Redemption Request By User Unique Code

Recommended API for vendor app:

```http
POST /api/vendor/redeem/request
```

Auth:

- required
- vendor token

Request JSON:

```json
{
  "userUniqueCode": "RHU12345",
  "coinAmount": 20
}
```

Success response:

```json
{
  "success": true,
  "message": "Redemption request submitted successfully. Awaiting user approval.",
  "request": {
    "_id": "6652f6d6b3a1c5d4e8f10004",
    "user": "6652c6d6b3a1c5d4e8f10111",
    "vendor": "6652f6d6b3a1c5d4e8f10005",
    "coinAmount": 20,
    "userUniqueCode": "RHU12345",
    "status": "PENDING",
    "createdAt": "2026-05-26T10:10:00.000Z"
  }
}
```

### 3. Vendor Redemption History

Endpoint:

```http
GET /api/vendor/redemption/history
```

Auth:

- required
- vendor token

Success response:

```json
{
  "success": true,
  "history": [
    {
      "_id": "6652f6d6b3a1c5d4e8f10004",
      "user": {
        "_id": "6652c6d6b3a1c5d4e8f10111",
        "firstName": "Karthik",
        "lastName": "D",
        "email": "karthik@example.com",
        "uniqueRedeemCode": "RHU12345"
      },
      "coinAmount": 20,
      "status": "APPROVED",
      "createdAt": "2026-05-26T10:10:00.000Z"
    }
  ]
}
```

## Vendor OTP-Based Coin Transfer Flow APIs

These APIs are a stricter vendor redemption flow with location verification and OTP confirmation.

Use these if vendor app is built for:

- vendor enters user referral code
- vendor must be physically near the store
- user OTP must confirm transfer

### 4. Initiate Coin Redemption

Endpoint:

```http
POST /api/coins/initiate
```

Auth:

- required
- vendor token

Request JSON:

```json
{
  "referralCode": "USR-ABCDE",
  "coins": 20,
  "latitude": 17.7215,
  "longitude": 83.3013
}
```

Success response:

```json
{
  "success": true,
  "message": "User validated. Proceed to OTP",
  "user": {
    "userId": "6652c6d6b3a1c5d4e8f10111",
    "name": "Karthik D",
    "availableCoins": 120
  },
  "transactionId": "66530975b3a1c5d4e8f10010"
}
```

Common error response:

```json
{
  "success": false,
  "message": "Location verification failed. You are 145m away. Max allowed is 100m."
}
```

### 5. Send OTP To User

Endpoint:

```http
POST /api/coins/send-otp
```

Auth:

- required
- vendor token

Request JSON:

```json
{
  "transactionId": "66530975b3a1c5d4e8f10010"
}
```

Success response:

```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

### 6. Verify OTP And Complete Transfer

Endpoint:

```http
POST /api/coins/verify
```

Auth:

- required
- vendor token

Recommended header:

```http
x-idempotency-key: 4f7c2a4b-2a4e-4f3a-bb1d-7c72f88711aa
```

Request JSON:

```json
{
  "transactionId": "66530975b3a1c5d4e8f10010",
  "otp": "1234"
}
```

Success response:

```json
{
  "success": true,
  "message": "Transaction completed successfully",
  "transaction": {
    "transactionId": "66530975b3a1c5d4e8f10010",
    "coinsTransferred": 20,
    "status": "completed"
  }
}
```

Already processed response can look like:

```json
{
  "success": true,
  "message": "Transaction completed successfully",
  "transaction": {
    "transactionId": "66530975b3a1c5d4e8f10010",
    "coinsTransferred": 20,
    "status": "completed",
    "alreadyProcessed": true
  }
}
```

## Recommended User App Flow

### Referral During Signup

1. Call `POST /api/auth/register` with `referralCode`.
2. Call `POST /api/auth/verify-otp`.
3. Save returned token.
4. Load `POST /api/referral/generate-link`.
5. Load `GET /api/referrals/dashboard`.
6. Load `GET /api/coins/history`.

### Referral Applied Later

1. User logs in.
2. Call `POST /api/user/apply-referral`.
3. Refresh:
   - `GET /api/referrals/dashboard`
   - `GET /api/wallet/balance`
   - `GET /api/coins/history`

### User Coin Wallet Screen

Load these together:

- `GET /api/wallet/balance`
- `GET /api/coins/history?page=1&limit=20`
- optional: `GET /api/wallet/transactions`

### User Redemption Approval Screen

1. Poll or refresh `GET /api/redemption/pending`
2. User taps approve:
   - `POST /api/redemption/approve`
3. Or reject:
   - `POST /api/redemption/reject`
4. Refresh wallet:
   - `GET /api/wallet/balance`
   - `GET /api/coins/history`

## Recommended Vendor App Flow

### Simple Vendor Redeem Flow

1. Load `GET /api/vendor/wallet`
2. Submit `POST /api/vendor/redeem/request`
3. Refresh `GET /api/vendor/redemption/history`
4. Refresh `GET /api/vendor/wallet`

### OTP + Geo Verified Vendor Redeem Flow

1. Load vendor GPS
2. Call `POST /api/coins/initiate`
3. If success, call `POST /api/coins/send-otp`
4. User enters OTP
5. Call `POST /api/coins/verify`
6. Refresh vendor wallet summary

## Important Frontend Notes

- User referral code and user unique redeem code are different:
  - `referralCode` is for referral/share/invite
  - `uniqueRedeemCode` is for vendor redemption request flow

- Preferred user wallet history API:
  - use `GET /api/coins/history`
  - it is already formatted for app UI

- `GET /api/wallet/transactions` returns raw ledger rows.

- For vendor OTP coin flow:
  - vendor must be within 100 meters of stored vendor location
  - OTP resend is limited
  - OTP verify should send `x-idempotency-key`

- On signup:
  - if referral code is invalid, registration fails
  - app should show validation message before retry

- On apply referral later:
  - this works only once per account

## Common Error Messages To Handle In App

- `Invalid referral code`
- `Referral code already applied for this account`
- `The provided referral code is invalid`
- `You cannot refer yourself`
- `Maximum referral limit reached for this device today`
- `User not found with the provided redemption code`
- `User does not have enough coins. Available: X`
- `Location verification failed. You are Xm away. Max allowed is 100m.`
- `Please wait X seconds before requesting a new OTP.`
- `Maximum OTP resend limit reached for this transaction.`
- `OTP has expired`
- `Invalid OTP`
- `Insufficient balance for redemption approval`

## Recommended App Refresh Strategy

- After signup OTP success:
  - refresh referral dashboard
  - refresh wallet balance

- After apply referral:
  - refresh referral dashboard
  - refresh coin history
  - refresh wallet balance

- After redemption approve/reject:
  - refresh pending requests
  - refresh wallet balance
  - refresh coin history

- After vendor redeem request:
  - refresh vendor wallet
  - refresh vendor redemption history
