import { createClient } from "@supabase/supabase-js";
import bcryptjs from "bcryptjs";

export async function onRequestPost({ request, env }) {
  try {
    const { username, password, fullname, department } = await request.json();
    if (!username || !password || !fullname || !department) {
      return Response.json({
        success: false,
        message: "ກະລຸນາຕື່ມຂໍ້ມູນໃຫ້ຄົບ",
      });
    }

    const sb = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
    const { data: existing, error: checkError } = await sb
      .from("users")
      .select("id")
      .eq("username", username.trim())
      .maybeSingle();

    if (checkError) {
      return Response.json({ success: false, message: checkError.message });
    }

    if (existing) {
      return Response.json({
        success: false,
        message: "ຊື່ຜູ້ໃຊ້ນີ້ຖືກໃຊ້ແລ້ວ",
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
  } catch {
    return Response.json({
      success: false,
      message: "ເກີດຂໍ້ຜິດພາດໃນລະບົບ",
    });
  }
}
