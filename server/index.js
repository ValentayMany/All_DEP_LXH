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

// Trust Railway proxy
app.set("trust proxy", 1);

// CORS — allow all origins (Cloudflare Pages + Railway + localhost)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/documents", docRoutes);
app.use("/api/departments", deptRoutes);
app.use("/api/approvers", approverRoutes);

// Serve frontend for all other routes (SPA fallback)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`✅ LHMS Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
