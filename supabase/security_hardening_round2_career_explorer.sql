-- Career-Explorer Security Hardening Round 2
-- Revokes direct EXECUTE access on handle_new_user from anon and authenticated.
-- The trigger fires via the trigger mechanism (which bypasses EXECUTE checks),
-- so this does not affect new user signup flow.

-- Must revoke from PUBLIC — Supabase grants EXECUTE to PUBLIC by default.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
