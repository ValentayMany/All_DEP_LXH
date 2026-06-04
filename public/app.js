// ============================================================
// CONFIG — API URL (PHP + MySQL backend)
// ============================================================
// ใช้ same origin เมื่อรันผ่าน XAMPP / php -S router.php
// ถ้า frontend แยก host (เช่น Cloudflare Pages) ให้ตั้งค่าใน localStorage: lhms_api_base
var API = "";

// ============================================================
// STATE
// ============================================================
var CU = null,
  DOCS = [],
  DEPTS = [],
  TOKEN = "";
var CURRENT_KEY = null,
  CURRENT_DIR = null;
var FORM_KEY = null,
  FORM_DIR = null,
  EDIT_DOC_NUM = null;

var DEPT_GROUP_MAP = {
  ພະແນກບໍລິຫານຫ້ອງການ: ["ພະແນກບໍລິຫານຫ້ອງການ", "ຝາຍບໍລິຫານ"],
  ຝາຍບໍລິຫານ: ["ພະແນກບໍລິຫານຫ້ອງການ", "ຝາຍບໍລິຫານ"],
  ພະແນກສາງ: ["ພະແນກສາງ", "ພະແນກຈັດຊື້"],
  ພະແນກຈັດຊື້: ["ພະແນກສາງ", "ພະແນກຈັດຊື້"],
  ພະແນກພັດທະນາທຸລະກິດ: ["ພະແນກພັດທະນາທຸລະກິດ", "ພະແນກBanding", "Partnership"],
  ພະແນກBanding: ["ພະແນກພັດທະນາທຸລະກິດ", "ພະແນກBanding", "Partnership"],
  Partnership: ["ພະແນກພັດທະນາທຸລະກິດ", "ພະແນກBanding", "Partnership"],
  ພະແນກບຸກຄະລາກອນ: ["ພະແນກບຸກຄະລາກອນ"],
  ພະແນກບັນຊີການເງິນ: ["ພະແນກບັນຊີການເງິນ"],
  ຝ່າຍການແພດ: ["ຝ່າຍການແພດ"],
  ພະແນກໄອທີ: ["ພະແນກໄອທີ"],
};

var DEPT_ICONS = {
  ບຸກຄະລາ: "👤",
  ການເງິນ: "💰",
  ບໍລິຫານ: "🏛️",
  ວິຊາການ: "🔧",
  ແຜນ: "📊",
  ສາງ: "📦",
  ຈັດຊື້: "🛒",
  ຕະຫຼາດ: "📣",
  ພັດທະນາ: "🚀",
  ການແພດ: "🏥",
  Partnership: "🤝",
  ໄອທີ: "💻",
};

// ============================================================
// HELPERS
// ============================================================
function getDeptIcon(name) {
  var n = String(name || "");
  if (n === "Partnership") return "🤝";
  for (var k in DEPT_ICONS) {
    if (n.indexOf(k) >= 0) return DEPT_ICONS[k];
  }
  return "📁";
}
function deptKey(name) {
  var s = String(name || ""),
    hash = 0;
  for (var i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0;
  }
  return "d" + Math.abs(hash).toString(36);
}
function deptNameByKey(k) {
  var f = DEPTS.find(function (d) {
    return deptKey(d.name) === k;
  });
  return f ? f.name : "";
}
function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function showLoading() {
  document.getElementById("loading").classList.remove("hidden");
}
function hideLoading() {
  document.getElementById("loading").classList.add("hidden");
}
function showErr(id, msg) {
  var el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove("hidden");
}
function hideErr(id) {
  document.getElementById(id).classList.add("hidden");
}
function showToast(msg, isError) {
  var t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast" + (isError ? " error" : "");
  setTimeout(function () {
    t.classList.add("show");
  }, 10);
  setTimeout(function () {
    t.classList.remove("show");
  }, 2800);
}

// ============================================================
// API CALLS
// ============================================================
async function api(method, path, body) {
  var opts = {
    method: method,
    headers: { "Content-Type": "application/json" },
  };
  if (TOKEN) opts.headers["Authorization"] = "Bearer " + TOKEN;
  if (body) opts.body = JSON.stringify(body);
  try {
    var res = await fetch(API + "/api" + path, opts);
    return await res.json();
  } catch (e) {
    console.error("API error:", e);
    return { success: false, message: "ການເຊື່ອມຕໍ່ເຊີເວີຂັດຂ້ອງ" };
  }
}

// ============================================================
// INIT
// ============================================================
window.onload = function () {
  var s = sessionStorage.getItem("lhms_u");
  var t = sessionStorage.getItem("lhms_t");
  var cached = sessionStorage.getItem("lhms_depts");
  if (cached) {
    try {
      var raw = JSON.parse(cached);
      var seen = {};
      DEPTS = raw.filter(function (d) {
        var name = String(d.name || "").trim();
        if (seen[name]) return false;
        seen[name] = true;
        return true;
      });
    } catch (e) {
      DEPTS = [];
    }
  }
  if (s && t) {
    CU = JSON.parse(s);
    TOKEN = t;
    showMain();
  } else {
    if (!DEPTS.length) loadDepts();
  }
};

