-- Add jersey_number to players table
ALTER TABLE public.players 
ADD COLUMN jersey_number integer;

-- Create match_events table for tracking all scoring actions (needed for undo/redo)
CREATE TABLE public.match_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  raider_id uuid REFERENCES public.players(id),
  defender_ids uuid[],
  team_id uuid REFERENCES public.teams(id),
  points_awarded integer NOT NULL DEFAULT 0,
  raid_time integer,
  is_do_or_die boolean DEFAULT false,
  is_all_out boolean DEFAULT false,
  event_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add index for faster queries
CREATE INDEX idx_match_events_match_id ON public.match_events(match_id);
CREATE INDEX idx_match_events_created_at ON public.match_events(created_at);

-- Enable RLS
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view match events"
ON public.match_events FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create match events"
ON public.match_events FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete match events (for undo)"
ON public.match_events FOR DELETE
USING (auth.uid() IS NOT NULL);