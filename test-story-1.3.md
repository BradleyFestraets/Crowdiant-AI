# Story 1.3 Manual Testing Checklist

**Story:** Authentication & Authorization Framework  
**Date:** 2025-11-29  
**Tester:** BMad Master + Bradley  
**Server:** http://localhost:3000  

---

## ✅ Code Review - Acceptance Criteria Verification

### AC1: NextAuth.js configured with credentials provider ✅
**File:** `src/server/auth/config.ts`
- ✅ CredentialsProvider configured with email/password fields
- ✅ `authorize()` function verifies credentials against User model
- ✅ Returns user object with id, email, name

### AC2: Session management uses database strategy ✅
**File:** `src/server/auth/config.ts`
- ✅ `session: { strategy: "database" }` configured
- ✅ PrismaAdapter(db) used for session storage
- ✅ Session model exists in Prisma schema

### AC3: tRPC middleware `enforceUserIsAuthed` ✅
**File:** `src/server/api/trpc.ts` (lines 118-131)
- ✅ Checks `ctx.session?.user` exists
- ✅ Throws TRPCError with code "UNAUTHORIZED" if missing
- ✅ Returns enriched context with non-nullable session
- ✅ Exported as `protectedProcedure`

### AC4: tRPC middleware `enforceVenueAccess` ✅
**File:** `src/server/api/trpc.ts` (lines 140-180)
- ✅ Checks session exists
- ✅ Extracts venueId from input
- ✅ Queries StaffAssignment with userId + venueId + deletedAt=null
- ✅ Throws TRPCError with code "FORBIDDEN" if no access
- ✅ Exported as `venueProtectedProcedure`

### AC5: tRPC middleware `enforceRole` ✅
**File:** `src/server/api/trpc.ts` (lines 189-228)
- ✅ Accepts StaffRole parameter
- ✅ Checks session exists
- ✅ Queries StaffAssignment with role check
- ✅ Throws TRPCError with code "FORBIDDEN" if role mismatch
- ✅ Exported as `roleProtectedProcedure` factory
- ✅ Marked as skeleton for Epic 2+

### AC6: Password hashing with bcrypt (cost factor: 10) ✅
**Files:** `src/server/auth/config.ts`, `src/server/api/routers/auth.ts`
- ✅ Registration: `await hash(input.password, 10)`
- ✅ Login: `await compare(credentials.password, user.passwordHash)`
- ✅ Cost factor is 10 (explicit in register mutation)

### AC7: JWT token configuration includes userId ✅
**File:** `src/server/auth/config.ts`
- ✅ Session callback includes user.id: `id: user.id`
- ✅ TypeScript augmentation declares Session with user.id

### AC8: Protected route wrapper redirects unauthenticated users ✅
**File:** `src/components/auth/ProtectedRoute.tsx`
- ✅ Uses `useSession()` hook
- ✅ Shows loading spinner while checking
- ✅ Redirects to `/login` if unauthenticated
- ✅ Renders children if authenticated

### AC9: User can log in with valid credentials ✅
**File:** `src/app/login/page.tsx`
- ✅ Login form with email/password fields
- ✅ Calls `signIn("credentials", { email, password })`
- ✅ Handles errors (displays "Invalid email or password")
- ✅ Redirects to callbackUrl on success

### AC10: TypeScript compilation passes ✅
**Verified:** `npm run typecheck` - 0 errors

### AC11: ESLint checks pass ✅
**Verified:** `npm run lint` - 0 warnings/errors

### AC12: Prettier formatting complete ✅
**Verified:** `npm run format:write` - all files formatted

---

## 🧪 Manual Testing Tasks

### Test 1: User Registration (auth.register mutation)
**Endpoint:** tRPC `auth.register`

**Test Steps:**
1. Open browser dev tools console at http://localhost:3000
2. Create test user via tRPC:
   ```javascript
   // Use tRPC client to register
   // Or use API directly: POST /api/trpc/auth.register
   ```

**Expected Results:**
- ✅ User created in database with hashed password
- ✅ passwordHash is NOT plain text (starts with `$2a$10$` or `$2b$10$`)
- ✅ Duplicate email returns CONFLICT error

---

### Test 2: Login Flow (Valid Credentials)
**Page:** http://localhost:3000/login

**Test Steps:**
1. Navigate to http://localhost:3000/login
2. Enter valid email: test@crowdiant.com
3. Enter valid password: password123
4. Click "Sign in"

**Expected Results:**
- ✅ No error message displayed
- ✅ Redirects to /dashboard (or callbackUrl)
- ✅ Session created in database (sessions table)
- ✅ Session cookie set in browser (check Application > Cookies)

---

### Test 3: Login Flow (Invalid Password)
**Page:** http://localhost:3000/login

**Test Steps:**
1. Navigate to http://localhost:3000/login
2. Enter valid email: test@crowdiant.com
3. Enter WRONG password: wrongpassword
4. Click "Sign in"

**Expected Results:**
- ✅ Error message: "Invalid email or password"
- ✅ No redirect occurs
- ✅ No session created

---

### Test 4: Protected Route - Unauthenticated Access
**Test:** Direct navigation without login

**Test Steps:**
1. Open incognito/private browser window
2. Navigate to http://localhost:3000/dashboard (if exists)
3. Or create test protected page using `<ProtectedRoute>`

**Expected Results:**
- ✅ Immediately redirects to /login
- ✅ callbackUrl parameter set: `/login?callbackUrl=/dashboard`

