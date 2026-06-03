const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const supabase = require("../supabase");

const router = express.Router();

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.json({ success: false, message: "ກະລຸນາປ້ອນຊື່ຜູ້ໃຊ້ ແລະ ລະຫັດຜ່ານ" });

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username.trim())
      .single();

    if (error || !data)
      return res.json({ success: false, message: "ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ" });

    // Compare hashed password
    const passwordMatch = await bcrypt.compare(password, data.password);
    if (!passwordMatch)
      return res.json({ success: false, message: "ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ" });

    const user = {
      id: data.id,
      username: data.username,
      fullname: data.fullname,
      department: data.department,
      role: data.role,
    };

    const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "8h" });
    res.json({ success: true, user, token });
  } catch (err) {
    console.error("Login error:", err);
    res.json({ success: false, message: "ເກີດຂໍ້ຜິດພາດໃນລະບົບ" });
  }
});

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { username, password, fullname, department } = req.body;
    if (!username || !password || !fullname || !department)
      return res.json({ success: false, message: "ກະລຸນາຕື່ມຂໍ້ມູນໃຫ້ຄົບ" });

    // Check duplicate
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("username", username.trim())
      .single();

    if (existing)
      return res.json({ success: false, message: "ຊື່ຜູ້ໃຊ້ນີ້ຖືກໃຊ້ແລ້ວ" });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const { error } = await supabase.from("users").insert({
      username: username.trim(),
      password: hashedPassword,
      fullname: fullname.trim(),
      department: department.trim(),
      role: "user",
    });

    if (error) return res.json({ success: false, message: error.message });
    res.json({ success: true });
  } catch (err) {
    console.error("Register error:", err);
    res.json({ success: false, message: "ເກີດຂໍ້ຜິດພາດໃນລະບົບ" });
  }
});

module.exports = router;
