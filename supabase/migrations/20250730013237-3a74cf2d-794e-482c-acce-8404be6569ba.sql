-- Drop the existing view
DROP VIEW IF EXISTS admin_metrics;

-- Create a regular view without SECURITY DEFINER for dashboard metrics
CREATE VIEW admin_metrics AS
SELECT 
  (SELECT COUNT(*) FROM profiles WHERE user_type = 'patient') as total_patients,
  (SELECT COUNT(*) FROM profiles WHERE user_type = 'psychologist' AND registration_status = 'approved') as active_psychologists,
  (SELECT COUNT(*) FROM profiles WHERE user_type = 'psychologist' AND registration_status = 'pending') as pending_psychologists,
  (SELECT COUNT(*) FROM appointments WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as appointments_last_30_days,
  (SELECT COUNT(*) FROM emergency_requests WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as sos_requests_last_30_days,
  (SELECT COUNT(*) FROM subscribers WHERE subscribed = true) as active_subscribers;

-- Enable RLS on the view and create policy for admins only
ALTER VIEW admin_metrics OWNER TO supabase_admin;
GRANT SELECT ON admin_metrics TO authenticated;