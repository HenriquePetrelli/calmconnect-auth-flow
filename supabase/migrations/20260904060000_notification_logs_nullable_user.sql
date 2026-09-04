-- Push sends triggered server-to-server (e.g. a new SOS request notifying
-- online psychologists) have no end-user caller to attribute the log row
-- to — only the service role. user_id must accept that.

ALTER TABLE public.notification_logs ALTER COLUMN user_id DROP NOT NULL;
