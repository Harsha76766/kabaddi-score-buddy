import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Runtime-safe client for hosted previews where env injection may be missing.
// Uses Lovable Cloud publishable values as final fallback.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? "https://bujrqklruoqcnknvefzh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1anJxa2xydW9xY25rbnZlZnpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1Mjg1MzUsImV4cCI6MjA3NzEwNDUzNX0.5lKdcObSt-taILoeDclKpvSLw2PuAQCXyb8GvnUEePg";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
