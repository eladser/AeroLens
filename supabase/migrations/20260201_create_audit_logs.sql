-- Audit logs table for tracking user actions
-- This table stores a complete audit trail of user activities for security and analytics

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  details JSONB DEFAULT '{}',
  session_id VARCHAR(100),
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user-based queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- Index for action-based queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Composite index for user activity over time
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_time ON audit_logs(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can only read their own audit logs
CREATE POLICY "Users can read own audit logs"
  ON audit_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own audit logs
CREATE POLICY "Users can insert own audit logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can read all logs (for admin dashboard)
CREATE POLICY "Service role can read all audit logs"
  ON audit_logs
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Optional: Auto-delete old logs after 90 days (uncomment to enable)
-- CREATE OR REPLACE FUNCTION delete_old_audit_logs()
-- RETURNS void AS $$
-- BEGIN
--   DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';
-- END;
-- $$ LANGUAGE plpgsql;

-- Optional: Schedule cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-audit-logs', '0 0 * * *', 'SELECT delete_old_audit_logs()');

COMMENT ON TABLE audit_logs IS 'Audit trail for user actions - security and analytics';
COMMENT ON COLUMN audit_logs.action IS 'Action type: auth.login, trip.create, flight.track, etc.';
COMMENT ON COLUMN audit_logs.details IS 'JSON payload with action-specific details';
COMMENT ON COLUMN audit_logs.session_id IS 'Browser session identifier for grouping related actions';
