-- Add admin user type to the enum
ALTER TYPE public.user_type ADD VALUE IF NOT EXISTS 'admin';

-- Create the admin user in the normal auth system
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'henriquepetrelli1996@gmail.com',
  crypt('Petrelli123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO UPDATE SET
  encrypted_password = crypt('Petrelli123', gen_salt('bf')),
  updated_at = now();

-- Insert admin profile
INSERT INTO public.profiles (user_id, user_type, full_name, created_at, updated_at)
SELECT 
  id, 
  'admin'::public.user_type, 
  'Administrador do Sistema',
  now(),
  now()
FROM auth.users 
WHERE email = 'henriquepetrelli1996@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET
  user_type = 'admin'::public.user_type,
  full_name = 'Administrador do Sistema',
  updated_at = now();

-- Remove the separate admin_users table as we won't need it
DROP TABLE IF EXISTS public.admin_users;