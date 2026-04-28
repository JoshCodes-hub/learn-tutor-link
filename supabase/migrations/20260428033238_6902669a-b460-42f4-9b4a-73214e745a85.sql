-- =========================================================
-- 1) ROLES
-- =========================================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'school_owner';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'school_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'teacher';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'parent';
