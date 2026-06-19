// ============================================================
// CONFIG — API URL (PHP + MySQL backend)
// ============================================================
// ใช้ same origin เมื่อรันผ่าน XAMPP / php -S router.php
// ถ้า frontend แยก host (เช่น Cloudflare Pages) ให้ตั้งค่าใน localStorage: lhms_api_base
var API = localStorage.getItem("lhms_api_base") || "";
if (!API) {
  if (window.location.protocol === "file:") {
    API = "http://localhost:3000";
  } else if (window.location.hostname === "localhost" && window.location.port !== "3000") {
    API = "http://localhost:3000";
  }
}

// ============================================================
// STATE
// ============================================================
var CU = null,
  DOCS = [],
  DEPTS = [],
  TOKEN = "";
var DOCS_CACHE = {}; // per-section cache: key = k+'-'+dir
var CURRENT_KEY = null,
  CURRENT_DIR = null;
var PAGE_SIZE = 10;
var CURRENT_PAGES = {};
var FILTERED_CACHE = {};
var FORM_KEY = null,
  FORM_DIR = null,
  EDIT_DOC_NUM = null,
  EDIT_DOC_DEPT = null;
var DONUT_CHART = null,
  BAR_CHART = null;

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
function visibleDeptNamesForUser() {
  var cuDept = String((CU && CU.department) || "").trim();
  if (!CU) return [];
  if (CU.role === "admin") {
    return DEPTS.map(function (d) {
      return d.name;
    });
  }
  return DEPT_GROUP_MAP[cuDept] || (cuDept ? [cuDept] : []);
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
    // Token expired or invalid → auto logout
    if (res.status === 401) {
      showToast("⏰ Session ໝົດອາຍຸ — ກະລຸນາ Login ໃໝ່", true);
      setTimeout(doLogout, 1500);
      return { success: false, message: "Session ໝົດອາຍຸ" };
    }
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
  var s = localStorage.getItem("lhms_u");
  var t = localStorage.getItem("lhms_t");
  var cached = localStorage.getItem("lhms_depts");
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
    localStorage.setItem("lhms_u", JSON.stringify(CU));
    localStorage.setItem("lhms_t", TOKEN);
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
  localStorage.clear();
  // Hide FAB
  var fab = document.getElementById("fab-quick-add");
  if (fab) fab.style.display = "none";
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
    localStorage.setItem("lhms_depts", JSON.stringify(DEPTS));
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
  // Show FAB
  var fab = document.getElementById("fab-quick-add");
  if (fab) fab.style.display = "flex";
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
    var allowedNames = visibleDeptNamesForUser();
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
  if (!DEPTS || !DEPTS.length) {
    await loadDepts();
  }

  // Set hero date
  var heroDate = document.getElementById("db-hero-date");
  if (heroDate) {
    var now = new Date();
    heroDate.textContent = now.toLocaleDateString("lo-LA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  }

  // Set personalized welcome greeting based on time
  var welcomeTitle = document.getElementById("db-welcome-title");
  if (welcomeTitle && CU) {
    var hrs = new Date().getHours();
    var greet = "ສະບາຍດີ";
    if (hrs >= 4 && hrs < 12) {
      greet = "ສະບາຍດີຕອນເຊົ້າ ພະແນກ"; // Good morning
    } else if (hrs >= 12 && hrs < 17) {
      greet = "ສະບາຍດີຕອນບ່າຍ ພະແນກ"; // Good afternoon
    } else {
      greet = "ສະບາຍດີຕອນແລງ ພະແນກ"; // Good evening
    }
    welcomeTitle.textContent = greet + ", " + esc(CU.fullname || CU.username);
  }

  var allowedNames = visibleDeptNamesForUser();
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
    container.innerHTML =
      '<div style="color:var(--red);padding:16px">❌ ໂຫລດຂໍ້ມູນບໍ່ສຳເລັດ: ' +
      esc(res && res.message ? res.message : "ກະລຸນາ Refresh ໜ້ານີ້") +
      '</div>';
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

  var totalCount = visible.length;
  var inCount = visible.filter(function (d) {
    return d.docType === "ຂາເຂົ້າ";
  }).length;
  var outCount = visible.filter(function (d) {
    return d.docType === "ຂາອອກ";
  }).length;

  document.getElementById("db-total").textContent = totalCount;
  document.getElementById("db-in").textContent = inCount;
  document.getElementById("db-out").textContent = outCount;

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
    if (!byDept[dep]) {
      byDept[dep] = { total: 0, in: 0, out: 0, approvers: {} };
      activeApprovers.forEach(function (ap) {
        if (String(ap.department || "").trim() === dep) {
          byDept[dep].approvers[ap.name] = 0;
        }
      });
    }
    byDept[dep].total++;
    if (d.docType === "ຂາເຂົ້າ") byDept[dep].in++;
    else byDept[dep].out++;
    var appBy = String(d.approvedBy || "").trim();
    if (appBy && byDept[dep] && Object.prototype.hasOwnProperty.call(byDept[dep].approvers, appBy)) {
      byDept[dep].approvers[appBy]++;
    }
  });

  DEPT_APPROVER_DATA = byDept;

  var keys = Object.keys(byDept);
  if (!keys.length) {
    container.innerHTML =
      '<div style="color:var(--gray-400);font-size:13px;padding:20px 0">📭 ຍັງບໍ່ມີຂໍ້ມູນ</div>';
  } else {
    container.innerHTML = keys
      .map(function (dep) {
        var s = byDept[dep];
        var hasApprovers = Object.keys(s.approvers).length > 0;
        var icon = getDeptIcon(dep);
        var approverBtn = hasApprovers
          ? '<button class="mc-btn" onclick="openDeptModal(\'' + dep.replace(/'/g, "\\'") + '\')">ເບິ່ງຜູ້ອານຸມັດ</button>'
          : '';
        return (
          '<div class="modern-dept-card">' +
          '  <div class="mdc-head">' +
          '    <div class="mdc-icon">' + icon + '</div>' +
          '    <div class="mdc-title">' + esc(dep) + '</div>' +
          '  </div>' +
          '  <div class="mdc-stats">' +
          '    <div class="mdc-stat">' +
          '      <div class="mdc-val">' + s.total + '</div>' +
          '      <div class="mdc-lbl">ທັງໝົດ</div>' +
          '    </div>' +
          '    <div class="mdc-stat">' +
          '      <div class="mdc-val clr-in">' + s.in + '</div>' +
          '      <div class="mdc-lbl">ຂາເຂົ້າ</div>' +
          '    </div>' +
          '    <div class="mdc-stat">' +
          '      <div class="mdc-val clr-out">' + s.out + '</div>' +
          '      <div class="mdc-lbl">ຂາອອກ</div>' +
          '    </div>' +
          '  </div>' +
          (approverBtn ? '  <div class="mdc-actions">' + approverBtn + '</div>' : '') +
          '</div>'
        );
      })
      .join("");
  }

  // 1. Render Recent Activity Feed (Latest 5 documents)
  var recentEl = document.getElementById("db-recent-activity");
  if (recentEl) {
    var recentDocs = visible.slice(0, 5);
    if (recentDocs.length === 0) {
      recentEl.innerHTML = '<div class="activity-empty">📭 ຍັງບໍ່ມີການເຄື່ອນໄຫວ</div>';
    } else {
      recentEl.innerHTML = recentDocs
        .map(function (d) {
          var iconClass = d.docType === "ຂາເຂົ້າ" ? "in" : "out";
          var iconEmoji = d.docType === "ຂາເຂົ້າ" ? "📥" : "📤";
          return (
            '<div class="activity-item">' +
            '  <div class="activity-icon-wrap ' + iconClass + '">' + iconEmoji + '</div>' +
            '  <div class="activity-details">' +
            '    <div class="activity-meta">' +
            '      <span class="activity-num">' + esc(d.docNumber) + '</span>' +
            '      <span class="activity-time">' + esc(d.docDate) + '</span>' +
            '    </div>' +
            '    <div class="activity-subj" title="' + esc(d.subject) + '">' + esc(d.subject) + '</div>' +
            '    <div class="activity-footer">' +
            '      <span class="activity-dept">' + esc(d.department) + '</span>' +
            '      <button class="activity-btn" onclick="openEditForm(\'' + esc(d.docNumber) + '\')">✏️ ແກ້ໄຂ</button>' +
            '    </div>' +
            '  </div>' +
            '</div>'
          );
        })
        .join("");
    }
  }

  // 2. Render Donut Chart (Chart.js)
  var docTypeCanvas = document.getElementById("chart-doc-type");
  if (docTypeCanvas) {
    var donutCtx = docTypeCanvas.getContext("2d");
    if (DONUT_CHART) DONUT_CHART.destroy();
    DONUT_CHART = new Chart(donutCtx, {
      type: "doughnut",
      data: {
        labels: ["ຂາເຂົ້າ", "ຂາອອກ"],
        datasets: [{
          data: [inCount, outCount],
          backgroundColor: ["#4f46e5", "#10b981"],
          borderColor: ["#ffffff", "#ffffff"],
          borderWidth: 2,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              font: { family: "Noto Sans Lao, Inter", size: 11, weight: "600" },
              color: "#475569"
            }
          }
        },
        cutout: "70%"
      }
    });
  }

  // 3. Render Bar Chart (Chart.js)
  var docDeptCanvas = document.getElementById("chart-doc-dept");
  if (docDeptCanvas) {
    var barCtx = docDeptCanvas.getContext("2d");
    if (BAR_CHART) BAR_CHART.destroy();
    BAR_CHART = new Chart(barCtx, {
      type: "bar",
      data: {
        labels: keys,
        datasets: [{
          label: "ເອກະສານທັງໝົດ",
          data: keys.map(function (k) { return byDept[k].total; }),
          backgroundColor: "rgba(79, 70, 229, 0.12)",
          borderColor: "#4f46e5",
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y", // Horizontal layout
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { family: "Noto Sans Lao, Inter", size: 10, weight: "600" },
              color: "#64748b"
            }
          },
          y: {
            grid: { display: false },
            ticks: {
              font: { family: "Noto Sans Lao, Inter", size: 10, weight: "600" },
              color: "#475569"
            }
          }
        }
      }
    });
  }
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
    // Date filter bar
    '<div class="date-filter-bar">' +
    '<label>\ud83d\udcc5 \u0ea7\u0eb1\u0e99\u0e97\u0eb5\u0ec8:</label>' +
    '<input type="date" id="df-from-' + k + '-' + dir + '" onchange="applyDeptFilter(\'' + k + "','" + dir + "')" + '">' +
    '<span class="date-filter-sep">\u2192</span>' +
    '<input type="date" id="df-to-' + k + '-' + dir + '" onchange="applyDeptFilter(\'' + k + "','" + dir + "')" + '">' +
    '<button class="btn-date-clear" onclick="clearDateFilter(\'' + k + "','" + dir + "')" + '">\u2715 \u0ea5\u0ec9\u0eb2\u0e87</button>' +
    '</div>' +
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
    "</table></div>" +
    '<div class="pagination" id="pg-' + k + '-' + dir + '"></div>';
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
  var allowedNames = visibleDeptNamesForUser();
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
  var loaded = res && res.success ? res.data || [] : [];
  DOCS = loaded;
  DOCS_CACHE[k + "-" + dir] = loaded;
  buildDeptFilter(k, dir);
  applyDeptFilter(k, dir);
}

