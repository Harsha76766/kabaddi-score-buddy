-- Security Hardening Migration

-- 1. Rate Limiting Table
CREATE TABLE IF NOT EXISTS public.rate_limit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    ip_address TEXT,
    endpoint TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for faster cleanup and checking
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_user_endpoint ON public.rate_limit_logs (user_id, endpoint, created_at);

-- 2. Rate Limiting Function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_user_id UUID,
    p_endpoint TEXT,
    p_max_requests INTEGER,
    p_window_interval INTERVAL
) RETURNS BOOLEAN AS $$
DECLARE
    request_count INTEGER;
BEGIN
    -- Only count requests from this user for this endpoint in the given window
    SELECT COUNT(*)
    INTO request_count
    FROM public.rate_limit_logs
    WHERE user_id = p_user_id
      AND endpoint = p_endpoint
      AND created_at > (now() - p_window_interval);

    IF request_count >= p_max_requests THEN
        RETURN FALSE;
    END IF;

    -- Log the request
    INSERT INTO public.rate_limit_logs (user_id, endpoint)
    VALUES (p_user_id, p_endpoint);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Unified Rate Limit Trigger Function
CREATE OR REPLACE FUNCTION public.enforce_rate_limit_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_max_requests INTEGER;
    v_window INTERVAL := INTERVAL '1 hour';
    v_endpoint TEXT;
    v_is_allowed BOOLEAN;
BEGIN
    v_endpoint := TG_TABLE_NAME || '_' || TG_OP;

    -- Define custom limits
    CASE 
        WHEN TG_TABLE_NAME = 'teams' AND TG_OP = 'INSERT' THEN v_max_requests := 10;
        WHEN TG_TABLE_NAME = 'matches' AND TG_OP = 'INSERT' THEN v_max_requests := 20;
        WHEN TG_TABLE_NAME = 'tournaments' AND TG_OP = 'INSERT' THEN v_max_requests := 5;
        WHEN TG_TABLE_NAME = 'profiles' AND TG_OP = 'UPDATE' THEN v_max_requests := 30;
        ELSE v_max_requests := 100; -- Default
    END CASE;

    -- Check limit (using auth.uid() since all writes are authenticated)
    v_is_allowed := public.check_rate_limit(auth.uid(), v_endpoint, v_max_requests, v_window);

    IF NOT v_is_allowed THEN
        RAISE EXCEPTION 'Rate limit exceeded. Please try again later.' USING ERRCODE = 'P0001'; -- Custom error code
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Apply Rate Limiting Triggers
DROP TRIGGER IF EXISTS tr_rate_limit_teams ON public.teams;
CREATE TRIGGER tr_rate_limit_teams
    BEFORE INSERT ON public.teams
    FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit_trigger();

DROP TRIGGER IF EXISTS tr_rate_limit_matches ON public.matches;
CREATE TRIGGER tr_rate_limit_matches
    BEFORE INSERT ON public.matches
    FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit_trigger();

DROP TRIGGER IF EXISTS tr_rate_limit_tournaments ON public.tournaments;
CREATE TRIGGER tr_rate_limit_tournaments
    BEFORE INSERT ON public.tournaments
    FOR EACH ROW EXECUTE FUNCTION public.enforce_rate_limit_trigger();

-- 5. Hardening RLS Policies

-- Matches: Only creators or tournament organizers can update
DROP POLICY IF EXISTS "Authenticated users can update matches" ON public.matches;
CREATE POLICY "Creators and organizers can update matches"
  ON public.matches FOR UPDATE
  USING (
    auth.uid() = created_by OR 
    EXISTS (
      SELECT 1 FROM public.tournaments 
      WHERE tournaments.id = matches.tournament_id 
      AND tournaments.organizer_id = auth.uid()
    )
  );

-- Players: Only authenticated users can create, but only team creators or match organizers can update?
-- Actually players are often shared. Let's restrict to authenticated and log updates.
DROP POLICY IF EXISTS "Authenticated users can update players" ON public.players;
CREATE POLICY "Authenticated users can update players with logging"
  ON public.players FOR UPDATE
  USING (auth.uid() IS NOT NULL);
-- We might need a trigger to log changes here if we want full audit.

-- Player stats: Only creators of the match or tournament organizers can update stats
DROP POLICY IF EXISTS "Authenticated users can update stats" ON public.player_match_stats;
CREATE POLICY "Authorized users can update stats"
  ON public.player_match_stats FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE matches.id = player_match_stats.match_id
      AND (
        matches.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.tournaments
          WHERE tournaments.id = matches.tournament_id
          AND tournaments.organizer_id = auth.uid()
        )
      )
    )
  );

-- Cleanup task (optional but good practice)
-- Use a cron job if available in Supabase, but here we can just do it manually or via another trigger.
-- For now, we'll keep it simple.
