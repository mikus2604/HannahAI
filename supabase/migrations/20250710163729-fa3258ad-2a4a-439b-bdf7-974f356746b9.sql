-- Clean up stale in-progress calls that are older than 10 minutes
UPDATE calls 
SET call_status = 'completed', 
    ended_at = started_at + INTERVAL '60 seconds',
    call_duration = 60,
    updated_at = NOW()
WHERE call_status = 'in-progress' 
  AND created_at < NOW() - INTERVAL '10 minutes';

-- Create a function to automatically clean up stale calls
CREATE OR REPLACE FUNCTION cleanup_stale_calls()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE calls 
  SET call_status = 'completed', 
      ended_at = COALESCE(ended_at, started_at + INTERVAL '60 seconds'),
      call_duration = COALESCE(call_duration, 60),
      updated_at = NOW()
  WHERE call_status = 'in-progress' 
    AND created_at < NOW() - INTERVAL '10 minutes';
END;
$$;