# Vendor Credits Flow

This note explains how vendor ad credits currently work in this codebase after the deleted-ad refund fix.

## Core rule

- `1 ad = 1 credit`
- Credits are primarily tracked in `UserSubscription.creditsRemaining`
- `User.coinBalance` is also kept in sync as a secondary wallet-style number for vendor-facing reads and older flows

## Where credits come from

Credits are added when a vendor gets a subscription.

Main files:

- `services/subscription.service.js`
- `models/userSubscription.model.js`

Flow:

1. A subscription is created with:
   - `creditsAllocated`
   - `creditsRemaining`
   - `creditsUsed`
2. For non-Razorpay flows, credits are added to `User.coinBalance` immediately.
3. For Razorpay flows, credits are added only after payment verification succeeds.
4. The active subscription is the main source used for ad posting checks.

## How ad creation uses credits

Main file:

- `services/ad.service.js`

Flow:

1. Vendor creates an ad.
2. System finds the active subscription with `getActiveAdSubscription(userId)`.
3. If there is no active plan:
   - vendor gets `Buy Subscription Plan`, or
   - `Subscription expired. Please buy a new plan.`
4. If the plan has fewer than `1` remaining credit:
   - vendor gets `Credits are over. Please buy a new subscription plan.`
5. On success:
   - `UserSubscription.creditsRemaining` is decreased by `1`
   - `UserSubscription.creditsUsed` is increased by `1`
   - `User.coinBalance` is decreased as a synced mirror
   - ad is created with `creditsUsed: 1`

## How admin rejection refunds credits

Main file:

- `services/ad.service.js`

When admin rejects an ad:

- Refund happens only if `ad.creditRefunded !== true`
- Refund does not happen if `ad.editedFromApproved === true`
- Refund marks:
  - `ad.creditRefunded = true`
  - `ad.creditRefundedAt = new Date()`

Refund target:

- active subscription first
- user coin balance as fallback if no active subscription exists

## How vendor delete refunds credits

Main files:

- `services/ad.service.js`
- `modules/vendor/vendor.controller.js`
- `app/api/modules/ads/[id]/route.js`

Current behavior after the fix:

1. Vendor deletes an ad.
2. System starts a DB transaction.
3. If the ad is already deleted, request is rejected.
4. If the ad was not refunded yet:
   - credit is refunded once
   - subscription `creditsRemaining` increases
   - subscription `creditsUsed` decreases
   - `User.coinBalance` also increases
   - ad is marked with `creditRefunded = true`
5. Ad status is set to `deleted`.
6. API response now includes:
   - `creditRefunded`
   - `creditsRefunded`
   - `remainingCredits`
   - `creditSummary`

## Double-refund protection

Refund is prevented when:

- ad already has `creditRefunded = true`
- ad is already `deleted`
- admin rejection already refunded the same ad earlier

This means:

- first refund wins
- later delete/reject actions do not credit the same ad twice

## Important vendor-facing endpoints

- `POST /api/vendor/subscription-plans/purchase`
- `POST /api/vendor/subscription-plans/verify`
- `GET /api/vendor/subscription/status`
- `GET /api/vendor/ads/credits`
- `POST /api/vendor/ads`
- `DELETE /api/vendor/ads/:id`

## Fields involved

### Subscription

- `creditsAllocated`
- `creditsRemaining`
- `creditsUsed`
- `status`
- `endDate`

### Ad

- `creditsUsed`
- `creditRefunded`
- `creditRefundedAt`
- `editedFromApproved`
- `status`

### User

- `coinBalance`

## Practical examples

### Example 1: New vendor plan

- vendor buys a 30-credit plan
- subscription becomes:
  - allocated: `30`
  - remaining: `30`
  - used: `0`

### Example 2: Vendor posts 3 ads

- remaining becomes `27`
- used becomes `3`

### Example 3: Admin rejects 1 fresh ad

- remaining becomes `28`
- used becomes `2`
- ad gets `creditRefunded = true`

### Example 4: Vendor deletes 1 non-refunded ad

- remaining becomes `29`
- used becomes `1`
- ad status becomes `deleted`
- ad gets `creditRefunded = true`

## Current assumption in this fix

This fix refunds credits when a vendor deletes an ad that has not already been refunded.

If your business rule should be narrower, for example:

- refund only for `pending` ads
- no refund for already approved/live ads

then we should add a status-based refund rule in `services/ad.service.js`.
