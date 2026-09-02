-- Alternative: Restart PostgREST by changing a config
-- This forces PostgREST to restart and reload schema

-- Method 1: Trigger a settings change
SELECT set_config('pgrst.db_schema', 'public', false);

-- Method 2: Send multiple NOTIFY signals
DO $$ 
BEGIN
  FOR i IN 1..5 LOOP
    PERFORM pg_notify('pgrst', 'reload schema');
    PERFORM pg_notify('pgrst', 'reload config');
    PERFORM pg_sleep(0.5);
  END LOOP;
  RAISE NOTICE 'Sent 5 reload notifications';
END $$;

-- Method 3: Check if PostgREST is listening
SELECT * FROM pg_listening_channels();

SELECT 'NOTIFY signals sent. Wait 30 seconds then test again.' as message;
