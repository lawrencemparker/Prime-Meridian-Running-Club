// lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client.
 * Uses direct NEXT_PUBLIC_* access so Next can inline env values into the client bundle.
 */
export function supabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
  if (!anon) throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createBrowserClient(url, anon);
}
