-- Add user_id to players table to link with registered users
ALTER TABLE public.players 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX idx_players_user_id ON public.players(user_id);

-- Update RLS policies to ensure only registered users can be added as players
DROP POLICY IF EXISTS "Authenticated users can create players" ON public.players;
DROP POLICY IF EXISTS "Authenticated users can update players" ON public.players;

CREATE POLICY "Authenticated users can create players for registered users"
ON public.players
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM auth.users WHERE id = user_id)
);

CREATE POLICY "Users can update their own player profile or team managers can update"
ON public.players
FOR UPDATE
USING (
  auth.uid() = user_id 
  OR auth.uid() IN (
    SELECT created_by FROM teams WHERE id = team_id
  )
);

CREATE POLICY "Team managers can delete players from their teams"
ON public.players
FOR DELETE
USING (
  auth.uid() IN (
    SELECT created_by FROM teams WHERE id = team_id
  )
);

-- Insert 16 dummy registered players with phone numbers
-- Note: These will need actual user accounts to be fully functional
INSERT INTO public.players (name, phone, user_id, jersey_number, matches_played, total_raid_points, total_tackle_points, total_bonus_points) VALUES
('Rahul Kumar', '+919876543210', NULL, 7, 0, 0, 0, 0),
('Vikas Singh', '+919876543211', NULL, 12, 0, 0, 0, 0),
('Amit Patel', '+919876543212', NULL, 3, 0, 0, 0, 0),
('Suresh Reddy', '+919876543213', NULL, 21, 0, 0, 0, 0),
('Deepak Sharma', '+919876543214', NULL, 9, 0, 0, 0, 0),
('Rajesh Yadav', '+919876543215', NULL, 15, 0, 0, 0, 0),
('Manoj Verma', '+919876543216', NULL, 6, 0, 0, 0, 0),
('Sachin Gupta', '+919876543217', NULL, 18, 0, 0, 0, 0),
('Anil Chauhan', '+919876543218', NULL, 4, 0, 0, 0, 0),
('Ravi Joshi', '+919876543219', NULL, 11, 0, 0, 0, 0),
('Pradeep Thakur', '+919876543220', NULL, 14, 0, 0, 0, 0),
('Sanjay Mishra', '+919876543221', NULL, 8, 0, 0, 0, 0),
('Dinesh Pandey', '+919876543222', NULL, 20, 0, 0, 0, 0),
('Ashok Saxena', '+919876543223', NULL, 5, 0, 0, 0, 0),
('Mukesh Tiwari', '+919876543224', NULL, 13, 0, 0, 0, 0),
('Ramesh Dubey', '+919876543225', NULL, 10, 0, 0, 0, 0);