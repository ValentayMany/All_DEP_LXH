import { createClient } from "@supabase/supabase-js";
import bcryptjs from "bcryptjs";
import jwt from "@tsndr/cloudflare-worker-jwt";

export async function onRequestPost({ request, env }) {
  const { username, password } = await request.json();
  if (!username || !password)
    return Response.json({ success: false, message: "ກະລຸນາປ້ອນຊື່ຜູ້ໃຊ້ ແລະ ລະຫັດຜ່ານ" });

  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
  const { data, error } = await sb.from("users").select("*").eq("username", username.trim()).single();
  if (error || !data)
    return Response.json({ success: false, message: "ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ" });

  const ok = await bcryptjs.compare(password, data.password);
  if (!ok)
    return Response.json({ success: false, message: "ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ" });

  const user = { id: data.id, username: data.username, fullname: data.fullname, department: data.department, role: data.role };
  const token = await jwt.sign(user, env.JWT_SECRET);
  return Response.json({ success: true, user, token });
}import { createClient } from "@supabase/supabase-js";
import bcryptjs from "bcryptjs";
import jwt from "@tsndr/cloudflare-worker-jwt";

export async function onRequestPost({ request, env }) {
  const { username, password } = await request.json();
  if (!username || !password)
    return Response.json({ success: false, message: "ກະລຸນາປ້ອນຊື່ຜູ້ໃຊ້ ແລະ ລະຫັດຜ່ານ" });

  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
  const { data, error } = await sb.from("users").select("*").eq("username", username.trim()).single();
  if (error || !data)
    return Response.json({ success: false, message: "ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ" });

  const ok = await bcryptjs.compare(password, data.password);
  if (!ok)
    return Response.json({ success: false, message: "ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ" });

  const user = { id: data.id, username: data.username, fullname: data.fullname, department: data.department, role: data.role };
  const token = await jwt.sign(user, env.JWT_SECRET);
  return Response.json({ success: true, user, token });
}