// ============================================================
// AUTH
// ============================================================
async function doLogin() {
  var u = document.getElementById("login-user").value.trim();
  var p = document.getElementById("login-pass").value;
  hideErr("login-error");
  if (!u || !p) {
    showErr("login-error", "ກະລຸນາປ້ອນຊື່ຜູ້ໃຊ້ ແລະ ລະຫັດຜ່ານ");
    return;
  }
  showLoading();
  var res = await api("POST", "/auth/login", { username: u, password: p });
  hideLoading();
  if (res && res.success) {
    CU = res.user;
    TOKEN = res.token;
    sessionStorage.setItem("lhms_u", JSON.stringify(CU));
    sessionStorage.setItem("lhms_t", TOKEN);
    showMain();
    loadDepts();
  } else {
    showErr("login-error", res ? res.message : "ເກີດຂໍ້ຜິດພາດ");
  }
}

async function doRegister() {
  var fn = document.getElementById("r-name").value.trim();
  var u = document.getElementById("r-user").value.trim();
  var p = document.getElementById("r-pass").value;
  var d = document.getElementById("r-dept").value;
  hideErr("reg-error");
  if (!fn || !u || !p || !d) {
    showErr("reg-error", "ກະລຸນາຕື່ມຂໍ້ມູນໃຫ້ຄົບ");
    return;
  }
  showLoading();
  var res = await api("POST", "/auth/register", {
    fullname: fn,
    username: u,
    password: p,
    department: d,
  });
  hideLoading();
  if (res && res.success) {
    alert("ສ້າງບັນຊີສຳເລັດ!");
    showLogin();
  } else showErr("reg-error", res ? res.message : "ເກີດຂໍ້ຜິດພາດ");
}

function doLogout() {
  CU = null;
  DOCS = [];
  DEPTS = [];
  TOKEN = "";
  sessionStorage.clear();
  document.getElementById("page-main").classList.add("hidden");
  document.getElementById("page-main").classList.remove("active");
  document.getElementById("page-auth").classList.remove("hidden");
  document.getElementById("page-auth").classList.add("active");
  showLogin();
}

// ============================================================
// DEPARTMENTS
// ============================================================
async function loadDepts() {
  var res = await api("GET", "/departments");
  if (res && res.success) {
    var raw = res.data || [];
    var seen = {};
    DEPTS = raw.filter(function (d) {
      var name = String(d.name || "").trim();
      if (seen[name]) return false;
      seen[name] = true;
      return true;
    });
    sessionStorage.setItem("lhms_depts", JSON.stringify(DEPTS));
  }
  fillDeptSel("r-dept");
  if (CU && document.getElementById("page-main").classList.contains("active")) {
    buildSidebarNav();
  }
}

function fillDeptSel(id) {
  var sel = document.getElementById(id);
  if (!sel || !DEPTS || !DEPTS.length) return;
  while (sel.options.length > 1) sel.remove(1);
  DEPTS.forEach(function (d) {
    var o = document.createElement("option");
    o.value = d.name;
    o.textContent = d.name;
    sel.appendChild(o);
  });
}

// ============================================================
// MAIN UI
// ============================================================
function showMain() {
  document.getElementById("page-auth").classList.add("hidden");
  document.getElementById("page-auth").classList.remove("active");
  document.getElementById("page-main").classList.remove("hidden");
  document.getElementById("page-main").classList.add("active");
  var init = (CU.fullname || CU.username || "U")[0].toUpperCase();
  document.getElementById("u-av").textContent = init;
  document.getElementById("top-av").textContent = init;
  document.getElementById("u-name").textContent = CU.fullname || CU.username;
  document.getElementById("u-role").textContent =
    CU.role === "admin" ? "ຜູ້ດູແລລະບົບ" : "ຜູ້ໃຊ້ — " + CU.department;
  if (DEPTS.length) buildSidebarNav();
  showDashboard();
}

function buildSidebarNav() {
  var html = "";
  var cuDept = String(CU.department || "").trim();
  var visibleDepts;
  if (CU.role === "admin") {
    visibleDepts = DEPTS;
  } else {
    var allowedNames = DEPT_GROUP_MAP[cuDept] || [cuDept];
    visibleDepts = DEPTS.filter(function (d) {
      return allowedNames.indexOf(String(d.name || "").trim()) >= 0;
    });
    if (!visibleDepts.length && cuDept)
      visibleDepts = [{ id: "ud", name: cuDept }];
  }
  html +=
    '<div class="nav-item" id="ni-dashboard" onclick="showDashboard()"><span style="font-size:16px">📊</span>Dashboard</div>';
  html +=
    '<div class="sb-divider"></div><div class="nav-section-label">ພະແນກ</div>';
  visibleDepts.forEach(function (dept) {
    var k = deptKey(dept.name);
    var icon = getDeptIcon(dept.name);
    html +=
      '<div><div class="nav-group-header" id="grp-' +
      k +
      '" onclick="toggleGroup(\'' +
      k +
      "')\">" +
      '<span class="ng-icon">' +
      icon +
      '</span><span style="flex:1">' +
      dept.name +
      "</span>" +
      '<span class="arrow">▶</span></div>' +
      '<div class="nav-sub" id="sub-' +
      k +
      '">' +
      '<div class="nav-sub-item" id="ni-' +
      k +
      '-in" onclick="showDocSec(\'' +
      k +
      "','in')\"><span class=\"sub-icon\">📥</span>ຂາເຂົ້າ</div>" +
      '<div class="nav-sub-item" id="ni-' +
      k +
      '-out" onclick="showDocSec(\'' +
      k +
      "','out')\"><span class=\"sub-icon\">📤</span>ຂາອອກ</div>" +
      "</div></div>";
  });
  html +=
    '<div class="sb-divider"></div><div class="nav-item" id="ni-about" onclick="showAbout()"><span style="font-size:16px">ℹ️</span>About</div>';
  if (CU.role === "admin") {
    html +=
      '<div class="sb-divider"></div><div class="nav-section-label">ລະບົບແອດມິນ</div>';
    html +=
      '<div class="nav-item" id="ni-approvers" onclick="showApproversSec()"><span style="font-size:16px">✍️</span>ຈັດການຜູ້ອານຸມັດ</div>';
  }
  document.getElementById("sb-nav").innerHTML = html;
  if (visibleDepts.length === 1) {
    var autoKey = deptKey(visibleDepts[0].name);
    setTimeout(function () {
      var sub = document.getElementById("sub-" + autoKey);
      var head = document.getElementById("grp-" + autoKey);
      if (sub) sub.classList.add("open");
      if (head) head.classList.add("open");
    }, 60);
  }
}

