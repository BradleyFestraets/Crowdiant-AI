# Story 2.2: Staff Invitation & Management

**Story ID:** E2.2  
**Type:** Feature  
**Priority:** P0  
**Effort:** 5 points  
**Sprint:** Sprint 1  
**Epic:** User & Venue Management (Epic 2)  
**FR:** FR2, FR3  

---

## User Story

**As a** venue owner or manager  
**I want to** invite staff members and assign roles  
**So that** my team can use the system  

---

## Acceptance Criteria

- [ ] **AC1:** Create staff management page at `/dashboard/[slug]/settings/staff`
- [ ] **AC2:** Display list of current staff with their roles, email, and status (active/pending)
- [ ] **AC3:** "Invite Staff" button opens modal with email and role selection
- [ ] **AC4:** Form collects: email, role (Owner/Manager/Server/Kitchen/Host/Cashier)
- [ ] **AC5:** Send invitation email with unique registration link (expires in 7 days)
- [ ] **AC6:** Invited user can complete registration via invitation link
- [ ] **AC7:** Owner/Manager can edit staff roles (except cannot demote self from Owner)
- [ ] **AC8:** Owner/Manager can deactivate staff accounts (soft delete StaffAssignment)
- [ ] **AC9:** Log staff management actions for audit trail
- [ ] **AC10:** Only Owner and Manager roles can access staff management

---

## Technical Specification

### Database Schema Changes

Add new model for staff invitations:

```prisma
model StaffInvitation {
  id                      String   @id @default(cuid())
  venueId                 String
  email                   String
  role                    StaffRole
  token                   String   @unique // Secure invitation token
  expiresAt               DateTime
  invitedById             String   // User who sent invitation
  acceptedAt              DateTime?
  
  createdAt               DateTime @default(now())
  
  venue                   Venue    @relation(fields: [venueId], references: [id], onDelete: Cascade)
  invitedBy               User     @relation("InvitedBy", fields: [invitedById], references: [id])
  
  @@unique([venueId, email]) // One pending invite per email per venue
  @@index([token])
  @@index([venueId])
  @@index([email])
  @@map("staff_invitations")
}
```

Update User model to add relation:

```prisma
model User {
  // ... existing fields
  invitationsSent         StaffInvitation[] @relation("InvitedBy")
}
```

Update Venue model to add relation:

```prisma
model Venue {
  // ... existing fields
  invitations             StaffInvitation[]
}
```

### API Endpoints (tRPC)

#### `user.inviteStaff` (mutation)
**Input:**
```typescript
z.object({
  venueId: z.string(),
  email: z.string().email(),
  role: z.enum(['OWNER', 'MANAGER', 'SERVER', 'KITCHEN', 'HOST', 'CASHIER']),
})
```

**Authorization:** Owner or Manager role required

**Logic:**
1. Verify user has Owner/Manager role for venue
2. Check if email already has active staff assignment → error
3. Check if pending invitation exists → resend or error
4. Generate secure token (nanoid or crypto.randomUUID)
5. Create StaffInvitation record (expires in 7 days)
6. Send invitation email via Resend
7. Return success with invitation ID

#### `user.listStaff` (query)
**Input:**
```typescript
z.object({
  venueId: z.string(),
})
```

**Authorization:** Any staff with venue access

**Returns:**
```typescript
{
  activeStaff: Array<{
    id: string;
    user: { id: string; name: string; email: string; image?: string };
    role: StaffRole;
    createdAt: Date;
  }>;
  pendingInvitations: Array<{
    id: string;
    email: string;
    role: StaffRole;
    expiresAt: Date;
    createdAt: Date;
  }>;
}
```

#### `user.updateStaffRole` (mutation)
**Input:**
```typescript
z.object({
  staffAssignmentId: z.string(),
  role: z.enum(['OWNER', 'MANAGER', 'SERVER', 'KITCHEN', 'HOST', 'CASHIER']),
})
```

**Authorization:** Owner or Manager role required

**Business Rules:**
- Owner cannot demote themselves
- Manager cannot change Owner's role
- Manager cannot promote to Owner

#### `user.deactivateStaff` (mutation)
**Input:**
```typescript
z.object({
  staffAssignmentId: z.string(),
})
```

**Authorization:** Owner or Manager role required