---

### Test 5: Protected tRPC Route - Unauthenticated Request
**Test:** Call protectedProcedure without session

**Test Steps:**
1. Open browser console (logged out state)
2. Try to call protected endpoint (e.g., `venue.listAccessible`)

**Expected Results:**
- ✅ Returns 401 UNAUTHORIZED error
- ✅ Error message: "You must be logged in to access this resource"

---

### Test 6: Session Persistence - Page Refresh
**Test:** Verify session survives browser refresh

**Test Steps:**
1. Log in successfully
2. Navigate to dashboard or protected page
3. Press F5 or Ctrl+R to refresh page
4. Observe behavior

**Expected Results:**
- ✅ Session remains valid (no redirect to login)
- ✅ User stays authenticated
- ✅ Protected content still displays

---

### Test 7: Venue Access Middleware - Valid Access
**Test:** Access venue with valid StaffAssignment

**Prerequisites:**
- Create test venue in database
- Create StaffAssignment linking test user to venue
- User logged in

**Test Steps:**
1. Call `venue.getById({ venueId: "test-venue-id" })`

**Expected Results:**
- ✅ Returns venue data
- ✅ No FORBIDDEN error
- ✅ Middleware passes successfully

---

### Test 8: Venue Access Middleware - Invalid Access
**Test:** Access venue WITHOUT StaffAssignment

**Prerequisites:**
- User logged in
- Target venue exists but user has no StaffAssignment

**Test Steps:**
1. Call `venue.getById({ venueId: "unauthorized-venue-id" })`

**Expected Results:**
- ✅ Returns 403 FORBIDDEN error
- ✅ Error message: "You do not have access to this venue"

---

### Test 9: List Accessible Venues
**Test:** venue.listAccessible returns only assigned venues

**Prerequisites:**
- User logged in
- User has StaffAssignments to 2+ venues

**Test Steps:**
1. Call `venue.listAccessible()`

**Expected Results:**
- ✅ Returns array of venues where user has StaffAssignment
- ✅ Only returns venues with deletedAt = null
- ✅ Does NOT return venues without assignment

---

### Test 10: Role-Based Authorization (Skeleton)
**Test:** Verify middleware exists (full test in Epic 2)

**Test Steps:**
1. Verify `roleProtectedProcedure` is exported from trpc.ts
2. Check it accepts StaffRole parameter
3. Verify it throws FORBIDDEN if role doesn't match

**Expected Results:**
- ✅ Middleware compiles without TypeScript errors
- ✅ StaffRole enum imported correctly
- ✅ Ready for use in Epic 2+

---

## 📊 Test Results Summary

**Date:** ___________  
**Tester:** ___________

| Test | Result | Notes |
|------|--------|-------|
| Code Review AC1-12 | ✅ PASS | All criteria verified in code |
| Test 1: Registration | ⏸️ PENDING | Manual verification needed |
| Test 2: Valid Login | ⏸️ PENDING | Manual verification needed |
| Test 3: Invalid Login | ⏸️ PENDING | Manual verification needed |
| Test 4: Protected Route Redirect | ⏸️ PENDING | Manual verification needed |
| Test 5: Protected tRPC 401 | ⏸️ PENDING | Manual verification needed |
| Test 6: Session Persistence | ⏸️ PENDING | Manual verification needed |
| Test 7: Venue Access Valid | ⏸️ PENDING | Manual verification needed |
| Test 8: Venue Access Invalid | ⏸️ PENDING | Manual verification needed |
| Test 9: List Accessible Venues | ⏸️ PENDING | Manual verification needed |
| Test 10: Role Middleware Skeleton | ✅ PASS | Code verified, ready for Epic 2 |

---

## ✅ Final Approval Criteria

**Story 1.3 is approved when:**
- [x] Code review: All 12 ACs verified in implementation
- [ ] Manual tests: At least Tests 1-6 pass successfully
- [ ] TypeScript: 0 compilation errors
- [ ] ESLint: 0 warnings/errors
- [ ] Prettier: All files formatted
- [ ] Git: All changes committed to feature branch
- [ ] Documentation: Story status updated to "review"

**Recommended for merge to main when:**
- [ ] All manual tests pass
- [ ] Code reviewed by team member (optional for solo projects)
- [ ] No blocking bugs identified

---

## 🔧 Quick Test Data Setup

**Create Test User (via Prisma Studio or SQL):**
```sql
-- Run in database
INSERT INTO users (id, email, name, password_hash, created_at, updated_at)
VALUES (
  'test-user-1',
  'test@crowdiant.com',
  'Test User',
  -- bcrypt hash for "password123" (cost 10)
  '$2a$10$example_hash_here',
  NOW(),
  NOW()
);
```

**Or use tRPC register mutation:**
```javascript
// In browser console after importing tRPC client
await trpc.auth.register.mutate({
  email: 'test@crowdiant.com',
  password: 'password123',
  name: 'Test User'
});
```

**Create Test Venue:**
```sql
INSERT INTO venues (id, name, slug, created_at, updated_at)
VALUES ('venue-1', 'Test Restaurant', 'test-restaurant', NOW(), NOW());
```

**Create Staff Assignment:**
```sql
INSERT INTO staff_assignments (id, user_id, venue_id, role, created_at, updated_at)
VALUES ('assign-1', 'test-user-1', 'venue-1', 'OWNER', NOW(), NOW());
```
