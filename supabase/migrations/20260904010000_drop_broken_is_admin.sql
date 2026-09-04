-- is_admin(uuid) was reduced to a permanent `SELECT false` stub by an old
-- migration ("Simplified for now") and never fixed afterwards. Its one
-- remaining caller (admin-psychologist-management edge function) has been
-- switched to use is_super_admin(), the function every other admin-only
-- check in this codebase already relies on. Dropping the stub so nothing
-- can accidentally call it again and get a silent, permanent "access
-- denied" (or, if someone "fixes" it without noticing is_super_admin
-- already exists, a second parallel admin-check implementation to keep in
-- sync).

DROP FUNCTION IF EXISTS public.is_admin(uuid);
