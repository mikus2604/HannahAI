-- Fix the cleanup_stale_calls function to remove network dependency
CREATE OR REPLACE FUNCTION public.cleanup_stale_calls()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE calls 
  SET call_status = 'completed', 
      ended_at = COALESCE(ended_at, started_at + INTERVAL '60 seconds'),
      call_duration = COALESCE(call_duration, 60),
      updated_at = NOW()
  WHERE call_status = 'in-progress' 
    AND created_at < NOW() - INTERVAL '10 minutes';
END;
$function$