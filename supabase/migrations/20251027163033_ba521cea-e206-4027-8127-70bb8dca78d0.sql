-- Create tournament_teams junction table
CREATE TABLE public.tournament_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  points INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tournament_id, team_id)
);

-- Enable RLS
ALTER TABLE public.tournament_teams ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tournament_teams
CREATE POLICY "Anyone can view tournament teams"
  ON public.tournament_teams FOR SELECT
  USING (true);

CREATE POLICY "Organizers can add teams to their tournaments"
  ON public.tournament_teams FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE id = tournament_id AND organizer_id = auth.uid()
    )
  );

CREATE POLICY "Organizers can update their tournament teams"
  ON public.tournament_teams FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE id = tournament_id AND organizer_id = auth.uid()
    )
  );

CREATE POLICY "Organizers can remove teams from their tournaments"
  ON public.tournament_teams FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE id = tournament_id AND organizer_id = auth.uid()
    )
  );

-- Create team_join_requests table for invite links
CREATE TABLE public.team_join_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days')
);

-- Enable RLS
ALTER TABLE public.team_join_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_join_requests
CREATE POLICY "Anyone can view active invites"
  ON public.team_join_requests FOR SELECT
  USING (expires_at > now());

CREATE POLICY "Team creators can create invites"
  ON public.team_join_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE id = team_id AND created_by = auth.uid()
    )
  );

-- Add tournament_id foreign key to matches if not already constrained
ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_tournament_id_fkey,
  ADD CONSTRAINT matches_tournament_id_fkey 
  FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;

-- Create function to update tournament team stats
CREATE OR REPLACE FUNCTION public.update_tournament_team_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update team A stats
  IF NEW.status = 'completed' AND NEW.tournament_id IS NOT NULL THEN
    UPDATE public.tournament_teams
    SET 
      wins = CASE WHEN NEW.team_a_score > NEW.team_b_score THEN wins + 1 ELSE wins END,
      losses = CASE WHEN NEW.team_a_score < NEW.team_b_score THEN losses + 1 ELSE losses END,
      points = CASE 
        WHEN NEW.team_a_score > NEW.team_b_score THEN points + 2
        WHEN NEW.team_a_score = NEW.team_b_score THEN points + 1
        ELSE points
      END
    WHERE tournament_id = NEW.tournament_id AND team_id = NEW.team_a_id;

    -- Update team B stats
    UPDATE public.tournament_teams
    SET 
      wins = CASE WHEN NEW.team_b_score > NEW.team_a_score THEN wins + 1 ELSE wins END,
      losses = CASE WHEN NEW.team_b_score < NEW.team_a_score THEN losses + 1 ELSE losses END,
      points = CASE 
        WHEN NEW.team_b_score > NEW.team_a_score THEN points + 2
        WHEN NEW.team_b_score = NEW.team_a_score THEN points + 1
        ELSE points
      END
    WHERE tournament_id = NEW.tournament_id AND team_id = NEW.team_b_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for updating tournament stats
CREATE TRIGGER update_tournament_stats_on_match_complete
  AFTER UPDATE OF status ON public.matches
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
  EXECUTE FUNCTION public.update_tournament_team_stats();