function buildDeptFilter(k, dir) {
  var sel = document.getElementById("dept-filter-" + k + "-" + dir);
  if (!sel) return;
  var thisDeptName = deptNameByKey(k) || "";
  var relatedDepts;
  if (CU.role === "admin") {
    relatedDepts = DEPTS.map(function (d) {
      return d.name;
    });
  } else {
    var a = visibleDeptNamesForUser();
    relatedDepts = a.indexOf(thisDeptName) >= 0 ? [thisDeptName] : [];
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
  var groupOfSec = [thisDeptName];
  var allowedForUser =
    CU.role === "admin"
      ? DEPTS.map(function (d) {
        return d.name;
      })
      : visibleDeptNamesForUser();
  var validDepts =
    CU.role === "admin"
      ? groupOfSec
      : groupOfSec.filter(function (n) {
        return allowedForUser.indexOf(n) >= 0;
      });

  // Use per-section cache to avoid race conditions when navigating between sections
  var sectionDocs = DOCS_CACHE[k + "-" + dir] || DOCS;

  var base = sectionDocs.filter(function (d) {
    var deptOk = selectedDept
      ? String(d.department || "").trim() === selectedDept
      : validDepts.indexOf(String(d.department || "").trim()) >= 0;
    var requesterDept = String(d.requesterDept || "").trim();
    var requesterOk =
      CU.role === "admin" || !requesterDept || allowedForUser.indexOf(requesterDept) >= 0;
    // Date range filter
    var dateOk = true;
    var fromEl = document.getElementById("df-from-" + k + "-" + dir);
    var toEl = document.getElementById("df-to-" + k + "-" + dir);
    var fromDate = fromEl ? fromEl.value : "";
    var toDate = toEl ? toEl.value : "";
    if (fromDate || toDate) {
      var docDate = String(d.docDate || "").slice(0, 10);
      if (fromDate && docDate < fromDate) dateOk = false;
      if (toDate && docDate > toDate) dateOk = false;
    }
    return deptOk && requesterOk && d.docType === docType && dateOk;
  });
  var q = document.getElementById("search").value.toLowerCase();
  var result = q
    ? base.filter(function (d) {
      return Object.values(d).some(function (v) {
        return String(v).toLowerCase().indexOf(q) >= 0;
      });
    })
    : base;
  FILTERED_CACHE[k + "-" + dir] = result;
  CURRENT_PAGES[k + "-" + dir] = 1;
  renderPage(k, dir);
}

function clearDateFilter(k, dir) {
  var fromEl = document.getElementById("df-from-" + k + "-" + dir);
  var toEl = document.getElementById("df-to-" + k + "-" + dir);
  if (fromEl) fromEl.value = "";
  if (toEl) toEl.value = "";
  applyDeptFilter(k, dir);
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
        '<td><span class="doc-num">' +
        esc(d.docNumber) +
        "</span></td>" +
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
// PAGINATION
// ============================================================
function renderPage(k, dir) {
  var key = k + "-" + dir;
  var allDocs = FILTERED_CACHE[key] || [];
  var page = CURRENT_PAGES[key] || 1;
  var totalPages = Math.max(1, Math.ceil(allDocs.length / PAGE_SIZE));
  if (page > totalPages) page = totalPages;
  CURRENT_PAGES[key] = page;

  var start = (page - 1) * PAGE_SIZE;
  var pageDocs = allDocs.slice(start, start + PAGE_SIZE);

  renderTableTo("tb-" + k + "-" + dir, pageDocs, k, dir);
  // Override stats with ALL filtered docs (not just current page)
  updateStats(k, dir, allDocs);
  renderPagination(k, dir, allDocs.length);
}

function renderPagination(k, dir, total) {
  var pgEl = document.getElementById("pg-" + k + "-" + dir);
  if (!pgEl) return;
  var totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  var currentPage = CURRENT_PAGES[k + "-" + dir] || 1;

  if (totalPages <= 1) {
    pgEl.innerHTML = "";
    return;
  }

  var html = '<div class="pg-wrap">';
  // Previous
  html += '<button class="pg-btn pg-prev' + (currentPage <= 1 ? ' pg-disabled' : '') + '"' +
    (currentPage > 1 ? " onclick=\"goToPage('" + k + "','" + dir + "'," + (currentPage - 1) + ")\"" : '') +
    '>◀ ກ່ອນ</button>';

  // Page numbers (show max 5)
  var startPage = Math.max(1, currentPage - 2);
  var endPage = Math.min(totalPages, startPage + 4);
  if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

  for (var i = startPage; i <= endPage; i++) {
    html += '<button class="pg-btn pg-num' + (i === currentPage ? ' pg-active' : '') + '"' +
      " onclick=\"goToPage('" + k + "','" + dir + "'," + i + ")\">" + i + '</button>';
  }

  // Next
  html += '<button class="pg-btn pg-next' + (currentPage >= totalPages ? ' pg-disabled' : '') + '"' +
    (currentPage < totalPages ? " onclick=\"goToPage('" + k + "','" + dir + "'," + (currentPage + 1) + ")\"" : '') +
    '>ຕໍ່ ▶</button>';

  html += '</div>';
  pgEl.innerHTML = html;
}

function goToPage(k, dir, page) {
  CURRENT_PAGES[k + "-" + dir] = page;
  renderPage(k, dir);
  // Scroll table into view
  var tableWrap = document.getElementById("tb-" + k + "-" + dir);
  if (tableWrap && tableWrap.closest('.table-wrap')) {
    tableWrap.closest('.table-wrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ============================================================
// MODAL / FORM
// ============================================================
async function openForm(k, dir, forceDeptName) {
  FORM_KEY = k;
  FORM_DIR = dir;
  EDIT_DOC_NUM = null;
  EDIT_DOC_DEPT = null;
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
  // Search the correct section's cache first, then fall back to all caches
  var sectionKey = (CURRENT_KEY || "") + "-" + (CURRENT_DIR || "");
  var sectionDocs = DOCS_CACHE[sectionKey] || DOCS;
  var d = sectionDocs.find(function (x) {
    return x.docNumber === docNum;
  });
  // Fallback: search all cached sections
  if (!d) {
    var allKeys = Object.keys(DOCS_CACHE);
    for (var i = 0; i < allKeys.length; i++) {
      d = DOCS_CACHE[allKeys[i]].find(function (x) { return x.docNumber === docNum; });
      if (d) break;
    }
  }
  if (!d) {
    showToast("⚠️ ບໍ່ພົບຂໍ້ມູນເອກະສານ — ລອງ Refresh ໜ້ານີ້ໃໝ່", true);
    return;
  }

  FORM_KEY = CURRENT_KEY;
  FORM_DIR = CURRENT_DIR;
  EDIT_DOC_NUM = docNum;
  EDIT_DOC_DEPT = d.department;
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
    department: EDIT_DOC_DEPT || deptNameByKey(FORM_KEY) || String(CU.department || "").trim(),
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
          '<button class="apr-btn apr-btn-del" onclick="deleteApprover(\'' +
          ap.id +
          '\',\'' +
          esc(ap.name).replace(/'/g, "\\'") +
          '\')" title="ລຶບ">🗑</button>' +
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
    showToast("✅ ບັນທຶກສຳເລັດແລ້ວ!");
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

async function deleteApprover(id, name) {
  var confirmMsg = "ต้องการลบผู้อนุมัติ \"" + name + "\" ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้";
  // Convert to Lao: ຕ້ອງການລຶບຜູ້ອານຸມັດ "[name]" ແທ້ບໍ? ການດຳເນີນການນີ້ບໍ່ສາມາດຍົກເລີກໄດ້.
  var confirmMsgLao = "ຕ້ອງການລຶບຜູ້ອານຸມັດ \"" + name + "\" ແທ້ບໍ? ການດຳເນີນການນີ້ບໍ່ສາມາດຍົກເລີກໄດ້.";
  if (!confirm(confirmMsgLao)) return;

  showLoading();
  var res = await api("DELETE", "/approvers/" + id);
  hideLoading();

  if (res && res.success) {
    showToast("✅ ລຶບຜູ້ອານຸມັດສຳເລັດ!");
    loadApprovers();
  } else {
    showToast("❌ ຜິດພາດ: " + (res ? res.message : ""), true);
  }
}

// ============================================================
// FAB — QUICK ADD FLOATING BUTTON
// ============================================================
var FAB_OPEN = false;

function toggleFab() {
  FAB_OPEN = !FAB_OPEN;
  var btn = document.getElementById("fab-main-btn");
  var menu = document.getElementById("fab-menu");
  if (btn) btn.classList.toggle("open", FAB_OPEN);
  if (menu) menu.classList.toggle("open", FAB_OPEN);
}

function closeFab() {
  FAB_OPEN = false;
  var btn = document.getElementById("fab-main-btn");
  var menu = document.getElementById("fab-menu");
  if (btn) btn.classList.remove("open");
  if (menu) menu.classList.remove("open");
}

function _fabGetDept() {
  if (!CU || !DEPTS.length) return null;
  if (CU.role === "admin") return DEPTS[0];
  var cuDept = String(CU.department || "").trim();
  return DEPTS.find(function (d) { return String(d.name || "").trim() === cuDept; }) || DEPTS[0];
}

function fabAddIn() {
  closeFab();
  var dept = _fabGetDept();
  if (!dept) { showToast("⚠️ ບົ່ພົ່ນພະແນກ", true); return; }
  var k = deptKey(dept.name);
  ensureDocSection(k, "in");
  setActiveSection(document.getElementById("sec-" + k + "-in"), "ni-" + k + "-in");
  CURRENT_KEY = k;
  CURRENT_DIR = "in";
  loadDocsBySection(k, "in").then(function () {
    openForm(k, "in", dept.name);
  });
}

function fabAddOut() {
  closeFab();
  var dept = _fabGetDept();
  if (!dept) { showToast("⚠️ ບົ່ພົ່ນພະແນກ", true); return; }
  var k = deptKey(dept.name);
  ensureDocSection(k, "out");
  setActiveSection(document.getElementById("sec-" + k + "-out"), "ni-" + k + "-out");
  CURRENT_KEY = k;
  CURRENT_DIR = "out";
  loadDocsBySection(k, "out").then(function () {
    openForm(k, "out", dept.name);
  });
}

// Close FAB when clicking outside
document.addEventListener("click", function (e) {
  var fab = document.getElementById("fab-quick-add");
  if (FAB_OPEN && fab && !fab.contains(e.target)) {
    closeFab();
  }
});
