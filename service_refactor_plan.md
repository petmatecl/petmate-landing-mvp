# Refactoring: Services & Consistency

## Goal
Reduce logic in components (`UserContext`, `Dashboards`) by moving it to consistent services.

## New Services
1.  **`lib/errorMapper.ts`**:
    *   Maps Supabase error codes/messages to friendly Spanish text.
    *   Standardizes UI feedback.

2.  **`lib/authService.ts`**:
    *   `getUserStatus(user, profile)`: Returns `{ roles, activeRole, capabilities, onboardingStatus }`.
    *   `fetchProfile(userId)`: Centralizes profile fetching.
    *   `deriveCapabilities(profile)`: Moves complexity out of Context.
    *   `calculateOnboardingStatus(user, profile)`: Moves complexity out of Context.

3.  **`components/Shared/RouteGuard.tsx`** (Renamed/Enhanced `RoleGuard`):
    *   Single point of protection.
    *   Accepts `requiredRole` AND `requiredOnboarding`.
    *   Default usage: `<RouteGuard>...</RouteGuard>` protects auth only.
    *   Specific usage: `<RouteGuard requiredRole="sitter">...</RouteGuard>`.

## Steps
1.  Create `errorMapper.ts`.
2.  Create `authService.ts` (extracting logic from `UserContext`).
3.  Update `UserContext.tsx` to consume `authService`.
4.  Rename/Solidify `RoleGuard` -> `RouteGuard`.
