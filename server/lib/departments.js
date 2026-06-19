const DEPT_PREFIX = {
  "ພະແນກບັນຊີການເງິນ": "AFD/LXH/",
  "ພະແນກບໍລິຫານຫ້ອງການ": "AD/LXH/",
  "ພະແນກພັດທະນາທຸລະກິດ": "BIZ.LXH/",
  Partnership: "PNS./LXH/",
  "ພະແນກBanding": "CBD.LXH/",
  "ຝ່າຍການແພດ": "MD.LXH/",
  "ພະແນກສາງ": "ID/LXH/",
  "ພະແນກບຸກຄະລາກອນ": "HR/LXH/",
  "ຝາຍບໍລິຫານ": "AD/LXH/",
  "ພະແນກຈັດຊື້": "ID/LXH/",
  "ພະແນກໄອທີ": "IT/LXH/",
};

const DEPT_GROUP_MAP = {
  "ພະແນກບໍລິຫານຫ້ອງການ": ["ພະແນກບໍລິຫານຫ້ອງການ", "ຝາຍບໍລິຫານ"],
  "ຝາຍບໍລິຫານ": ["ພະແນກບໍລິຫານຫ້ອງການ", "ຝາຍບໍລິຫານ"],
  "ພະແນກສາງ": ["ພະແນກສາງ", "ພະແນກຈັດຊື້"],
  "ພະແນກຈັດຊື້": ["ພະແນກສາງ", "ພະແນກຈັດຊື້"],
  "ພະແນກພັດທະນາທຸລະກິດ": ["ພະແນກພັດທະນາທຸລະກິດ", "ພະແນກBanding", "Partnership"],
  "ພະແນກBanding": ["ພະແນກພັດທະນາທຸລະກິດ", "ພະແນກBanding", "Partnership"],
  Partnership: ["ພະແນກພັດທະນາທຸລະກິດ", "ພະແນກBanding", "Partnership"],
  "ພະແນກບຸກຄະລາກອນ": ["ພະແນກບຸກຄະລາກອນ"],
  "ພະແນກບັນຊີການເງິນ": ["ພະແນກບັນຊີການເງິນ"],
  "ຝ່າຍການແພດ": ["ຝ່າຍການແພດ"],
  "ພະແນກໄອທີ": ["ພະແນກໄອທີ"],
};

const STORAGE_DEPARTMENTS = new Set(["ພະແນກສາງ", "ພະແນກຈັດຊື້"]);

function allowedDepartmentsFor(user) {
  const dept = String(user && user.department ? user.department : "").trim();
  return DEPT_GROUP_MAP[dept] || (dept ? [dept] : []);
}

function isAllowedDepartmentValue(value, allowedDepartments) {
  const dept = String(value || "").trim();
  return !dept || allowedDepartments.includes(dept);
}

function isStorageDepartment(dept) {
  return STORAGE_DEPARTMENTS.has(String(dept || "").trim());
}

function canAccessDocument(row, allowedDepartments) {
  // Only gate on the document's own department, not requester_dept.
  // requester_dept restriction applies only when creating/editing (POST/PUT).
  return allowedDepartments.includes(String(row.department || "").trim());
}

function formatDocument(row) {
  return {
    docNumber: row.doc_number,
    docDate: row.doc_date ? row.doc_date.slice(0, 10) : "",
    docTime: row.doc_time ? row.doc_time.slice(0, 8) : "",
    subject: row.subject || "",
    recipient: row.recipient || "",
    docType: row.doc_type || "",
    details: row.details || "",
    department: row.department || "",
    requesterDept: row.requester_dept || "",
    approvedBy: row.approved_by || "",
    createdBy: row.created_by || "",
    createdAt: row.created_at || "",
  };
}

module.exports = {
  DEPT_PREFIX,
  allowedDepartmentsFor,
  canAccessDocument,
  formatDocument,
  isAllowedDepartmentValue,
  isStorageDepartment,
};

