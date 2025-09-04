-- Enable RLS on all tables that have policies but RLS is disabled
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on tables that don't have it enabled yet
ALTER TABLE public.call_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_participants ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin_users table
CREATE POLICY "Only super admins can view admin users" 
ON public.admin_users 
FOR SELECT 
USING (is_super_admin());

CREATE POLICY "Only super admins can manage admin users" 
ON public.admin_users 
FOR ALL 
USING (is_super_admin());

-- Create RLS policies for call_rooms table
CREATE POLICY "Users can view call rooms they participate in" 
ON public.call_rooms 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.call_participants 
    WHERE call_room_id = id AND user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can create call rooms" 
ON public.call_rooms 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Create RLS policies for call_participants table
CREATE POLICY "Users can view their own participation" 
ON public.call_participants 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can join call rooms" 
ON public.call_participants 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own participation" 
ON public.call_participants 
FOR UPDATE 
USING (user_id = auth.uid());