-- Add captain_phone and logo_url to teams table
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS captain_phone TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add phone number to players table (unique to prevent duplicates)
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE;

-- Create index on phone for faster lookups
CREATE INDEX IF NOT EXISTS idx_players_phone ON public.players(phone);

-- Update RLS policies for teams to allow logo uploads
-- Users can update teams they created
DROP POLICY IF EXISTS "Users can update their teams" ON public.teams;
CREATE POLICY "Users can update their teams" 
ON public.teams 
FOR UPDATE 
USING (auth.uid() = created_by OR auth.uid() IN (
  SELECT organizer_id FROM tournaments WHERE id IN (
    SELECT tournament_id FROM tournament_teams WHERE team_id = teams.id
  )
));

-- Create storage bucket for team logos if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-logos', 'team-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view team logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload team logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their team logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their team logos" ON storage.objects;

-- Create storage policies for team logos
CREATE POLICY "Anyone can view team logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'team-logos');

CREATE POLICY "Authenticated users can upload team logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'team-logos' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update their team logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'team-logos' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their team logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'team-logos' 
  AND auth.uid() IS NOT NULL
);