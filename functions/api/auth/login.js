import { createClient } from "@supabase/supabase-js";
import bcryptjs from "bcryptjs";
import jwt from "@tsndr/cloudflare-worker-jwt";

export async function onRequestPost({ request, env }) {
  const { username, password } = await request.json();
  if (!username || !password) {
    return Response.json({
      success: false,
      message: "กรุณาป้อนชื่อผู้ใช้ และรหัสผ่าน",
    });
  }

  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
const { data, error } = await supabase
  .from("users")
  .select("*")
  .eq("username", username.trim())
  .maybeSingle();

if (error || !data) {
  return res.json({
    success: false,
    message: "ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ",
  });
}

  const ok = await bcryptjs.compare(password, data.password);
  if (!ok) {
    return Response.json({
      success: false,
      message: "ชื่อผู้ใช้ หรือ รหัสผ่านไม่ถูกต้อง",
    });
  }

  const user = {
    id: data.id,
    username: data.username,
    fullname: data.fullname,
    department: data.department,
    role: data.role,
  };
  const token = await jwt.sign(user, env.JWT_SECRET);
  return Response.json({ success: true, user, token });
}
