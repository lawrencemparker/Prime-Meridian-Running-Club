"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = supabaseServer();
  await supabase.auth.signOut();
  redirect("/auth/sign-in");
}

import { signOut } from "@/app/actions/auth";

<form action={signOut}>
  <button type="submit">Sign out</button>
</form>