function toggleGroup(k) {
  var sub = document.getElementById("sub-" + k);
  var head = document.getElementById("grp-" + k);
  var wasOpen = sub.classList.contains("open");
  document.querySelectorAll(".nav-sub").forEach(function (s) {
    s.classList.remove("open");
  });
  document.querySelectorAll(".nav-group-header").forEach(function (h) {
    h.classList.remove("open");
  });
  if (!wasOpen) {
    sub.classList.add("open");
    head.classList.add("open");
  }
}

function setActiveSection(secEl, navId) {
  document.querySelectorAll(".section").forEach(function (s) {
    s.classList.remove("active");
    s.style.display = "none";
  });
  document.querySelectorAll(".nav-sub-item,.nav-item").forEach(function (n) {
    n.classList.remove("active");
  });
  secEl.classList.add("active");
  secEl.style.display = "flex";
  var ni = document.getElementById(navId);
  if (ni) ni.classList.add("active");
}

function closeMobileSB() {
  if (window.innerWidth < 768) {
    var sb = document.getElementById("sidebar");
    if (sb) sb.classList.remove("open");
    var ov = document.getElementById("sidebar-overlay");
    if (ov) ov.classList.add("hidden");
  }
}

function showDashboard() {
  setActiveSection(document.getElementById("sec-dashboard"), "ni-dashboard");
  CURRENT_KEY = null;
  CURRENT_DIR = null;
  loadDashboard();
  closeMobileSB();
}
function showAbout() {
  setActiveSection(document.getElementById("sec-about"), "ni-about");
}

function showApproversSec() {
  setActiveSection(document.getElementById("sec-approvers"), "ni-approvers");
  CURRENT_KEY = null;
  CURRENT_DIR = null;
  loadApprovers();
  closeMobileSB();
}

function showDocSec(k, dir) {
  ensureDocSection(k, dir);
  setActiveSection(
    document.getElementById("sec-" + k + "-" + dir),
    "ni-" + k + "-" + dir,
  );
  CURRENT_KEY = k;
  CURRENT_DIR = dir;
  loadDocsBySection(k, dir);
  closeMobileSB();
}
function showReg() {
  document.getElementById("login-form").classList.add("hidden");
  document.getElementById("reg-form").classList.remove("hidden");
}
function showLogin() {
  document.getElementById("reg-form").classList.add("hidden");
  document.getElementById("login-form").classList.remove("hidden");
}

// ============================================================
// DASHBOARD
// ============================================================
// Dept approver data store
var DEPT_APPROVER_DATA = {};

