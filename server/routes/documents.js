const express = require("express");
const supabase = require("../supabase");
const auth = require("../middleware/auth");
const {
  DEPT_PREFIX,
  allowedDepartmentsFor,
  canAccessDocument,
  formatDocument,
  isAllowedDepartmentValue,
  isStorageDepartment,
} = require("../lib/departments");

const router = express.Router();

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

async function nextDocumentNumber(dept) {
  const isStorage = isStorageDepartment(dept);
  const prefix = isStorage ? "" : DEPT_PREFIX[dept] || "DOC/";
  const { data, error } = await supabase
    .from("documents")
    .select("doc_number")
    .order("created_at", { ascending: false });

  if (error) return { error };

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

router.get("/next-number", auth, async (req, res) => {
  const dept = String(req.query.dept || "").trim();
  if (
    req.user.role !== "admin" &&
    !allowedDepartmentsFor(req.user).includes(dept)
  ) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const { docNumber, error } = await nextDocumentNumber(dept);
  if (error) return res.json({ success: false, message: error.message });
  return res.json({ success: true, docNumber });
});

router.get("/", auth, async (req, res) => {
  let query = supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });
  const allowedDepartments = allowedDepartmentsFor(req.user);

  if (req.user.role !== "admin") {
    query = query.in("department", allowedDepartments);
  }

  const { data, error } = await query;
  if (error) return res.json({ success: false, message: error.message });

  const visibleRows =
    req.user.role === "admin"
      ? data || []
      : (data || []).filter((row) =>
          canAccessDocument(row, allowedDepartments),
        );
  return res.json({ success: true, data: visibleRows.map(formatDocument) });
});

router.post("/", auth, async (req, res) => {
  const data = req.body;
  if (!assertDocumentAccess(req.user, data)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const { error } = await supabase.from("documents").insert(documentPayload(data));
  if (error) return res.json({ success: false, message: error.message });
  return res.json({ success: true });
});

router.put("/:docNumber", auth, async (req, res) => {
  const data = req.body;
  if (!assertDocumentAccess(req.user, data)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  let query = supabase
    .from("documents")
    .update(documentPayload(data))
    .eq("doc_number", req.params.docNumber);

  if (req.user.role !== "admin") {
    query = query.in("department", allowedDepartmentsFor(req.user));
  }

  const { error } = await query;
  if (error) return res.json({ success: false, message: error.message });
  return res.json({ success: true });
});

router.delete("/:docNumber", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("doc_number", req.params.docNumber);
  if (error) return res.json({ success: false, message: error.message });
  return res.json({ success: true });
});

module.exports = router;

