-- Update the handle_new_user trigger to handle phone signups properly
-- Make name nullable temporarily or provide a default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name, phone)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'name', 
      new.raw_user_meta_data->>'full_name',
      split_part(COALESCE(new.email, new.phone, 'user'), '@', 1),
      'User'
    ),
    COALESCE(new.phone, new.raw_user_meta_data->>'phone')
  );
  RETURN new;
END;
$function$;