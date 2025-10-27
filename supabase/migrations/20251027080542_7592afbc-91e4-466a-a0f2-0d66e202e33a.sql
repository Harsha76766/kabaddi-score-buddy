-- Add phone number to profiles and make email optional
ALTER TABLE public.profiles 
  ALTER COLUMN email DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS team_name TEXT;

-- Create tournaments table
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  ground TEXT NOT NULL,
  organizer_id UUID REFERENCES public.profiles(id) NOT NULL,
  organizer_name TEXT NOT NULL,
  organizer_phone TEXT NOT NULL,
  organizer_email TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  category TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add tournament_id to matches
ALTER TABLE public.matches 
  ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES public.tournaments(id);

-- Enable RLS on tournaments
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

-- Tournaments policies
CREATE POLICY "Anyone can view tournaments"
  ON public.tournaments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create tournaments"
  ON public.tournaments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Organizers can update their tournaments"
  ON public.tournaments FOR UPDATE
  USING (auth.uid() = organizer_id);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('tournament-logos', 'tournament-logos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for tournament logos
CREATE POLICY "Anyone can view tournament logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tournament-logos');

CREATE POLICY "Authenticated users can upload tournament logos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'tournament-logos' 
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update tournament logos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'tournament-logos' 
    AND auth.uid() IS NOT NULL
  );

-- Storage policies for profile photos
CREATE POLICY "Anyone can view profile photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-photos');

CREATE POLICY "Users can upload their own profile photo"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own profile photo"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );