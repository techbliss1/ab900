/**
 * LeaveFlow – main application logic.
 * Handles the Employee view (request + history) and the Manager dashboard
 * (approve/reject, statistics, filters). Data persists via window.Store.
 */
(function () {
  "use strict";

  const TYPES = window.LeaveData.LEAVE_TYPES;
  const STATUSES = ["Pending", "Approved", "Rejected", "Cancelled"];

  const state = {
    view: "employee",
    employeeId: null,
    historyFilter: "all",
    statusFilter: "all",
    search: "",
    dept: "all",
    pendingDecision: null // { id, action }
  };

  /* ------------------------------------------------------------------ */
  /* Utilities                                                           */
  /* ------------------------------------------------------------------ */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function parseISO(s) {
    const parts = String(s).split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function todayISO() {
    return window.LeaveData.iso(new Date());
  }

  function fmtDate(s) {
    return parseISO(s).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  }

  function fmtRange(r) {
    return r.start === r.end ? fmtDate(r.start) : fmtDate(r.start) + " → " + fmtDate(r.end);
  }

  /** Number of working days (Mon–Fri) between two ISO dates, inclusive. */
  function workingDays(start, end, halfDay) {
    if (!start || !end) return 0;
    const s = parseISO(start);
    const e = parseISO(end);
    if (e < s) return 0;
    let count = 0;
    const d = new Date(s);
    while (d <= e) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) count++;
      d.setDate(d.getDate() + 1);
    }
    if (halfDay && start === end && count === 1) return 0.5;
    return count;
  }

  function daysOf(r) { return workingDays(r.start, r.end, r.halfDay); }
  function typeById(id) { return TYPES.find((t) => t.id === id) || { name: id, color: "#888", icon: "📄", allowance: 0 }; }
  function employeeById(id) { return window.Store.getEmployees().find((e) => e.id === id); }

  function initials(name) {
    return String(name).split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  }

  function avatarColor(id) {
    const palette = ["#4f46e5", "#0891b2", "#16a34a", "#d97706", "#db2777", "#7c3aed"];
    let h = 0;
    for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return palette[h % palette.length];
  }

  function badge(status) {
    return '<span class="badge badge-' + status.toLowerCase() + '">' + escapeHtml(status) + "</span>";
  }

  function fmtDays(n) {
    return (n % 1 === 0 ? n : n.toFixed(1)) + (n === 1 ? " day" : " days");
  }

  function toast(message, kind) {
    const el = document.createElement("div");
    el.className = "toast " + (kind || "info");
    el.textContent = message;
    $("#toastContainer").appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 300);
    }, 3200);
  }

  /** Balance for an employee and leave type within the current calendar year. */
  function balanceFor(employeeId, typeId, requests) {
    const year = new Date().getFullYear();
    const t = typeById(typeId);
    let used = 0;
    let pending = 0;
    (requests || window.Store.getRequests()).forEach((r) => {
      if (r.employeeId !== employeeId || r.type !== typeId) return;
      if (parseISO(r.start).getFullYear() !== year) return;
      if (r.status === "Approved") used += daysOf(r);
      if (r.status === "Pending") pending += daysOf(r);
    });
    return { allowance: t.allowance, used: used, pending: pending, remaining: t.allowance - used };
  }

  function overlaps(a, b) {
    return parseISO(a.start) <= parseISO(b.end) && parseISO(b.start) <= parseISO(a.end);
  }

  /* ------------------------------------------------------------------ */
  /* View switching & theme                                              */
  /* ------------------------------------------------------------------ */
  function setView(view) {
    state.view = view;
    window.Store.setPref("view", view);
    $$(".role-btn").forEach((b) => {
      const active = b.dataset.view === view;
      b.classList.toggle("active", active);
      b.setAttribute("aria-selected", active ? "true" : "false");
    });
    $("#employeeView").classList.toggle("active", view === "employee");
    $("#managerView").classList.toggle("active", view === "manager");
    render();
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    $("#themeToggle").textContent = theme === "dark" ? "☀️" : "🌙";
  }

  /* ------------------------------------------------------------------ */
  /* Employee view                                                       */
  /* ------------------------------------------------------------------ */
  function populateEmployeeSelect() {
    const sel = $("#employeeSelect");
    const employees = window.Store.getEmployees();
    sel.innerHTML = employees
      .map((e) => '<option value="' + e.id + '">' + escapeHtml(e.name) + " (" + escapeHtml(e.department) + ")</option>")
      .join("");
    if (!employees.some((e) => e.id === state.employeeId)) state.employeeId = employees.length ? employees[0].id : null;
    sel.value = state.employeeId;
  }

  function populateLeaveTypes() {
    $("#leaveType").innerHTML =
      '<option value="">Select leave type…</option>' +
      TYPES.map((t) => '<option value="' + t.id + '">' + t.icon + " " + escapeHtml(t.name) + "</option>").join("");
  }

  function renderEmployee() {
    const emp = employeeById(state.employeeId);
    if (!emp) return;
    const requests = window.Store.getRequests();

    $("#empName").textContent = emp.name.split(" ")[0];
    $("#empMeta").textContent = emp.role + " · " + emp.department + " · ID " + emp.id;
    const av = $("#empAvatar");
    av.textContent = initials(emp.name);
    av.style.background = avatarColor(emp.id);

    // Balance cards
    $("#balanceCards").innerHTML = TYPES.map((t) => {
      const b = balanceFor(emp.id, t.id, requests);
      const pct = Math.min(100, (b.used / b.allowance) * 100);
      return (
        '<div class="card balance" style="--accent:' + t.color + '">' +
        '<div class="card-top"><span class="card-icon">' + t.icon + "</span><span class=\"card-title\">" + escapeHtml(t.name) + "</span></div>" +
        '<div class="card-value">' + b.remaining + '<small> / ' + b.allowance + " left</small></div>" +
        '<div class="progress"><span style="width:' + pct + '%"></span></div>' +
        '<div class="card-foot">' + b.used + " used" + (b.pending ? " · " + b.pending + " pending" : "") + "</div>" +
        "</div>"
      );
    }).join("");

    // History
    const mine = requests
      .filter((r) => r.employeeId === emp.id)
      .filter((r) => state.historyFilter === "all" || r.status === state.historyFilter)
      .sort((a, b) => parseISO(b.start) - parseISO(a.start));

    const list = $("#historyList");
    if (!mine.length) {
      list.innerHTML = '<p class="empty">No leave requests to show.</p>';
      return;
    }
    list.innerHTML = mine.map((r) => {
      const t = typeById(r.type);
      return (
        '<article class="history-item" style="--accent:' + t.color + '">' +
        '<div class="hi-main">' +
        '<div class="hi-title">' + t.icon + " " + escapeHtml(t.name) + " " + badge(r.status) + "</div>" +
        '<div class="hi-dates">' + fmtRange(r) + " · " + fmtDays(daysOf(r)) + (r.halfDay ? " (half day)" : "") + "</div>" +
        '<div class="hi-reason">' + escapeHtml(r.reason) + "</div>" +
        (r.comment ? '<div class="hi-comment">💬 Manager: ' + escapeHtml(r.comment) + "</div>" : "") +
        '<div class="hi-meta">' + escapeHtml(r.id) + " · submitted " + new Date(r.createdAt).toLocaleDateString() + "</div>" +
        "</div>" +
        (r.status === "Pending" ? '<button class="btn btn-small btn-ghost" data-cancel="' + r.id + '">Cancel</button>' : "") +
        "</article>"
      );
    }).join("");
  }

  function updateDaySummary() {
    const start = $("#startDate").value;
    const end = $("#endDate").value;
    const half = $("#halfDay").checked;
    const typeId = $("#leaveType").value;
    const el = $("#daySummary");
    if (!start || !end) {
      el.textContent = "Select dates to see working days.";
      el.className = "form-summary";
      return;
    }
    const days = workingDays(start, end, half);
    let text = "📅 " + fmtDays(days) + " (weekends excluded)";
    if (typeId) {
      const b = balanceFor(state.employeeId, typeId);
      const available = b.remaining - b.pending;
      text += " · Available " + typeById(typeId).name + ": " + available;
      el.className = "form-summary" + (days > available ? " warn" : "");
    } else {
      el.className = "form-summary";
    }
    el.textContent = text;
  }

  function validateRequest(req) {
    if (!req.type) return "Please choose a leave type.";
    if (!req.start || !req.end) return "Please select both start and end dates.";
    if (parseISO(req.end) < parseISO(req.start)) return "End date cannot be before the start date.";
    if (req.start < todayISO()) return "Start date cannot be in the past.";
    if (req.halfDay && req.start !== req.end) return "Half-day leave must start and end on the same date.";
    if (req.reason.length < 5) return "Please provide a reason (at least 5 characters).";
    const days = daysOf(req);
    if (days <= 0) return "The selected range contains no working days.";
    const b = balanceFor(req.employeeId, req.type);
    const available = b.remaining - b.pending;
    if (days > available) {
      return "Insufficient " + typeById(req.type).name + " balance: requesting " + days + ", available " + available + " (incl. pending).";
    }
    const clash = window.Store.getRequests().find(
      (r) => r.employeeId === req.employeeId && (r.status === "Pending" || r.status === "Approved") && overlaps(r, req)
    );
    if (clash) return "These dates overlap with request " + clash.id + " (" + clash.status.toLowerCase() + ").";
    return null;
  }

  function onSubmitLeave(ev) {
    ev.preventDefault();
    const req = {
      id: window.Store.nextId(),
      employeeId: state.employeeId,
      type: $("#leaveType").value,
      start: $("#startDate").value,
      end: $("#endDate").value,
      halfDay: $("#halfDay").checked,
      reason: $("#reason").value.trim(),
      status: "Pending",
      comment: "",
      createdAt: new Date().toISOString()
    };
    const error = validateRequest(req);
    $("#formError").textContent = error || "";
    if (error) return;

    window.Store.addRequest(req);
    ev.target.reset();
    updateDaySummary();
    toast("Leave request " + req.id + " submitted for approval.", "success");
    render();
  }

  function onCancelRequest(id) {
    if (!confirm("Cancel leave request " + id + "?")) return;
    window.Store.updateRequest(id, { status: "Cancelled", decidedAt: new Date().toISOString() });
    toast("Request " + id + " cancelled.", "info");
    render();
  }

  /* ------------------------------------------------------------------ */
  /* Manager view                                                        */
  /* ------------------------------------------------------------------ */
  function populateDeptFilter() {
    const depts = Array.from(new Set(window.Store.getEmployees().map((e) => e.department))).sort();
    $("#deptFilter").innerHTML =
      '<option value="all">All departments</option>' +
      depts.map((d) => '<option value="' + escapeHtml(d) + '">' + escapeHtml(d) + "</option>").join("");
    $("#deptFilter").value = state.dept;
  }

  function renderManager() {
    const requests = window.Store.getRequests();
    const employees = window.Store.getEmployees();
    const empMap = Object.fromEntries(employees.map((e) => [e.id, e]));

    // Statistics
    const counts = { total: requests.length };
    STATUSES.forEach((s) => (counts[s] = requests.filter((r) => r.status === s).length));
    const decided = counts.Approved + counts.Rejected;
    const approvalRate = decided ? Math.round((counts.Approved / decided) * 100) : 0;
    const approvedDays = requests.filter((r) => r.status === "Approved").reduce((s, r) => s + daysOf(r), 0);

    const stat = (label, value, cls, icon) =>
      '<div class="card stat ' + cls + '"><div class="stat-icon">' + icon + '</div><div><div class="stat-value">' + value +
      '</div><div class="stat-label">' + label + "</div></div></div>";

    $("#statCards").innerHTML =
      stat("Total requests", counts.total, "s-total", "📄") +
      stat("Pending", counts.Pending, "s-pending", "⏳") +
      stat("Approved", counts.Approved, "s-approved", "✅") +
      stat("Rejected", counts.Rejected, "s-rejected", "❌") +
      stat("Approval rate", approvalRate + "%", "s-rate", "📈") +
      stat("Approved days", approvedDays, "s-days", "🗓️");

    // Update chip counts
    $$("#statusFilter .chip").forEach((chip) => {
      const s = chip.dataset.status;
      const n = s === "all" ? counts.total : counts[s];
      chip.innerHTML = (s === "all" ? "All" : s) + ' <span class="chip-count">' + n + "</span>";
      chip.classList.toggle("active", s === state.statusFilter);
    });

    // Filtered table
    const q = state.search.toLowerCase();
    const rows = requests
      .filter((r) => state.statusFilter === "all" || r.status === state.statusFilter)
      .filter((r) => state.dept === "all" || (empMap[r.employeeId] && empMap[r.employeeId].department === state.dept))
      .filter((r) => {
        if (!q) return true;
        const e = empMap[r.employeeId] || {};
        return [e.name, e.department, typeById(r.type).name, r.reason, r.id, r.status].join(" ").toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (a.status === "Pending" && b.status !== "Pending") return -1;
        if (b.status === "Pending" && a.status !== "Pending") return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

    $("#tableEmpty").hidden = rows.length > 0;
    $("#requestTable").innerHTML = rows.map((r) => {
      const e = empMap[r.employeeId] || { name: "Unknown", department: "" };
      const t = typeById(r.type);
      const actions =
        r.status === "Pending"
          ? '<button class="btn btn-small btn-approve" data-approve="' + r.id + '">Approve</button>' +
            '<button class="btn btn-small btn-reject" data-reject="' + r.id + '">Reject</button>'
          : '<span class="muted small">' + (r.comment ? "💬 " + escapeHtml(r.comment) : "—") + "</span>";
      return (
        "<tr>" +
        '<td><div class="emp-cell"><span class="avatar" style="background:' + avatarColor(e.id || r.employeeId) + '">' + initials(e.name) +
        "</span><div><strong>" + escapeHtml(e.name) + '</strong><div class="muted small">' + escapeHtml(e.department) + "</div></div></div></td>" +
        '<td><span class="type-pill" style="--accent:' + t.color + '">' + t.icon + " " + escapeHtml(t.name) + "</span></td>" +
        '<td class="nowrap">' + fmtRange(r) + "</td>" +
        "<td>" + daysOf(r) + (r.halfDay ? " ½" : "") + "</td>" +
        '<td class="reason-cell" title="' + escapeHtml(r.reason) + '">' + escapeHtml(r.reason) + "</td>" +
        "<td>" + badge(r.status) + "</td>" +
        '<td class="actions">' + actions + "</td>" +
        "</tr>"
      );
    }).join("");

    // Chart: approved days per type
    const perType = TYPES.map((t) => ({
      t: t,
      days: requests.filter((r) => r.status === "Approved" && r.type === t.id).reduce((s, r) => s + daysOf(r), 0)
    }));
    const max = Math.max(1, ...perType.map((p) => p.days));
    $("#typeChart").innerHTML = perType.map((p) =>
      '<div class="bar-row"><span class="bar-label">' + p.t.icon + " " + escapeHtml(p.t.name) + "</span>" +
      '<div class="bar-track"><div class="bar-fill" style="width:' + (p.days / max) * 100 + "%;background:" + p.t.color + '"></div></div>' +
      '<span class="bar-value">' + p.days + "</span></div>"
    ).join("");

    // On leave today
    const today = todayISO();
    const onLeave = requests.filter((r) => r.status === "Approved" && r.start <= today && r.end >= today);
    $("#onLeaveToday").innerHTML = onLeave.length
      ? onLeave.map((r) => {
          const e = empMap[r.employeeId] || { name: "Unknown" };
          return "<li><strong>" + escapeHtml(e.name) + "</strong> · " + escapeHtml(typeById(r.type).name) + ' <span class="muted small">until ' + fmtDate(r.end) + "</span></li>";
        }).join("")
      : '<li class="muted">Everyone is available today 🎉</li>';

    // Upcoming approved
    const upcoming = requests
      .filter((r) => r.status === "Approved" && r.start > today)
      .sort((a, b) => parseISO(a.start) - parseISO(b.start))
      .slice(0, 5);
    $("#upcomingList").innerHTML = upcoming.length
      ? upcoming.map((r) => {
          const e = empMap[r.employeeId] || { name: "Unknown" };
          return "<li><strong>" + escapeHtml(e.name) + "</strong> · " + fmtRange(r) + ' <span class="muted small">(' + fmtDays(daysOf(r)) + ")</span></li>";
        }).join("")
      : '<li class="muted">No upcoming approved leave.</li>';
  }

  /* ------------------------------------------------------------------ */
  /* Approve / reject modal                                              */
  /* ------------------------------------------------------------------ */
  function openDecision(id, action) {
    const r = window.Store.getRequests().find((x) => x.id === id);
    if (!r) return;
    const e = employeeById(r.employeeId) || { name: "Unknown" };
    const t = typeById(r.type);
    state.pendingDecision = { id: id, action: action };

    let body = escapeHtml(e.name) + " · " + escapeHtml(t.name) + " · " + fmtRange(r) + " (" + fmtDays(daysOf(r)) + ")";
    if (action === "Approved") {
      const b = balanceFor(r.employeeId, r.type);
      body += "<br/>Remaining balance after approval: <strong>" + (b.remaining - daysOf(r)) + "</strong> of " + b.allowance;
      if (b.remaining - daysOf(r) < 0) body += ' <span class="warn-text">⚠ exceeds allowance</span>';
    }
    $("#modalTitle").textContent = (action === "Approved" ? "Approve" : "Reject") + " request " + id + "?";
    $("#modalBody").innerHTML = body;
    $("#modalComment").value = "";
    const confirmBtn = $("#modalConfirm");
    confirmBtn.textContent = action === "Approved" ? "Approve" : "Reject";
    confirmBtn.className = "btn " + (action === "Approved" ? "btn-approve" : "btn-reject");
    $("#modal").hidden = false;
    $("#modalComment").focus();
  }

  function closeModal() {
    $("#modal").hidden = true;
    state.pendingDecision = null;
  }

  function confirmDecision() {
    const d = state.pendingDecision;
    if (!d) return;
    window.Store.updateRequest(d.id, {
      status: d.action,
      comment: $("#modalComment").value.trim(),
      decidedAt: new Date().toISOString()
    });
    toast("Request " + d.id + " " + d.action.toLowerCase() + ".", d.action === "Approved" ? "success" : "error");
    closeModal();
    render();
  }

  /* ------------------------------------------------------------------ */
  /* Render & events                                                     */
  /* ------------------------------------------------------------------ */
  function render() {
    if (state.view === "employee") renderEmployee();
    else renderManager();
  }

  function bindEvents() {
    $$(".role-btn").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));

    $("#themeToggle").addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      window.Store.setPref("theme", next);
      applyTheme(next);
    });

    $("#resetData").addEventListener("click", () => {
      if (!confirm("Reset all demo data to the original sample employees and requests?")) return;
      window.Store.reset();
      populateEmployeeSelect();
      populateDeptFilter();
      toast("Demo data restored.", "info");
      render();
    });

    $("#employeeSelect").addEventListener("change", (e) => {
      state.employeeId = e.target.value;
      window.Store.setPref("employeeId", state.employeeId);
      $("#formError").textContent = "";
      updateDaySummary();
      render();
    });

    $("#historyFilter").addEventListener("change", (e) => {
      state.historyFilter = e.target.value;
      renderEmployee();
    });

    $("#leaveForm").addEventListener("submit", onSubmitLeave);
    ["#startDate", "#endDate", "#halfDay", "#leaveType"].forEach((sel) =>
      $(sel).addEventListener("change", () => {
        if (sel === "#startDate") {
          const s = $("#startDate").value;
          $("#endDate").min = s || todayISO();
          if (s && (!$("#endDate").value || $("#endDate").value < s)) $("#endDate").value = s;
        }
        $("#formError").textContent = "";
        updateDaySummary();
      })
    );

    $("#historyList").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-cancel]");
      if (btn) onCancelRequest(btn.dataset.cancel);
    });

    $("#statusFilter").addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      state.statusFilter = chip.dataset.status;
      renderManager();
    });

    $("#searchInput").addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      renderManager();
    });

    $("#deptFilter").addEventListener("change", (e) => {
      state.dept = e.target.value;
      renderManager();
    });

    $("#requestTable").addEventListener("click", (e) => {
      const a = e.target.closest("[data-approve]");
      const r = e.target.closest("[data-reject]");
      if (a) openDecision(a.dataset.approve, "Approved");
      if (r) openDecision(r.dataset.reject, "Rejected");
    });

    $("#modalCancel").addEventListener("click", closeModal);
    $("#modalConfirm").addEventListener("click", confirmDecision);
    $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#modal").hidden) closeModal(); });

    // Keep multiple tabs in sync
    window.addEventListener("storage", () => render());
  }

  function init() {
    window.Store.init(false);
    const prefs = window.Store.getPrefs();
    applyTheme(prefs.theme || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
    state.employeeId = prefs.employeeId || null;

    populateEmployeeSelect();
    populateLeaveTypes();
    populateDeptFilter();
    $("#startDate").min = todayISO();
    $("#endDate").min = todayISO();

    bindEvents();
    setView(prefs.view === "manager" ? "manager" : "employee");
  }

  document.addEventListener("DOMContentLoaded", init);

  // Exposed for testing/debugging in the console.
  window.LeaveFlow = { workingDays: workingDays, balanceFor: balanceFor, validateRequest: validateRequest };
})();
