-- Fix 1: Restrict match updates to authorized users only
-- Drop the overly permissive update policy
DROP POLICY IF EXISTS "Authenticated users can update matches" ON public.matches;

-- Only match creator, scorer, or referee can update
CREATE POLICY "Authorized users can update matches"
  ON public.matches FOR UPDATE
  USING (
    auth.uid() = created_by
    OR auth.uid() = scorer_id
    OR auth.uid() = referee_id
  );

-- Tournament organizers can update tournament matches
CREATE POLICY "Tournament organizers can update their matches"
  ON public.matches FOR UPDATE
  USING (
    tournament_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM tournaments
      WHERE tournaments.id = matches.tournament_id
      AND tournaments.organizer_id = auth.uid()
    )
  );

-- Fix 2: Create server-side validated function for match event insertion
CREATE OR REPLACE FUNCTION public.insert_match_event(
  p_match_id UUID,
  p_event_type TEXT,
  p_raider_id UUID,
  p_defender_ids UUID[],
  p_team_id UUID,
  p_points_awarded INTEGER,
  p_raid_time INTEGER,
  p_is_do_or_die BOOLEAN,
  p_is_all_out BOOLEAN,
  p_event_data JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_match_status TEXT;
  v_team_a_id UUID;
  v_team_b_id UUID;
BEGIN
  -- Validate match is live
  SELECT status, team_a_id, team_b_id 
  INTO v_match_status, v_team_a_id, v_team_b_id
  FROM matches WHERE id = p_match_id;
  
  IF v_match_status IS NULL THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
  
  IF v_match_status != 'live' THEN
    RAISE EXCEPTION 'Cannot add events to non-live match';
  END IF;
  
  -- Validate team belongs to match
  IF p_team_id IS NOT NULL AND p_team_id != v_team_a_id AND p_team_id != v_team_b_id THEN
    RAISE EXCEPTION 'Team does not belong to this match';
  END IF;
  
  -- Validate points are within valid range (0-7 for Kabaddi)
  IF p_points_awarded < 0 OR p_points_awarded > 7 THEN
    RAISE EXCEPTION 'Invalid point value: must be between 0 and 7';
  END IF;
  
  -- Validate raid time (must be between 0 and 60 seconds)
  IF p_raid_time IS NOT NULL AND (p_raid_time < 0 OR p_raid_time > 60) THEN
    RAISE EXCEPTION 'Invalid raid time: must be between 0 and 60 seconds';
  END IF;
  
  -- Validate raider belongs to the team
  IF p_raider_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM players WHERE id = p_raider_id AND team_id = p_team_id
  ) THEN
    RAISE EXCEPTION 'Raider does not belong to the specified team';
  END IF;
  
  -- Validate defenders belong to the opposing team
  IF p_defender_ids IS NOT NULL AND array_length(p_defender_ids, 1) > 0 THEN
    DECLARE
      v_opposing_team_id UUID;
    BEGIN
      -- Get opposing team ID
      v_opposing_team_id := CASE 
        WHEN p_team_id = v_team_a_id THEN v_team_b_id
        ELSE v_team_a_id
      END;
      
      -- Check all defenders belong to opposing team
      IF EXISTS (
        SELECT 1 FROM unnest(p_defender_ids) AS defender_id
        WHERE NOT EXISTS (
          SELECT 1 FROM players 
          WHERE id = defender_id AND team_id = v_opposing_team_id
        )
      ) THEN
        RAISE EXCEPTION 'One or more defenders do not belong to the opposing team';
      END IF;
    END;
  END IF;
  
  -- Insert validated event
  INSERT INTO match_events (
    match_id, event_type, raider_id, defender_ids,
    team_id, points_awarded, raid_time,
    is_do_or_die, is_all_out, event_data
  ) VALUES (
    p_match_id, p_event_type, p_raider_id, p_defender_ids,
    p_team_id, p_points_awarded, p_raid_time,
    p_is_do_or_die, p_is_all_out, p_event_data
  ) RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;