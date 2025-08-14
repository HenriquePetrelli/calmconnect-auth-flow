-- Remove the is_online column since presence will be determined by record existence
ALTER TABLE psychologist_presence DROP COLUMN IF EXISTS is_online;

-- Update RLS policies to reflect the new logic
DROP POLICY IF EXISTS "Psychologists can manage their own presence" ON psychologist_presence;
DROP POLICY IF EXISTS "Public can view online psychologists" ON psychologist_presence;

-- Allow psychologists to manage their own presence records
CREATE POLICY "Psychologists can manage their own presence" 
ON psychologist_presence
FOR ALL USING (psychologist_id = auth.uid());

-- Allow public to view all presence records (existence = online status)
CREATE POLICY "Public can view available psychologists"
ON psychologist_presence
FOR SELECT USING (true);

-- Add an index for better query performance
CREATE INDEX IF NOT EXISTS idx_psychologist_presence_last_status 
ON psychologist_presence(last_status_change DESC);