-- Add admin user type to the enum
DO $$ BEGIN
    ALTER TYPE public.user_type ADD VALUE IF NOT EXISTS 'admin';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Check if admin user already exists and delete if needed
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get the admin user ID if exists
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'henriquepetrelli1996@gmail.com';
    
    IF admin_user_id IS NOT NULL THEN
        -- Delete from profiles first
        DELETE FROM public.profiles WHERE user_id = admin_user_id;
        -- Delete from auth.users
        DELETE FROM auth.users WHERE id = admin_user_id;
    END IF;
END $$;

-- Create the admin user manually (we'll use the signup form later)
-- For now, let's just update the profiles table structure and remove admin_users
DROP TABLE IF EXISTS public.admin_users;