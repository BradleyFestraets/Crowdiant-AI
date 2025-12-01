# Role-Based Access Control (RBAC) Permission Matrix

**Story:** 2.9 - Role-Based Access Control Testing  
**Last Updated:** 2025-12-01

## Role Hierarchy

| Role        | Description                                   | Access Level |
| ----------- | --------------------------------------------- | ------------ |
| **OWNER**   | Full venue access including billing and admin | Full         |
| **MANAGER** | Operations management (no billing access)     | High         |
| **SERVER**  | Point of Sale and assigned tables only        | Medium       |
| **KITCHEN** | Kitchen Display System only                   | Limited      |
| **HOST**    | Reservations and seating only                 | Limited      |
| **CASHIER** | Payment processing only                       | Limited      |

## Permission Matrix

### Legend

- ✅ = Full Access
- 🔵 = Read-Only Access
- ❌ = No Access
- 🔶 = Conditional/Partial Access

### User & Staff Management

| Permission         | OWNER | MANAGER | SERVER | KITCHEN | HOST | CASHIER |
| ------------------ | ----- | ------- | ------ | ------- | ---- | ------- |
| View Staff List    | ✅    | ✅      | 🔵     | 🔵      | 🔵   | 🔵      |
| Invite Staff       | ✅    | ✅      | ❌     | ❌      | ❌   | ❌      |
| Update Staff Roles | ✅    | 🔶¹     | ❌     | ❌      | ❌   | ❌      |
| Deactivate Staff   | ✅    | 🔶¹     | ❌     | ❌      | ❌   | ❌      |
| View Own Profile   | ✅    | ✅      | ✅     | ✅      | ✅   | ✅      |
| Update Own Profile | ✅    | ✅      | ✅     | ✅      | ✅   | ✅      |

¹ Manager cannot modify OWNER roles

### Venue Settings

| Permission            | OWNER | MANAGER | SERVER | KITCHEN | HOST | CASHIER |
| --------------------- | ----- | ------- | ------ | ------- | ---- | ------- |
| View Venue Settings   | ✅    | ✅      | ❌     | ❌      | ❌   | ❌      |
| Update Venue Settings | ✅    | ❌      | ❌     | ❌      | ❌   | ❌      |
| View Billing          | ✅    | ❌      | ❌     | ❌      | ❌   | ❌      |
| Manage Stripe Connect | ✅    | ❌      | ❌     | ❌      | ❌   | ❌      |

### Point of Sale (Future - Epic 4)

| Permission          | OWNER | MANAGER | SERVER | KITCHEN | HOST | CASHIER |
| ------------------- | ----- | ------- | ------ | ------- | ---- | ------- |
| Access POS Terminal | ✅    | ✅      | ✅     | ❌      | ❌   | ✅      |
| Create Orders       | ✅    | ✅      | ✅     | ❌      | ❌   | ✅      |
| Modify Orders       | ✅    | ✅      | 🔶²    | ❌      | ❌   | 🔶²     |
| Void Orders         | ✅    | ✅      | ❌     | ❌      | ❌   | ❌      |
| Apply Discounts     | ✅    | ✅      | ❌     | ❌      | ❌   | ❌      |
| Process Refunds     | ✅    | ✅      | ❌     | ❌      | ❌   | ❌      |

² Only own orders before sending to kitchen

### Express Checkout (Future - Epic 3)

| Permission         | OWNER | MANAGER | SERVER | KITCHEN | HOST | CASHIER |
| ------------------ | ----- | ------- | ------ | ------- | ---- | ------- |
| Open Tab           | ✅    | ✅      | ✅     | ❌      | ❌   | ✅      |
| Close Tab          | ✅    | ✅      | ✅     | ❌      | ❌   | ✅      |
| Override Walk-Away | ✅    | ✅      | ❌     | ❌      | ❌   | ❌      |
| View All Tabs      | ✅    | ✅      | 🔶³    | ❌      | ❌   | ✅      |

³ Only assigned tables

### Kitchen Display System (Future - Epic 6)

| Permission       | OWNER | MANAGER | SERVER | KITCHEN | HOST | CASHIER |
| ---------------- | ----- | ------- | ------ | ------- | ---- | ------- |
| View KDS         | ✅    | ✅      | ❌     | ✅      | ❌   | ❌      |
| Bump Orders      | ✅    | ✅      | ❌     | ✅      | ❌   | ❌      |
| Mark Items Ready | ✅    | ✅      | ❌     | ✅      | ❌   | ❌      |

### Table Management (Future - Epic 8)

| Permission          | OWNER | MANAGER | SERVER | KITCHEN | HOST | CASHIER |
| ------------------- | ----- | ------- | ------ | ------- | ---- | ------- |
| View Floor Plan     | ✅    | ✅      | ✅     | ❌      | ✅   | ❌      |
| Seat Parties        | ✅    | ✅      | ❌     | ❌      | ✅   | ❌      |
| Transfer Tables     | ✅    | ✅      | 🔶⁴    | ❌      | ❌   | ❌      |
| Manage Reservations | ✅    | ✅      | ❌     | ❌      | ✅   | ❌      |

⁴ Only own tables

### Analytics & Reporting (Future - Epic 10)

| Permission           | OWNER | MANAGER | SERVER | KITCHEN | HOST | CASHIER |
| -------------------- | ----- | ------- | ------ | ------- | ---- | ------- |
| View Sales Dashboard | ✅    | ✅      | ❌     | ❌      | ❌   | ❌      |
| Export Reports       | ✅    | ✅      | ❌     | ❌      | ❌   | ❌      |
| View Labor Reports   | ✅    | ✅      | ❌     | ❌      | ❌   | ❌      |

## Implementation Details

### Middleware Chain

```typescript
// Authentication → Venue Access → Role Check
publicProcedure; // No auth required
protectedProcedure; // Auth required
venueProtectedProcedure; // Auth + Venue access required
roleProtectedProcedure; // Auth + Venue + Role required
```

### Usage Examples

```typescript
// Any authenticated user
protectedProcedure.query(async ({ ctx }) => {
  return ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
});

// Any user with venue access
venueProtectedProcedure.query(async ({ ctx, input }) => {
  return ctx.db.staffAssignment.findMany({
    where: { venueId: input.venueId, deletedAt: null },
  });
});

// Only OWNER role
roleProtectedProcedure(StaffRole.OWNER).mutation(async ({ ctx, input }) => {
  return ctx.db.venue.update({ where: { id: input.venueId }, data: input });
});
```

### Multi-Venue Considerations

- Users can have different roles at different venues
- Role is checked per-venue, not globally
- Switching venues may change available permissions
- Session stores current venue context

## Testing Coverage

| Test Category               | Status | Notes                              |
| --------------------------- | ------ | ---------------------------------- |
| Authentication Requirements | ✅     | Verified unauthenticated rejection |
| Venue Access Control        | ✅     | Verified venue membership required |
| Soft Delete Respect         | ✅     | Verified deletedAt check           |
| OWNER Permissions           | ✅     | All staff management operations    |
| MANAGER Permissions         | ✅     | Staff management (limited)         |
| Cross-Role Restrictions     | ✅     | Cannot escalate own role           |

## Future Enhancements

1. **Granular Permissions** - Per-feature permission flags
2. **Permission Delegation** - Allow owners to grant specific permissions
3. **Audit Trail** - Log all permission checks for security
4. **Custom Roles** - Venue-defined roles with custom permissions
5. **Time-Based Access** - Permissions based on shift schedules
