require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth");
const docRoutes = require("./routes/documents");
const deptRoutes = require("./routes/departments");
const approverRoutes = require("./routes/approvers");

const app = express();
const PORT = process.env.PORT || 3000;

const publicPath = path.join(__dirname, "../public");

// Trust proxy
app.set("trust proxy", 1);

// CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

// static files (เหลืออันเดียวพอ)
app.use(express.static(publicPath));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/documents", docRoutes);
app.use("/api/departments", deptRoutes);
app.use("/api/approvers", approverRoutes);

// SPA fallback
app.get("*", (req, res) => {
  const filePath = path.join(publicPath, "index.html");
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(500).send("index.html not found");
    }
  });
});
console.log("ENV CHECK:", {
  SUPABASE_URL: !!process.env.SUPABASE_URL,
  SUPABASE_KEY: !!process.env.SUPABASE_KEY,
  JWT_SECRET: !!process.env.JWT_SECRET,
});

// listen (Render ต้องใช้แบบนี้)
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});
