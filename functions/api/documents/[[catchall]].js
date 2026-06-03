import { createClient } from "@supabase/supabase-js";
import jwt from "@tsndr/cloudflare-worker-jwt";

const DEPT_PREFIX = {
  ພະແນກບັນຊີການເງິນ: "AFD/LXH/",
  ພະແນກບໍລິຫານຫ້ອງການ: "AD/LXH/",
  ພະແນກພັດທະນາທຸລະກິດ: "BIZ.LXH/",
  Partnership: "PNS./LXH/",
  ພະແນກBanding: "CBD.LXH/",
  ຝ່າຍການແພດ: "MD.LXH/",
  ພະແນກສາງ: "ID/LXH/",
  ພະແນກບຸກຄະລາກອນ: "HR/LXH/",
  ຝາຍບໍລິຫານ: "AD/LXH/",
  ພະແນກຈັດຊື້: "ID/LXH/",
  ພະແນກໄອທີ: "IT/LXH/",
};

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
  if (!user)
    return Response.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );

  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
  const url = new URL(request.url);
  const path = params.catchall ? params.catchall.join("/") : "";
  const method = request.method;

  if (method === "GET" && path === "next-number") {
    const dept = url.searchParams.get("dept") || "";
    const isStorage = dept === "ພະແນກສາງ" || dept === "ພະແນກຈັດຊື້";
    const prefix = isStorage ? "" : DEPT_PREFIX[dept] || "DOC/";
    const { data } = await sb
      .from("documents")
      .select("doc_number")
      .order("created_at", { ascending: false });
    let maxNum = 0;
    (data || []).forEach((row) => {
      const num = String(row.doc_number || "");
      if (isStorage) {
        if (num.endsWith("/ID/LXH")) {
          const n = parseInt(num.replace("/ID/LXH", ""), 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
      } else {
        if (num.startsWith(prefix)) {
          const n = parseInt(num.replace(prefix, ""), 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
      }
    });
    const nextNum = maxNum + 1;
    const docNumber = isStorage
      ? String(nextNum).padStart(5, "0") + "/ID/LXH"
      : prefix + String(nextNum).padStart(7, "0");
    return Response.json({ success: true, docNumber });
  }

  if (method === "GET" && !path) {
    const dept = url.searchParams.get("dept");
    const role = url.searchParams.get("role");
    let query = sb
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });
    if (role !== "admin") {
      const depts = dept ? dept.split(",") : [];
      query = query.in(
        "department",
        depts.map((d) => d.trim()),
      );
    }
    const { data, error } = await query;
    if (error) return Response.json({ success: false, message: error.message });
    const formatted = (data || []).map((row) => ({
      docNumber: row.doc_number,
      docDate: row.doc_date ? row.doc_date.slice(0, 10) : "",
      docTime: row.doc_time ? row.doc_time.slice(0, 8) : "",
      subject: row.subject || "",
      recipient: row.recipient || "",
      docType: row.doc_type || "",
      details: row.details || "",
      department: row.department || "",
      requesterDept: row.requester_dept || "",
      approvedBy: row.approved_by || "",
      createdBy: row.created_by || "",
      createdAt: row.created_at || "",
    }));
    return Response.json({ success: true, data: formatted });
  }

  if (method === "POST" && !path) {
    const d = await request.json();
    const { error } = await sb.from("documents").insert({
      doc_number: d.docNumber,
      doc_date: d.docDate || null,
      doc_time: d.docTime || null,
      subject: d.subject,
      recipient: d.recipient,
      doc_type: d.docType,
      details: d.details || "",
      department: d.department,
      requester_dept: d.requesterDept || "",
      approved_by: d.approvedBy || "",
      created_by: d.createdBy,
    });
    if (error) return Response.json({ success: false, message: error.message });
    return Response.json({ success: true });
  }

  if (method === "PUT" && path) {
    const d = await request.json();
    const { error } = await sb
      .from("documents")
      .update({
        doc_date: d.docDate || null,
        doc_time: d.docTime || null,
        subject: d.subject,
        recipient: d.recipient,
        doc_type: d.docType,
        details: d.details || "",
        department: d.department,
        requester_dept: d.requesterDept || "",
        approved_by: d.approvedBy || "",
      })
      .eq("doc_number", decodeURIComponent(path));
    if (error) return Response.json({ success: false, message: error.message });
    return Response.json({ success: true });
  }

  if (method === "DELETE" && path) {
    if (user.role !== "admin")
      return Response.json({ success: false, message: "ບໍ່ມີສິດລຶບ" });
    const { error } = await sb
      .from("documents")
      .delete()
      .eq("doc_number", decodeURIComponent(path));
    if (error) return Response.json({ success: false, message: error.message });
    return Response.json({ success: true });
  }

  return Response.json(
    { success: false, message: "Not found" },
    { status: 404 },
  );
}
