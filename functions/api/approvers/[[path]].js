import { createClient } from "@supabase/supabase-js";
import jwt from "@tsndr/cloudflare-worker-jwt";

async function getUser(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace("Bearer ", "");
  if (!token) return null;
  try {
    const ok = await jwt.verify(token, env.JWT_SECRET);
    if (!ok) return null;
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export async function onRequest({ request, env, params }) {
  const user = await getUser(request, env);
  if (!user) {
    return Response.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
  const url = new URL(request.url);
  const path = params.path ? params.path.join("/") : "";
  const method = request.method;

  if (method === "GET" && path === "active") {
    const dept = url.searchParams.get("dept") || "";
    let query = sb
      .from("approvers")
      .select("name, department")
      .eq("is_active", true)
      .order("name");
    if (dept) query = query.eq("department", dept);
    const { data, error } = await query;
    if (error) return Response.json({ success: false, message: error.message });
    return Response.json({
      success: true,
      data: dept ? data.map((d) => d.name) : data,
    });
  }

  if (method === "GET" && !path) {
    if (user.role !== "admin") {
      return Response.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }
    const { data, error } = await sb
      .from("approvers")
      .select("*")
      .order("department")
      .order("name");
    if (error) return Response.json({ success: false, message: error.message });
    return Response.json({ success: true, data });
  }

  if (method === "POST" && !path) {
    if (user.role !== "admin") {
      return Response.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }
    const { name, department } = await request.json();
    if (!name || !department) {
      return Response.json({
        success: false,
        message: "กรุณากรอกข้อมูลให้ครบ",
      });
    }
    const { error } = await sb.from("approvers").insert({
      name: name.trim(),
      department: department.trim(),
      is_active: true,
    });
    if (error) return Response.json({ success: false, message: error.message });
    return Response.json({ success: true });
  }

  if (method === "PUT" && path) {
    if (user.role !== "admin") {
      return Response.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }
    const { name, department, is_active } = await request.json();
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (department !== undefined) updateData.department = department.trim();
    if (is_active !== undefined) updateData.is_active = is_active;
    const { error } = await sb.from("approvers").update(updateData).eq("id", path);
    if (error) return Response.json({ success: false, message: error.message });
    return Response.json({ success: true });
  }

  return Response.json({ success: false, message: "Not found" }, { status: 404 });
}
