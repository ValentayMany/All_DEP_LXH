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

app.use(cors());
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

app.listen(PORT, () => {
  console.log(`✅ LHMS Server running on http://localhost:${PORT}`);
});
