-- Security Fix P0.3: Secure Reviews Policies
-- Drop permissive policies and implement strict access control based on approval status.

-- 1. Drop old permissive policy
DROP POLICY IF EXISTS "Public can view reviews" ON public.reviews;

-- 2. Create GRANULAR policies

-- A. Public Read: Only 'aprobado' reviews
CREATE POLICY "Public can view approved reviews" 
ON public.reviews FOR SELECT 
USING (estado = 'aprobado');

-- B. Author Read: Users can view their own reviews (even if pending/rejected)
CREATE POLICY "Users can view own reviews" 
ON public.reviews FOR SELECT 
USING (cliente_id = auth.uid());

-- C. Sitter Read: Sitters can view reviews about them (only approved? usually yes, maybe pending if we want them to see incoming)
-- Let's stick to approved for sitters to prevent harassment via unmoderated content, 
-- UNLESS the requirement says "autor ve las propias" which implies client.
-- Let's add Sitter view just in case, limiting to approved for safety.
CREATE POLICY "Sitters can view reviews about themselves" 
ON public.reviews FOR SELECT 
USING (sitter_id IN (
    SELECT auth_user_id FROM public.registro_petmate WHERE auth_user_id = auth.uid()
) AND estado = 'aprobado');

-- D. Admin: Full Access for moderation (assuming admin has specific role or email check, or we use Service Role for admin dashboard)
-- NOTE: Admin Dashboard often uses Service Role Key which bypasses RLS. 
-- If Admin Dashboard uses Client Key (as seen in `pages/admin.tsx`), we need a policy for Admins.
-- However, our admin check in `pages/admin.tsx` is client-side implementation detail usually backed by Service Role or specific logic.
-- If we need RLS for Admin User Sessions (authenticated via email list):
-- We can add a policy based on the email whitelist or a custom claim.
-- For now, let's assume Admin Dashboard uses Supabase Client with strict specific queries or relies on the fact that `admin.tsx` often fetches via specific patterns.
-- BUT, in `pages/admin.tsx` we saw `supabase.from("registro_petmate")` etc.
-- If `reviews` are fetched there, they need access. 
-- Let's ADD a policy for the hardcoded admin emails just to be safe if they view reviews on the front end.

CREATE POLICY "Admins can view all reviews"
ON public.reviews FOR SELECT
USING (
    auth.jwt() ->> 'email' IN (
        'admin@petmate.cl', 
        'aldo@petmate.cl', 
        'canocortes@gmail.com', 
        'eduardo.a.cordova.d@gmail.com', 
        'acanocts@gmail.com'
    )
);

-- Re-affirm Insert Policy (if needed, though drop didn't touch it, better safe)
-- DROP POLICY IF EXISTS "Clients can create reviews" ON public.reviews;
-- CREATE POLICY "Clients can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = cliente_id);
