import { createClient } from "@supabase/supabase-js";
import bcryptjs from "bcryptjs";

export async function onRequestPost({ request, env }) {
  const { username, password, fullname, department } = await request.json();
  if (!username || !password || !fullname || !department) {
    return Response.json({
      success: false,
      message: "กรุณากรอกข้อมูลให้ครบ",
    });
  }

  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
  const { data: existing } = await sb
    .from("users")
    .select("id")
    .eq("username", username.trim())
    .single();
  if (existing) {
    return Response.json({
      success: false,
      message: "ชื่อผู้ใช้นี้ถูกใช้งานแล้ว",
    });
  }

  const hashed = await bcryptjs.hash(password, 10);
  const { error } = await sb.from("users").insert({
    username: username.trim(),
    password: hashed,
    fullname: fullname.trim(),
    department: department.trim(),
    role: "user",
  });
  if (error) return Response.json({ success: false, message: error.message });
  return Response.json({ success: true });
}
