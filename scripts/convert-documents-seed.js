const fs = require("fs");
const sql = fs.readFileSync("supabase-migration.sql", "utf8");
const m = sql.match(/INSERT INTO documents[\s\S]+?ON CONFLICT/);
if (!m) {
  console.error("no documents insert found");
  process.exit(1);
}
let s = m[0].replace(/ON CONFLICT[\s\S]*$/, "");
s = s.replace(
  "INSERT INTO documents (doc_number",
  "INSERT IGNORE INTO documents (id, doc_number"
);
s = s.replace(/\('([A-Z0-9./]+)'/g, "(UUID(),'$1'");
s = s.replace(/'(\d{4}-\d{2}-\d{2})T([\d:.]+)Z'/g, "'$1 $2'");
fs.mkdirSync("database", { recursive: true });
fs.writeFileSync("database/mysql-documents-seed.sql", "-- Document seed (from supabase-migration)\n" + s + ";\n");
console.log("OK -> database/mysql-documents-seed.sql");
