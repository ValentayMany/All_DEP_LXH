import { createClient } from "@supabase/supabase-js";
import { forbidden, getUser, unauthorized } from "../../_shared/auth.js";
import {
  DEPT_PREFIX,
  allowedDepartmentsFor,
  canAccessDocument,
  formatDocument,
  isAllowedDepartmentValue,
  isStorageDepartment,
} from "../../_shared/departments.js";

function documentPayload(data) {
  return {
    doc_number: data.docNumber,
    doc_date: data.docDate || null,
    doc_time: data.docTime || null,
    subject: data.subject,
    recipient: data.recipient,
    doc_type: data.docType,
    details: data.details || "",
    department: data.department,
    requester_dept: data.requesterDept || "",
    approved_by: data.approvedBy || "",
    created_by: data.createdBy,
  };
}

function assertDocumentAccess(user, data) {
  if (user.role === "admin") return true;

  const allowedDepartments = allowedDepartmentsFor(user);
  return (
    allowedDepartments.includes(String(data.department || "").trim()) &&
    isAllowedDepartmentValue(data.requesterDept, allowedDepartments)
  );
}

async function nextDocumentNumber(sb, dept) {
  const isStorage = isStorageDepartment(dept);
  const prefix = isStorage ? "" : DEPT_PREFIX[dept] || "DOC/";
  const { data, error } = await sb
    .from("documents")
    .select("doc_number")
    .order("created_at", { ascending: false });

  if (error) {
    return { error };
  }

  let maxNum = 0;
  (data || []).forEach((row) => {
    const num = String(row.doc_number || "");
    if (isStorage && num.endsWith("/ID/LXH")) {
      const n = parseInt(num.replace("/ID/LXH", ""), 10);
      if (!Number.isNaN(n) && n > maxNum) maxNum = n;
    } else if (!isStorage && num.startsWith(prefix)) {
      const n = parseInt(num.replace(prefix, ""), 10);
      if (!Number.isNaN(n) && n > maxNum) maxNum = n;
    }
  });

  const nextNum = maxNum + 1;
  const docNumber = isStorage
    ? `${String(nextNum).padStart(5, "0")}/ID/LXH`
    : `${prefix}${String(nextNum).padStart(7, "0")}`;
  return { docNumber };
}

export async function onRequest({ request, env, params }) {
  const user = await getUser(request, env);
  if (!user) return unauthorized();

  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
  const url = new URL(request.url);
  const path = params.path ? params.path.join("/") : "";
  const method = request.method;

  if (method === "GET" && path === "next-number") {
    const dept = url.searchParams.get("dept") || "";
    if (
      user.role !== "admin" &&
      !allowedDepartmentsFor(user).includes(String(dept).trim())
    ) {
      return forbidden();
    }

    const { docNumber, error } = await nextDocumentNumber(sb, dept);
    if (error) return Response.json({ success: false, message: error.message });
    return Response.json({ success: true, docNumber });
  }

  if (method === "GET" && !path) {
    let query = sb.from("documents").select("*").order("created_at", {
      ascending: false,
    });
    const allowedDepartments = allowedDepartmentsFor(user);

    if (user.role !== "admin") {
      query = query.in("department", allowedDepartments);
    }

    const { data, error } = await query;
    if (error) return Response.json({ success: false, message: error.message });

    const visibleRows =
      user.role === "admin"
        ? data || []
        : (data || []).filter((row) =>
            canAccessDocument(row, allowedDepartments),
          );
    return Response.json({
      success: true,
      data: visibleRows.map(formatDocument),
    });
  }

  if (method === "POST" && !path) {
    const data = await request.json();
    if (!assertDocumentAccess(user, data)) return forbidden();

    const { error } = await sb.from("documents").insert(documentPayload(data));
    if (error) return Response.json({ success: false, message: error.message });
    return Response.json({ success: true });
  }

  if (method === "PUT" && path) {
    const data = await request.json();
    if (!assertDocumentAccess(user, data)) return forbidden();

    let query = sb
      .from("documents")
      .update(documentPayload(data))
      .eq("doc_number", decodeURIComponent(path));

    if (user.role !== "admin") {
      query = query.in("department", allowedDepartmentsFor(user));
    }

    const { error } = await query;
    if (error) return Response.json({ success: false, message: error.message });
    return Response.json({ success: true });
  }

  if (method === "DELETE" && path) {
    if (user.role !== "admin") return forbidden();

    const { error } = await sb
      .from("documents")
      .delete()
      .eq("doc_number", decodeURIComponent(path));
    if (error) return Response.json({ success: false, message: error.message });
    return Response.json({ success: true });
  }

  return Response.json({ success: false, message: "Not found" }, { status: 404 });
}

