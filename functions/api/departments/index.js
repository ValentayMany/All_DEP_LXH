import { createClient } from "@supabase/supabase-js";

export async function onRequestGet({ env }) {
  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
  const { data, error } = await sb.from("departments").select("*").order("name");
  if (error) return Response.json({ success: false, message: error.message });
  return Response.json({ success: true, data });
}