-- Add new fields to tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS tournament_type text DEFAULT 'League',
ADD COLUMN IF NOT EXISTS match_format jsonb DEFAULT '{"half_duration": 20, "players_per_team": 7}'::jsonb,
ADD COLUMN IF NOT EXISTS cover_url text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'Draft',
ADD COLUMN IF NOT EXISTS rules_json jsonb DEFAULT '{"points_system": {"win": 2, "tie": 1, "loss": 0}, "tie_breaker": "Score Difference"}'::jsonb;

-- Add new fields to matches table
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS match_number integer,
ADD COLUMN IF NOT EXISTS match_time time,
ADD COLUMN IF NOT EXISTS referee_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS scorer_id uuid REFERENCES auth.users(id);

-- Create index for tournament status
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON public.tournaments(status);

-- Create index for tournament organizer
CREATE INDEX IF NOT EXISTS idx_tournaments_organizer ON public.tournaments(organizer_id);

-- Update RLS policy to allow viewing active tournaments
DROP POLICY IF EXISTS "Anyone can view tournaments" ON public.tournaments;
CREATE POLICY "Anyone can view active tournaments" 
ON public.tournaments 
FOR SELECT 
USING (status = 'Active' OR organizer_id = auth.uid());