const express = require("express");
const supabase = require("../supabase");
const auth = require("../middleware/auth");

const router = express.Router();

// Prefix map per department (same as original system)
const DEPT_PREFIX = {
  "ພະແນກບັນຊີການເງິນ":    "AFD/LXH/",
  "ພະແນກບໍລິຫານຫ້ອງການ": "AD/LXH/",
  "ພະແນກພັດທະນາທຸລະກິດ": "BIZ.LXH/",
  "Partnership":           "PNS./LXH/",
  "ພະແນກBanding":         "CBD.LXH/",
  "ຝ່າຍການແພດ":           "MD.LXH/",
  "ພະແນກສາງ":             "ID/LXH/",
  "ພະແນກບຸກຄະລາກອນ":      "HR/LXH/",
  "ຝາຍບໍລິຫານ":           "AD/LXH/",
  "ພະແນກຈັດຊື້":           "ID/LXH/",
  "ພະແນກໄອທີ":            "IT/LXH/",
};

// GET /api/documents/next-number?dept=xxx
router.get("/next-number", auth, async (req, res) => {
  const dept = req.query.dept || "";

  const isStorage = dept === "ພະແນກສາງ" || dept === "ພະແນກຈັດຊື້";
  const prefix = isStorage ? "" : (DEPT_PREFIX[dept] || "DOC/");

  const { data } = await supabase
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

  res.json({ success: true, docNumber });
});

// GET /api/documents?dept=xxx&role=yyy
router.get("/", auth, async (req, res) => {
  const { dept, role } = req.query;

  let query = supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });

  // Non-admin: filter by allowed departments
  if (role !== "admin") {
    let depts = [];
    if (dept) {
      if (Array.isArray(dept)) {
        depts = dept;
      } else {
        depts = dept.split(",");
      }
    }
    query = query.in("department", depts.map(d => d.trim()));
  }

  const { data, error } = await query;
  if (error) return res.json({ success: false, message: error.message });

  // Format dates for frontend
  const formatted = (data || []).map((row) => ({
    docNumber:    row.doc_number,
    docDate:      row.doc_date   ? row.doc_date.slice(0, 10) : "",
    docTime:      row.doc_time   ? row.doc_time.slice(0, 8)  : "",
    subject:      row.subject    || "",
    recipient:    row.recipient  || "",
    docType:      row.doc_type   || "",
    details:      row.details    || "",
    department:   row.department || "",
    requesterDept:row.requester_dept || "",
    approvedBy:   row.approved_by    || "",
    createdBy:    row.created_by     || "",
    createdAt:    row.created_at     || "",
  }));

  res.json({ success: true, data: formatted });
});

// POST /api/documents
router.post("/", auth, async (req, res) => {
  const d = req.body;
  const { error } = await supabase.from("documents").insert({
    doc_number:    d.docNumber,
    doc_date:      d.docDate    || null,
    doc_time:      d.docTime    || null,
    subject:       d.subject,
    recipient:     d.recipient,
    doc_type:      d.docType,
    details:       d.details    || "",
    department:    d.department,
    requester_dept:d.requesterDept || "",
    approved_by:   d.approvedBy    || "",
    created_by:    d.createdBy,
  });

  if (error) return res.json({ success: false, message: error.message });
  res.json({ success: true });
});

// PUT /api/documents/:docNumber
router.put("/:docNumber", auth, async (req, res) => {
  const d = req.body;
  const { error } = await supabase
    .from("documents")
    .update({
      doc_date:      d.docDate    || null,
      doc_time:      d.docTime    || null,
      subject:       d.subject,
      recipient:     d.recipient,
      doc_type:      d.docType,
      details:       d.details    || "",
      department:    d.department,
      requester_dept:d.requesterDept || "",
      approved_by:   d.approvedBy    || "",
    })
    .eq("doc_number", req.params.docNumber);

  if (error) return res.json({ success: false, message: error.message });
  res.json({ success: true });
});

// DELETE /api/documents/:docNumber  (admin only)
router.delete("/:docNumber", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.json({ success: false, message: "ບໍ່ມີສິດລຶບ" });

  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("doc_number", req.params.docNumber);

  if (error) return res.json({ success: false, message: error.message });
  res.json({ success: true });
});

module.exports = router;