**Logic:**
1. Soft delete (set `deletedAt`) on StaffAssignment
2. Cannot deactivate self
3. Cannot deactivate last Owner

#### `user.revokeInvitation` (mutation)
**Input:**
```typescript
z.object({
  invitationId: z.string(),
})
```

**Authorization:** Owner or Manager role required

#### `user.resendInvitation` (mutation)
**Input:**
```typescript
z.object({
  invitationId: z.string(),
})
```

**Authorization:** Owner or Manager role required

**Logic:**
1. Extend expiration by 7 days
2. Resend email

#### `user.acceptInvitation` (mutation) - Public
**Input:**
```typescript
z.object({
  token: z.string(),
  name: z.string(),
  password: z.string().min(8),
})
```

**Logic:**
1. Validate token exists and not expired
2. Check if user exists with email → link to existing account
3. If new user → create User with hashed password
4. Create StaffAssignment with role from invitation
5. Mark invitation as accepted
6. Return redirect to venue dashboard

### Email Integration (Resend)

Install and configure Resend:

```bash
pnpm add resend
```

**Environment Variable:**
```env
RESEND_API_KEY=re_xxxxx
```

**Email Template:** `src/lib/email/staff-invitation.tsx`

```tsx
import { Html, Head, Body, Container, Text, Link, Button } from '@react-email/components';

interface StaffInvitationEmailProps {
  venueName: string;
  inviterName: string;
  role: string;
  inviteUrl: string;
  expiresAt: Date;
}

export function StaffInvitationEmail({
  venueName,
  inviterName,
  role,
  inviteUrl,
  expiresAt,
}: StaffInvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Body>
        <Container>
          <Text>You've been invited to join {venueName}</Text>
          <Text>
            {inviterName} has invited you to join {venueName} as a {role}.
          </Text>
          <Button href={inviteUrl}>Accept Invitation</Button>
          <Text>
            This invitation expires on {expiresAt.toLocaleDateString()}.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

**Email Service:** `src/lib/email/index.ts`

```typescript
import { Resend } from 'resend';
import { StaffInvitationEmail } from './staff-invitation';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendStaffInvitation(params: {
  to: string;
  venueName: string;
  inviterName: string;
  role: string;
  token: string;
}) {
  const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${params.token}`;
  
  await resend.emails.send({
    from: 'Crowdiant <noreply@crowdiant.com>',
    to: params.to,
    subject: `You're invited to join ${params.venueName} on Crowdiant`,
    react: StaffInvitationEmail({
      venueName: params.venueName,
      inviterName: params.inviterName,
      role: params.role,
      inviteUrl,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }),
  });
}
```

### UI Components

#### Pages

1. **Staff Management Page:** `src/app/dashboard/[slug]/settings/staff/page.tsx`
2. **Accept Invitation Page:** `src/app/invite/[token]/page.tsx`

#### Components

1. **StaffList:** `src/components/staff/StaffList.tsx`
   - Table displaying active staff and pending invitations
   - Action buttons for edit role, deactivate, resend invite

2. **InviteStaffModal:** `src/components/staff/InviteStaffModal.tsx`
   - Dialog with email input and role selector
   - Form validation with zod

3. **RoleSelector:** `src/components/staff/RoleSelector.tsx`
   - Select component with role options
   - Shows role description/permissions

4. **EditRoleModal:** `src/components/staff/EditRoleModal.tsx`
   - Edit role for existing staff member

5. **AcceptInvitationForm:** `src/components/staff/AcceptInvitationForm.tsx`
   - Name, password inputs for new user registration

### Audit Logging

Create audit log entries for:
- Staff invited
- Invitation accepted
- Role changed
- Staff deactivated
- Invitation revoked
- Invitation resent

```typescript
interface AuditEntry {
  venueId: string;
  userId: string; // Actor
  action: 'STAFF_INVITED' | 'INVITATION_ACCEPTED' | 'ROLE_CHANGED' | 'STAFF_DEACTIVATED' | 'INVITATION_REVOKED' | 'INVITATION_RESENT';
  resourceType: 'StaffAssignment' | 'StaffInvitation';
  resourceId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
```

---

## UI/UX Design

### Staff List Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Settings > Staff Management                    [+ Invite Staff] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Active Staff (3)                                                │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Avatar │ Name           │ Email              │ Role    │ ⋮  │ │
│ │ ──────────────────────────────────────────────────────────── │ │
│ │   👤   │ John Smith     │ john@resto.com     │ Owner   │ ⋮  │ │
│ │   👤   │ Sarah Jones    │ sarah@resto.com    │ Manager │ ⋮  │ │
│ │   👤   │ Mike Wilson    │ mike@resto.com     │ Server  │ ⋮  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ Pending Invitations (1)                                         │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Email              │ Role    │ Expires    │ Actions         │ │
│ │ ─────────────────────────────────────────────────────────── │ │
│ │ new@resto.com      │ Server  │ Dec 7      │ Resend | Revoke │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Invite Staff Modal

```
┌─────────────────────────────────────────────────┐
│ Invite Staff Member                         ✕  │
├─────────────────────────────────────────────────┤
│                                                 │
│ Email Address                                   │
│ ┌─────────────────────────────────────────────┐ │
│ │ name@example.com                            │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Role                                            │
│ ┌─────────────────────────────────────────────┐ │
│ │ Server                                    ▼ │ │
│ └─────────────────────────────────────────────┘ │
│ Servers can take orders and manage tables.      │
│                                                 │
│          [Cancel]              [Send Invite]    │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Test Cases

### Unit Tests
- `generateBaseSlug` handles invitation tokens correctly
- Role permission matrix enforced correctly
- Email validation rejects invalid formats
- Token expiration check works

### Integration Tests
1. **Invite Staff Flow:**
   - Manager invites staff → invitation created → email queued
   - Cannot invite existing staff member
   - Cannot invite with pending invitation

2. **Accept Invitation Flow:**
   - Valid token → registration completes → staff assignment created
   - Expired token → error message
   - Used token → error message

3. **Role Management:**
   - Owner can change any role
   - Manager can change Server/Kitchen/Host/Cashier roles
   - Manager cannot promote to Owner
   - Cannot demote self

4. **Deactivation:**
   - Cannot deactivate last Owner
   - Cannot deactivate self
   - Soft delete sets `deletedAt`

### E2E Tests
- Full invitation flow from send to accept
- Staff list displays correctly
- Role changes persist

---

## Dependencies

### New Packages
- `resend` - Email delivery
- `@react-email/components` - Email templates
- `nanoid` - Secure token generation (or use crypto.randomUUID)

### Environment Variables
```env
RESEND_API_KEY=re_xxxxx
# Note: NEXTAUTH_URL already exists for base URL
```

---

## Security Considerations

1. **Token Security:**
   - Use cryptographically secure random tokens (32+ chars)
   - Tokens expire after 7 days
   - Tokens are single-use (marked as accepted)

2. **Authorization:**
   - All mutations verify caller's role
   - Owner/Manager only for staff management
   - Cannot escalate beyond own permissions

3. **Rate Limiting:**
   - Limit invitation sends per venue (10/hour)
   - Limit invitation accepts per IP (5/hour)

4. **Email Security:**
   - Validate email format strictly
   - Prevent email enumeration (generic error messages)

---

## Definition of Done

- [ ] Staff management page accessible at `/dashboard/[slug]/settings/staff`
- [ ] Staff list displays active members and pending invitations
- [ ] Invite modal sends email with working link
- [ ] Invitation acceptance creates user and staff assignment
- [ ] Role editing works with proper authorization
- [ ] Staff deactivation soft-deletes assignment
- [ ] Audit logs created for all actions
- [ ] All test cases passing
- [ ] No TypeScript errors
- [ ] ESLint passing

---

## Story Points Breakdown

| Task | Points |
|------|--------|
| Database schema (StaffInvitation) | 0.5 |
| tRPC mutations (invite, list, update, deactivate) | 1.5 |
| Email integration (Resend + template) | 1 |
| Staff list page UI | 1 |
| Invitation acceptance page | 0.5 |
| Tests (unit + integration) | 0.5 |
| **Total** | **5** |

---

## Notes

- Resend is the chosen email provider per architecture.md
- Follow existing patterns from Story 2.1 for tRPC mutations
- Use shadcn/ui Dialog for modals, Table for list
- Token generation should use `crypto.randomUUID()` (Node.js built-in)