async function loadDashboard() {
  var cuDept = String(CU.department || "").trim();
  var allowedNames =
    CU.role === "admin"
      ? DEPTS.map(function (d) {
          return d.name;
        })
      : DEPT_GROUP_MAP[cuDept] || [cuDept];
  var container = document.getElementById("db-dept-cards");
  container.innerHTML =
    '<div style="color:var(--gray-400);font-size:13px;padding:20px 0">⏳ ກຳລັງໂຫລດ...</div>';
  showLoading();
  var params =
    CU.role === "admin"
      ? "role=admin"
      : "dept=" + encodeURIComponent(allowedNames.join(",")) + "&role=user";
  var [res, appRes] = await Promise.all([
    api("GET", "/documents?" + params),
    api("GET", "/approvers/active"),
  ]);
  hideLoading();
  if (!res || !res.success) {
    container.innerHTML = '<div style="color:var(--red)">❌ Error</div>';
    return;
  }

  var all = res.data || [];
  var visible =
    CU.role === "admin"
      ? all
      : all.filter(function (d) {
          return allowedNames.indexOf(String(d.department || "").trim()) >= 0;
        });
  var activeApprovers = appRes && appRes.success ? appRes.data || [] : [];

  document.getElementById("db-total").textContent = visible.length;
  document.getElementById("db-in").textContent = visible.filter(function (d) {
    return d.docType === "ຂາເຂົ້າ";
  }).length;
  document.getElementById("db-out").textContent = visible.filter(function (d) {
    return d.docType === "ຂາອອກ";
  }).length;

  var byDept = {};
  allowedNames.forEach(function (dep) {
    var dName = String(dep || "").trim();
    byDept[dName] = { total: 0, in: 0, out: 0, approvers: {} };
    activeApprovers.forEach(function (ap) {
      if (String(ap.department || "").trim() === dName) {
        byDept[dName].approvers[ap.name] = 0;
      }
    });
  });
  visible.forEach(function (d) {
    var dep = String(d.department || "ບໍ່ລະບຸ").trim();
    if (!byDept[dep]) byDept[dep] = { total: 0, in: 0, out: 0, approvers: {} };
    byDept[dep].total++;
    if (d.docType === "ຂາເຂົ້າ") byDept[dep].in++;
    else byDept[dep].out++;
    var appBy = String(d.approvedBy || "").trim();
    if (appBy)
      byDept[dep].approvers[appBy] = (byDept[dep].approvers[appBy] || 0) + 1;
  });

  DEPT_APPROVER_DATA = byDept;

  var keys = Object.keys(byDept);
  if (!keys.length) {
    container.innerHTML =
      '<div style="color:var(--gray-400);font-size:13px;padding:20px 0">📭 ຍັງບໍ່ມີຂໍ້ມູນ</div>';
    return;
  }

  container.innerHTML = keys
    .map(function (dep) {
      var s = byDept[dep];
      var icon = getDeptIcon(dep);
      var hasApprovers = Object.values(s.approvers).some(function (v) {
        return v > 0;
      });
      return (
        '<div class="db-dept-card" onclick="openDeptModal(\'' +
        dep.replace(/'/g, "\\'") +
        "')\">" +
        '<div class="db-dept-card-head"><div class="db-dept-icon">' +
        icon +
        "</div><span>" +
        esc(dep) +
        "</span></div>" +
        '<div class="db-dept-stats">' +
        '<div class="db-dept-stat"><div class="db-dept-stat-val">' +
        s.total +
        '</div><div class="db-dept-stat-lbl">ທັງໝົດ</div></div>' +
        '<div class="db-dept-stat"><div class="db-dept-stat-val clr-in">' +
        s.in +
        '</div><div class="db-dept-stat-lbl">ຂາເຂົ້າ</div></div>' +
        '<div class="db-dept-stat"><div class="db-dept-stat-val clr-out">' +
        s.out +
        '</div><div class="db-dept-stat-lbl">ຂາອອກ</div></div>' +
        "</div>" +
        (hasApprovers
          ? '<div class="db-dept-hint">👆 ກົດເບິ່ງຜູ້ອານຸມັດ</div>'
          : "") +
        "</div>"
      );
    })
    .join("");
}

function openDeptModal(dep) {
  var s = DEPT_APPROVER_DATA[dep];
  if (!s) return;
  var icon = getDeptIcon(dep);
  document.getElementById("dept-modal-icon").textContent = icon;
  document.getElementById("dept-modal-title").textContent = dep;
  document.getElementById("dept-modal-sub").textContent =
    "ທັງໝົດ " + s.total + " ລາຍການ";
  document.getElementById("dept-modal-stats").innerHTML =
    '<div class="dms-item total"><div class="dms-val">' +
    s.total +
    '</div><div class="dms-lbl">ທັງໝົດ</div></div>' +
    '<div class="dms-item inn"><div class="dms-val">' +
    s.in +
    '</div><div class="dms-lbl">ຂາເຂົ້າ</div></div>' +
    '<div class="dms-item out"><div class="dms-val">' +
    s.out +
    '</div><div class="dms-lbl">ຂາອອກ</div></div>';
  var approverKeys = Object.keys(s.approvers);
  var listHtml =
    approverKeys.length === 0
      ? '<div class="dml-empty">ຍັງບໍ່ມີຂໍ້ມູນຜູ້ອານຸມັດ</div>'
      : '<div class="dml-title">✍️ ສະຫຼຸບການອານຸມັດ</div>' +
        approverKeys
          .map(function (name) {
            var count = s.approvers[name];
            var pct = s.total > 0 ? Math.round((count / s.total) * 100) : 0;
            return (
              '<div class="dml-row">' +
              '<div class="dml-info"><span class="dml-name">' +
              esc(name) +
              "</span>" +
              '<span class="dml-count">' +
              count +
              " ລາຍການ</span></div>" +
              '<div class="dml-bar-wrap"><div class="dml-bar" style="width:' +
              pct +
              '%"></div></div>' +
              "</div>"
            );
          })
          .join("");
  document.getElementById("dept-modal-list").innerHTML = listHtml;
  document.getElementById("dept-modal-overlay").classList.remove("hidden");
}

function closeDeptModal() {
  document.getElementById("dept-modal-overlay").classList.add("hidden");
}

// ============================================================
// DOC SECTIONS
// ============================================================
function ensureDocSection(k, dir) {
  var secId = "sec-" + k + "-" + dir;
  if (document.getElementById(secId)) return;
  var div = document.createElement("div");
  div.id = secId;
  div.className = "section";
  var deptName = deptNameByKey(k) || String(CU.department || "").trim();
  var dirLabel = dir === "in" ? "ຂາເຂົ້າ" : "ຂາອອກ";
  var dirIcon = dir === "in" ? "📥" : "📤";
  div.innerHTML =
    '<div class="sec-head">' +
    '<div class="sec-head-left"><h2>' +
    dirIcon +
    " " +
    deptName +
    " — " +
    dirLabel +
    "</h2>" +
    "<p>ລາຍການເອກະສານ" +
    dirLabel +
    "ທັງໝົດ</p></div>" +
    '<div class="sec-head-right">' +
    '<select id="dept-filter-' +
    k +
    "-" +
    dir +
    '" class="dept-filter-sel" onchange="applyDeptFilter(\'' +
    k +
    "','" +
    dir +
    "')\"></select>" +
    '<button class="btn-add" onclick="openForm(\'' +
    k +
    "','" +
    dir +
    "','" +
    deptName +
    "')\">+ ເພີ່ມ" +
    dirLabel +
    "</button>" +
    "</div></div>" +
    '<div class="stats-row" id="stats-' +
    k +
    "-" +
    dir +
    '">' +
    '<div class="stat-card"><div class="stat-icon total">📊</div><div><div class="stat-val" id="st-total-' +
    k +
    "-" +
    dir +
    '">0</div><div class="stat-lbl">ທັງໝົດ</div></div></div>' +
    '<div class="stat-card"><div class="stat-icon in">📥</div><div><div class="stat-val" id="st-in-' +
    k +
    "-" +
    dir +
    '">0</div><div class="stat-lbl">ຂາເຂົ້າ</div></div></div>' +
    '<div class="stat-card"><div class="stat-icon out">📤</div><div><div class="stat-val" id="st-out-' +
    k +
    "-" +
    dir +
    '">0</div><div class="stat-lbl">ຂາອອກ</div></div></div>' +
    "</div>" +
    '<div class="table-wrap"><table>' +
    "<thead><tr><th>ເລກທີ</th><th>ວັນທີ</th><th>ເວລາ</th>" +
    "<th>ຊື່ເອກະສານ</th><th>ຜູ້ຮ້ອງຂໍ</th>" +
    "<th>ພະແນກຜູ້ຮ້ອງຂໍ</th><th>ພະແນກ</th>" +
    "<th>ອານຸມັດໂດຍ</th><th>ລາຍລະອຽດ</th>" +
    '<th>ປະເພດ</th><th style="width:80px"></th></tr></thead>' +
    '<tbody id="tb-' +
    k +
    "-" +
    dir +
    '"><tr><td colspan="11" class="empty-cell">⏳ ກຳລັງໂຫລດ...</td></tr></tbody>' +
    "</table></div>";
  document.getElementById("dynamic-sections").appendChild(div);
}

async function loadDocsBySection(k, dir) {
  if (!CU) return;
  if (!DEPTS || !DEPTS.length) {
    await loadDepts();
    setTimeout(function () {
      loadDocsBySection(k, dir);
    }, 300);
    return;
  }
  var deptName = deptNameByKey(k) || String(CU.department || "").trim();
  var cuDept = String(CU.department || "").trim();
  var allowedNames = DEPT_GROUP_MAP[cuDept] || [cuDept];
  if (CU.role !== "admin" && allowedNames.indexOf(deptName) < 0) return;
  var tb = document.getElementById("tb-" + k + "-" + dir);
  if (!tb) return;
  tb.innerHTML =
    '<tr><td colspan="11" class="empty-cell">⏳ ກຳລັງໂຫລດ...</td></tr>';
  // Fetch only this section's specific department (not the whole group)
  var fetchDepts =
    CU.role === "admin"
      ? DEPTS.map(function (d) {
          return d.name;
        })
      : [deptName];
  var params =
    "role=" +
    CU.role +
    "&" +
    fetchDepts
      .map(function (d) {
        return "dept=" + encodeURIComponent(d);
      })
      .join("&");
  var res = await api("GET", "/documents?" + params);
  DOCS = res && res.success ? res.data || [] : [];
  buildDeptFilter(k, dir);
  applyDeptFilter(k, dir);
}

function buildDeptFilter(k, dir) {
  var sel = document.getElementById("dept-filter-" + k + "-" + dir);
  if (!sel) return;
  var thisDeptName = deptNameByKey(k) || "";
  var cuDept = String(CU.department || "").trim();
  var relatedDepts;
  if (CU.role === "admin") {
    relatedDepts = DEPTS.map(function (d) {
      return d.name;
    });
  } else {
    var g = DEPT_GROUP_MAP[thisDeptName] || [thisDeptName];
    var a = DEPT_GROUP_MAP[cuDept] || [cuDept];
    relatedDepts = g.filter(function (n) {
      return a.indexOf(n) >= 0;
    });
    if (!relatedDepts.length) relatedDepts = [thisDeptName];
  }
  var prev = sel.value;
  sel.innerHTML = "";
  var all = document.createElement("option");
  all.value = "";
  all.textContent = "📋 ທັງໝົດ";
  sel.appendChild(all);
  relatedDepts.forEach(function (name) {
    var o = document.createElement("option");
    o.value = name;
    o.textContent = name;
    sel.appendChild(o);
  });
  if (prev && relatedDepts.indexOf(prev) >= 0) sel.value = prev;
}

function applyDeptFilter(k, dir) {
  var sel = document.getElementById("dept-filter-" + k + "-" + dir);
  var selectedDept = sel ? sel.value : "";
  var docType = dir === "in" ? "ຂາເຂົ້າ" : "ຂາອອກ";
  var cuDept = String(CU.department || "").trim();
  var thisDeptName = deptNameByKey(k) || cuDept;
  var groupOfSec =
    CU.role === "admin"
      ? DEPTS.map(function (d) {
          return d.name;
        })
      : [thisDeptName];
  var allowedForUser =
    CU.role === "admin"
      ? DEPTS.map(function (d) {
          return d.name;
        })
      : DEPT_GROUP_MAP[cuDept] || [cuDept];
  var validDepts =
    CU.role === "admin"
      ? groupOfSec
      : groupOfSec.filter(function (n) {
          return allowedForUser.indexOf(n) >= 0;
        });
  var base = DOCS.filter(function (d) {
    var deptOk = selectedDept
      ? String(d.department || "").trim() === selectedDept
      : validDepts.indexOf(String(d.department || "").trim()) >= 0;
    return deptOk && d.docType === docType;
  });
  var q = document.getElementById("search").value.toLowerCase();
  var result = q
    ? base.filter(function (d) {
        return Object.values(d).some(function (v) {
          return String(v).toLowerCase().indexOf(q) >= 0;
        });
      })
    : base;
  renderTableTo("tb-" + k + "-" + dir, result, k, dir);
}

function updateStats(k, dir, docs) {
  var t = document.getElementById("st-total-" + k + "-" + dir);
  var i = document.getElementById("st-in-" + k + "-" + dir);
  var o = document.getElementById("st-out-" + k + "-" + dir);
  if (t) t.textContent = docs.length;
  if (i)
    i.textContent = docs.filter(function (d) {
      return d.docType === "ຂາເຂົ້າ";
    }).length;
  if (o)
    o.textContent = docs.filter(function (d) {
      return d.docType === "ຂາອອກ";
    }).length;
}

function renderTableTo(tbId, docs, k, dir) {
  var tb = document.getElementById(tbId);
  if (!tb) return;
  if (k && dir) updateStats(k, dir, docs);
  if (!docs.length) {
    tb.innerHTML =
      '<tr><td colspan="11" class="empty-cell">📭 ຍັງບໍ່ມີຂໍ້ມູນ</td></tr>';
    return;
  }
  tb.innerHTML = docs
    .map(function (d) {
      var editBtn =
        '<button class="btn-edit" onclick="openEditForm(\'' +
        esc(d.docNumber) +
        '\')" title="ແກ້ໄຂ">✏️</button>';
      var delBtn =
        CU.role === "admin"
          ? '<button class="btn-del" onclick="delDoc(\'' +
            esc(d.docNumber) +
            '\')" title="ລຶບ">🗑</button>'
          : "";
      var badge =
        d.docType === "ຂາເຂົ້າ"
          ? '<span class="badge badge-in">📥 ຂາເຂົ້າ</span>'
          : '<span class="badge badge-out">📤 ຂາອອກ</span>';
      return (
        "<tr>" +
        '<td class="doc-num">' +
        esc(d.docNumber) +
        "</td>" +
        "<td>" +
        esc(d.docDate) +
        "</td><td>" +
        esc(d.docTime) +
        "</td>" +
        "<td>" +
        esc(d.subject) +
        "</td><td>" +
        esc(d.recipient) +
        "</td>" +
        "<td>" +
        esc(d.requesterDept) +
        "</td><td>" +
        esc(d.department) +
        "</td>" +
        "<td>" +
        esc(d.approvedBy) +
        "</td>" +
        '<td class="doc-det" title="' +
        esc(d.details) +
        '">' +
        esc(d.details) +
        "</td>" +
        "<td>" +
        badge +
        '</td><td><div class="table-actions">' +
        editBtn +
        delBtn +
        "</div></td></tr>"
      );
    })
    .join("");
}

function filterDocs() {
  if (!CURRENT_KEY || !CURRENT_DIR) return;
  applyDeptFilter(CURRENT_KEY, CURRENT_DIR);
}

// ============================================================
// MODAL / FORM
// ============================================================
async function openForm(k, dir, forceDeptName) {
  FORM_KEY = k;
  FORM_DIR = dir;
  EDIT_DOC_NUM = null;
  var deptName = forceDeptName || deptNameByKey(k) || "";
  var dirLabel = dir === "in" ? "ຂາເຂົ້າ" : "ຂາອອກ";
  var now = new Date();
  document.getElementById("modal-title").textContent =
    (dir === "in" ? "📥 " : "📤 ") + "ເພີ່ມ" + dirLabel + " — " + deptName;
  document.getElementById("f-date").value = now.toISOString().split("T")[0];
  document.getElementById("f-time").value = now.toTimeString().slice(0, 8);
  document.getElementById("f-subj").value = "";
  document.getElementById("f-recv").value = "";
  document.getElementById("f-det").value = "";
  document.getElementById("f-type").value = dir === "in" ? "ຂາເຂົ້າ" : "ຂາອອກ";
  fillDeptSel("f-dept");
  document.getElementById("f-dept").value = "";
  document.getElementById("f-num").readOnly = false;
  // Load next doc number
  document.getElementById("f-num").value = "⏳ ກຳລັງໂຫລດ...";
  var res = await api(
    "GET",
    "/documents/next-number?dept=" + encodeURIComponent(deptName),
  );
  document.getElementById("f-num").value =
    res && res.docNumber ? res.docNumber : "";

  // Load approvers dropdown
  await loadApproversForForm(deptName, "");

  document.getElementById("modal").classList.remove("hidden");
}

function openEditForm(docNum) {
  var d = DOCS.find(function (x) {
    return x.docNumber === docNum;
  });
  if (!d) return;
  FORM_KEY = CURRENT_KEY;
  FORM_DIR = CURRENT_DIR;
  EDIT_DOC_NUM = docNum;
  var dirLabel = CURRENT_DIR === "in" ? "ຂາເຂົ້າ" : "ຂາອອກ";
  document.getElementById("modal-title").textContent = "✏️ ແກ້ໄຂ" + dirLabel;
  document.getElementById("f-num").value = d.docNumber;
  document.getElementById("f-num").readOnly = true;
  document.getElementById("f-date").value = d.docDate;
  document.getElementById("f-time").value = d.docTime;
  document.getElementById("f-subj").value = d.subject;
  document.getElementById("f-recv").value = d.recipient;
  fillDeptSel("f-dept");
  document.getElementById("f-dept").value = d.requesterDept || "";
  document.getElementById("f-type").value = d.docType;
  document.getElementById("f-det").value = d.details;

  // Load approvers dropdown and select current value
  loadApproversForForm(d.department, d.approvedBy);

  document.getElementById("modal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("modal").classList.add("hidden");
  var btn = document.getElementById("save-btn");
  if (btn) {
    btn.disabled = false;
    btn.textContent = "💾 ບັນທຶກ";
  }
}

async function submitDoc() {
  var fields = [
    { id: "f-num" },
    { id: "f-subj" },
    { id: "f-recv" },
    { id: "f-dept" },
    { id: "f-type" },
    { id: "f-approved" },
  ];
  var valid = true;
  fields.forEach(function (f) {
    var el = document.getElementById(f.id);
    if (!el.value.trim()) {
      el.classList.add("field-error");
      valid = false;
    } else el.classList.remove("field-error");
  });
  if (!valid) return;

  var btn = document.getElementById("save-btn");
  btn.disabled = true;
  btn.textContent = "⏳ ກຳລັງບັນທຶກ...";

  var doc = {
    docNumber: EDIT_DOC_NUM || document.getElementById("f-num").value,
    docDate: document.getElementById("f-date").value,
    docTime: document.getElementById("f-time").value,
    subject: document.getElementById("f-subj").value.trim(),
    recipient: document.getElementById("f-recv").value.trim(),
    requesterDept: document.getElementById("f-dept").value,
    department: deptNameByKey(FORM_KEY) || String(CU.department || "").trim(),
    docType: document.getElementById("f-type").value,
    approvedBy: document.getElementById("f-approved").value.trim(),
    details: document.getElementById("f-det").value.trim(),
    createdBy: CU.username,
  };

  showLoading();
  var res;
  if (EDIT_DOC_NUM) {
    res = await api(
      "PUT",
      "/documents/" + encodeURIComponent(EDIT_DOC_NUM),
      doc,
    );
  } else {
    res = await api("POST", "/documents", doc);
  }
  hideLoading();
  btn.disabled = false;
  btn.textContent = "💾 ບັນທຶກ";

  if (res && res.success) {
    closeModal();
    showToast("✅ ບັນທຶກສຳເລັດແລ້ວ!");
    if (FORM_KEY && FORM_DIR) loadDocsBySection(FORM_KEY, FORM_DIR);
  } else {
    showToast("❌ ຜິດພາດ: " + (res ? res.message : ""), true);
  }
}

async function delDoc(num) {
  if (!confirm("ລຶບເລກທີ " + num + " ແທ້ບໍ?")) return;
  showLoading();
  var res = await api("DELETE", "/documents/" + encodeURIComponent(num));
  hideLoading();
  if (res && res.success) {
    showToast("🗑 ລຶບສຳເລັດ");
    if (CURRENT_KEY && CURRENT_DIR) loadDocsBySection(CURRENT_KEY, CURRENT_DIR);
  } else {
    showToast("❌ " + (res ? res.message : "ລຶບລົ້ມເຫລວ"), true);
  }
}

function toggleSB() {
  var sb = document.getElementById("sidebar");
  sb.classList.toggle("open");
  var ov = document.getElementById("sidebar-overlay");
  if (ov) {
    if (sb.classList.contains("open")) {
      ov.classList.remove("hidden");
    } else {
      ov.classList.add("hidden");
    }
  }
}

function closeModalOnOutsideClick(e) {
  if (e.target.id === "modal") closeModal();
}

document.addEventListener("keydown", function (e) {
  if (e.key !== "Enter") return;
  if (!document.getElementById("login-form").classList.contains("hidden"))
    doLogin();
  else if (!document.getElementById("reg-form").classList.contains("hidden"))
    doRegister();
});

// ============================================================
// ADMIN APPROVERS MANAGEMENT & SELECT POPULATION
// ============================================================
async function loadApproversForForm(deptName, currentValue) {
  var sel = document.getElementById("f-approved");
  if (!sel) return;

  while (sel.options.length > 1) sel.remove(1);

  var res = await api(
    "GET",
    "/approvers/active?dept=" + encodeURIComponent(deptName),
  );
  var list = res && res.success ? res.data || [] : [];

  list.forEach(function (name) {
    var o = document.createElement("option");
    o.value = name;
    o.textContent = name;
    sel.appendChild(o);
  });

  if (currentValue && list.indexOf(currentValue) < 0) {
    var o = document.createElement("option");
    o.value = currentValue;
    o.textContent = currentValue + " (ປິດໃຊ້ງານ)";
    sel.appendChild(o);
  }

  sel.value = currentValue || "";
}

var APPROVERS = [];
var EDIT_APPROVER_ID = null;

async function loadApprovers() {
  showLoading();
  var res = await api("GET", "/approvers");
  hideLoading();
  APPROVERS = res && res.success ? res.data || [] : [];
  renderApproversTable();
}

function renderApproversTable() {
  var container = document.getElementById("approvers-container");
  if (!container) return;
  if (!APPROVERS.length) {
    container.innerHTML =
      '<div style="color:var(--gray-400);font-size:13px;padding:20px 0">📭 ຍັງບໍ່ມີຂໍ້ມູນ</div>';
    return;
  }

  // Group by department
  var groups = {};
  APPROVERS.forEach(function (ap) {
    var dept = ap.department || "ອື່ນໆ";
    if (!groups[dept]) groups[dept] = [];
    groups[dept].push(ap);
  });

  var html = '<div class="apr-groups">';
  Object.keys(groups)
    .sort()
    .forEach(function (dept) {
      var icon = "";
      var list = groups[dept];
      var activeCount = list.filter(function (a) {
        return a.is_active;
      }).length;
      html += '<div class="apr-dept-card">';
      html +=
        '<div class="apr-dept-head">' +
        '<div class="apr-dept-title"><span class="apr-dept-icon">' +
        getDeptIcon(dept) +
        "</span>" +
        esc(dept) +
        "</div>" +
        '<span class="apr-dept-count">' +
        activeCount +
        "/" +
        list.length +
        " Active</span>" +
        "</div>";
      html += '<div class="apr-list">';
      list.forEach(function (ap) {
        var isActive = ap.is_active;
        html +=
          '<div class="apr-row' +
          (isActive ? "" : " apr-row-inactive") +
          '">' +
          '<div class="apr-row-info">' +
          '<div class="apr-avatar">' +
          esc((ap.name || "?")[0]).toUpperCase() +
          "</div>" +
          '<span class="apr-name">' +
          esc(ap.name) +
          "</span>" +
          "</div>" +
          '<div class="apr-row-actions">' +
          '<span class="apr-badge ' +
          (isActive ? "apr-badge-on" : "apr-badge-off") +
          '">' +
          (isActive ? "Active" : "Inactive") +
          "</span>" +
          '<button class="apr-btn apr-btn-edit" onclick="openApproverEditForm(\'' +
          ap.id +
          '\')" title="ແກ້ໄຂ">✏️</button>' +
          '<button class="apr-btn ' +
          (isActive ? "apr-btn-off" : "apr-btn-on") +
          '" onclick="toggleApproverStatus(\'' +
          ap.id +
          "'," +
          isActive +
          ')" title="' +
          (isActive ? "ປິດ" : "ເປີດ") +
          '">' +
          (isActive ? "🔒" : "🔓") +
          "</button>" +
          "</div>" +
          "</div>";
      });
      html += "</div></div>";
    });
  html += "</div>";
  container.innerHTML = html;
}

function openApproverForm() {
  EDIT_APPROVER_ID = null;
  document.getElementById("modal-approver-title").textContent =
    "➕ ເພີ່ມຜູ້ອານຸມັດ";
  document.getElementById("fa-name").value = "";
  fillDeptSel("fa-dept");
  document.getElementById("fa-dept").value = "";
  document.getElementById("modal-approver").classList.remove("hidden");
}

function openApproverEditForm(id) {
  var ap = APPROVERS.find(function (x) {
    return x.id === id;
  });
  if (!ap) return;
  EDIT_APPROVER_ID = id;
  document.getElementById("modal-approver-title").textContent =
    "✏️ ແກ້ໄຂຜູ້ອານຸມັດ";
  document.getElementById("fa-name").value = ap.name;
  fillDeptSel("fa-dept");
  document.getElementById("fa-dept").value = ap.department;
  document.getElementById("modal-approver").classList.remove("hidden");
}

function closeApproverModal() {
  document.getElementById("modal-approver").classList.add("hidden");
}

function closeApproverModalOnOutsideClick(e) {
  if (e.target.id === "modal-approver") closeApproverModal();
}

async function submitApprover() {
  var name = document.getElementById("fa-name").value.trim();
  var dept = document.getElementById("fa-dept").value;

  if (!name || !dept) {
    showToast("⚠️ ກະລຸນາຕື່ມຂໍ້ມູນໃຫ້ຄົບ", true);
    return;
  }

  showLoading();
  var res;
  if (EDIT_APPROVER_ID) {
    res = await api("PUT", "/approvers/" + EDIT_APPROVER_ID, {
      name: name,
      department: dept,
    });
  } else {
    res = await api("POST", "/approvers", { name: name, department: dept });
  }
  hideLoading();

  if (res && res.success) {
    closeApproverModal();
    showToast("✅ ບັນທຶкສຳເລັດແລ້ວ!");
    loadApprovers();
  } else {
    showToast("❌ ຜິດພາດ: " + (res ? res.message : ""), true);
  }
}

async function toggleApproverStatus(id, currentActive) {
  var confirmMsg = currentActive
    ? "ຕ້ອງການປິດໃຊ້ງານຜູ້ອານຸມັດຄົນນີ້ແທ້ບໍ?"
    : "ຕ້ອງການເປີດໃຊ້ງານຜູ້ອານຸມັດຄົນນີ້ແທ້ບໍ?";
  if (!confirm(confirmMsg)) return;

  showLoading();
  var res = await api("PUT", "/approvers/" + id, { is_active: !currentActive });
  hideLoading();

  if (res && res.success) {
    showToast("✅ ປ່ຽນສະຖານະສຳເລັດ!");
    loadApprovers();
  } else {
    showToast("❌ ຜິດພາດ: " + (res ? res.message : ""), true);
  }
}
