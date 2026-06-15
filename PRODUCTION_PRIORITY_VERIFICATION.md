# Production Priority Verification

Use this checklist after deploying the latest backend and admin UI changes.

## Goal

Confirm that:

- admin approval saves visibility and priority
- public APIs return `resolvedPriority`
- API order matches saved priority

## Store Verification

Pick two vendor stores in the same location.

### Step 1: Approve Store A

- Admin page: `Vendors`
- Choose visibility:
  - `state`, `district`, or `mandal`
- Set priority:
  - `1`

Example:

- Store A location: `Andhra Pradesh > Visakhapatnam > Gajuwaka`
- visibility: `district`
- priority: `1`

### Step 2: Approve Store B

- Same location scope as Store A
- Set priority:
  - `2`

### Step 3: Call stores API

Method:

- `GET`

Path:

- `/api/stores`

Recommended query:

```text
/api/stores?page=1&limit=20&stateId=STATE_ID&districtId=DISTRICT_ID&mandalId=MANDAL_ID
```

Expected:

- Store A appears before Store B
- Store A has:
  - `resolvedPriority: 1`
  - `priorityScopeLevel: "district"`
- Store B has:
  - `resolvedPriority: 2`
  - `priorityScopeLevel: "district"`

## Ad Verification

Pick two ads under visible approved stores in the same location scope.

### Step 1: Approve Ad A

- Admin page: `Advertisements`
- Set section
- Set visibility
- Set priority:
  - `1`

### Step 2: Approve Ad B

- Same scope
- Set priority:
  - `2`

### Step 3: Call section ads API

Method:

- `GET`

Path:

- `/api/sections/[slug]/ads`

Expected:

- Ad A appears before Ad B
- response includes:
  - `resolvedPriority`
  - `priorityScopeLevel`

## Home Feed Verification

Method:

- `GET`

Path:

- `/api/home-feed`

Auth:

- required

Expected:

- `sections`, `vendors`, and `ads` are already ordered by backend priority
- items include `resolvedPriority` and `priorityScopeLevel` when a matching rule exists

## App Developer Rules

- Do not re-sort stores, ads, or sections on the client when admin priority matters.
- Trust backend order.
- For `/api/stores`, always send:
  - `stateId`
  - `districtId`
  - `mandalId`
- Use `resolvedPriority` only for debugging or optional UI labels.

## Failure Signs

If priority is still not working, one of these is usually true:

- `resolvedPriority` is `null`
- admin never saved a priority rule
- app did not send location ids
- deployed backend is older than local code
- priority was saved under the wrong scope

## Fast Debug Rule

If API order is wrong, inspect the raw API response first.

If `resolvedPriority` is `null`, fix backend save/match flow.

If `resolvedPriority` is correct but UI order is wrong, fix frontend sorting/render logic.
