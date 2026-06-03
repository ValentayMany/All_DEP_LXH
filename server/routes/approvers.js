const express = require("express");
const supabase = require("../supabase");
const auth = require("../middleware/auth");

const router = express.Router();

// GET /api/approvers (Admin only)
router.get("/", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "ບໍ່ມີສິດເຂົ້າເຖິງ" });
  }

  const { data, error } = await supabase
    .from("approvers")
    .select("*")
    .order("department")
    .order("name");

  if (error) return res.json({ success: false, message: error.message });
  res.json({ success: true, data });
});

// GET /api/approvers/active (All authenticated users)
router.get("/active", auth, async (req, res) => {
  const dept = req.query.dept || "";
  
  let query = supabase
    .from("approvers")
    .select("name, department")
    .eq("is_active", true)
    .order("name");

  if (dept) {
    query = query.eq("department", dept);
  }

  const { data, error } = await query;
  if (error) return res.json({ success: false, message: error.message });
  
  if (dept) {
    res.json({ success: true, data: data.map(d => d.name) });
  } else {
    res.json({ success: true, data });
  }
});

// POST /api/approvers (Admin only)
router.post("/", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "ບໍ່ມີສິດທິໃນການດຳເນີນການ" });
  }

  const { name, department } = req.body;
  if (!name || !department) {
    return res.json({ success: false, message: "ກະລຸນາຕື່ມຂໍ້ມູນໃຫ້ຄົບ" });
  }

  const { error } = await supabase.from("approvers").insert({
    name: name.trim(),
    department: department.trim(),
    is_active: true
  });

  if (error) return res.json({ success: false, message: error.message });
  res.json({ success: true });
});

// PUT /api/approvers/:id (Admin only)
router.put("/:id", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "ບໍ່ມີສິດທິໃນການດຳເນີນການ" });
  }

  const { name, department, is_active } = req.body;
  const updateData = {};
  if (name !== undefined) updateData.name = name.trim();
  if (department !== undefined) updateData.department = department.trim();
  if (is_active !== undefined) updateData.is_active = is_active;

  const { error } = await supabase
    .from("approvers")
    .update(updateData)
    .eq("id", req.params.id);

  if (error) return res.json({ success: false, message: error.message });
  res.json({ success: true });
});

module.exports = router;
