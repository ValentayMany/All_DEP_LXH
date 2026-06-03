const express = require("express");
const supabase = require("../supabase");
const auth = require("../middleware/auth");

const router = express.Router();

// GET /api/departments
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("departments")
    .select("*")
    .order("name");

  if (error) return res.json({ success: false, message: error.message });
  res.json({ success: true, data });
});

module.exports = router;
