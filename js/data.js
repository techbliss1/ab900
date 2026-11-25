/**
 * Sample (seed) data for the LeaveFlow demo.
 * Dates are generated relative to "today" so the demo always looks current.
 */
(function () {
  "use strict";

  // Leave types with yearly allowance (in working days).
  const LEAVE_TYPES = [
    { id: "annual",   name: "Annual Leave",  allowance: 20, color: "#4f46e5", icon: "🏖️" },
    { id: "sick",     name: "Sick Leave",    allowance: 10, color: "#e11d48", icon: "🤒" },
    { id: "casual",   name: "Casual Leave",  allowance: 7,  color: "#0891b2", icon: "☕" },
    { id: "parental", name: "Parental Leave", allowance: 15, color: "#d97706", icon: "👶" },
    { id: "unpaid",   name: "Unpaid Leave",  allowance: 30, color: "#64748b", icon: "💼" }
  ];

  const EMPLOYEES = [
    { id: "E001", name: "Aarav Sharma",   role: "Software Engineer",   department: "Engineering" },
    { id: "E002", name: "Priya Nair",     role: "UX Designer",         department: "Design" },
    { id: "E003", name: "Daniel Brooks",  role: "QA Analyst",          department: "Engineering" },
    { id: "E004", name: "Mei Chen",       role: "Marketing Specialist", department: "Marketing" },
    { id: "E005", name: "Fatima Khan",    role: "HR Generalist",       department: "Human Resources" },
    { id: "E006", name: "Lucas Oliveira", role: "Sales Executive",     department: "Sales" }
  ];

  function iso(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  // Returns an ISO date offset from today by n days, shifted forward to a weekday.
  function offset(n) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + n);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return iso(d);
  }

  function buildSampleRequests() {
    const created = (n) => new Date(Date.now() + n * 86400000).toISOString();
    return [
      { id: "LR-1001", employeeId: "E001", type: "annual",   start: offset(-40), end: offset(-36), halfDay: false, reason: "Family vacation to Goa",            status: "Approved",  comment: "Enjoy your trip!",            createdAt: created(-55), decidedAt: created(-53) },
      { id: "LR-1002", employeeId: "E001", type: "sick",     start: offset(-12), end: offset(-12), halfDay: false, reason: "Fever and doctor visit",            status: "Approved",  comment: "Get well soon.",              createdAt: created(-12), decidedAt: created(-11) },
      { id: "LR-1003", employeeId: "E001", type: "casual",   start: offset(9),   end: offset(9),   halfDay: true,  reason: "Bank appointment in the morning",   status: "Pending",   comment: "",                            createdAt: created(-1) },
      { id: "LR-1004", employeeId: "E002", type: "annual",   start: offset(14),  end: offset(20),  halfDay: false, reason: "Attending sister's wedding",        status: "Pending",   comment: "",                            createdAt: created(-2) },
      { id: "LR-1005", employeeId: "E002", type: "casual",   start: offset(-20), end: offset(-20), halfDay: false, reason: "Personal errand",                   status: "Rejected",  comment: "Design review scheduled that day.", createdAt: created(-25), decidedAt: created(-24) },
      { id: "LR-1006", employeeId: "E003", type: "sick",     start: offset(0),   end: offset(1),   halfDay: false, reason: "Recovering from flu",               status: "Approved",  comment: "Take care.",                  createdAt: created(-1), decidedAt: created(-1) },
      { id: "LR-1007", employeeId: "E003", type: "annual",   start: offset(30),  end: offset(34),  halfDay: false, reason: "Year-end holiday trip",             status: "Pending",   comment: "",                            createdAt: created(-3) },
      { id: "LR-1008", employeeId: "E004", type: "parental", start: offset(5),   end: offset(18),  halfDay: false, reason: "Paternity/parental care",           status: "Approved",  comment: "Congratulations!",            createdAt: created(-30), decidedAt: created(-28) },
      { id: "LR-1009", employeeId: "E004", type: "casual",   start: offset(-8),  end: offset(-8),  halfDay: false, reason: "Moving to a new apartment",         status: "Approved",  comment: "",                            createdAt: created(-15), decidedAt: created(-14) },
      { id: "LR-1010", employeeId: "E005", type: "unpaid",   start: offset(40),  end: offset(49),  halfDay: false, reason: "Extended travel abroad",            status: "Pending",   comment: "",                            createdAt: created(-4) },
      { id: "LR-1011", employeeId: "E005", type: "annual",   start: offset(-60), end: offset(-56), halfDay: false, reason: "Short break",                       status: "Cancelled", comment: "",                            createdAt: created(-70) },
      { id: "LR-1012", employeeId: "E006", type: "annual",   start: offset(3),   end: offset(4),   halfDay: false, reason: "Long weekend with family",          status: "Rejected",  comment: "Quarter-end sales push, please reschedule.", createdAt: created(-6), decidedAt: created(-5) },
      { id: "LR-1013", employeeId: "E006", type: "sick",     start: offset(-3),  end: offset(-3),  halfDay: true,  reason: "Dental procedure",                  status: "Approved",  comment: "",                            createdAt: created(-4), decidedAt: created(-4) },
      { id: "LR-1014", employeeId: "E006", type: "casual",   start: offset(12),  end: offset(12),  halfDay: false, reason: "Child's school event",              status: "Pending",   comment: "",                            createdAt: created(0) }
    ];
  }

  window.LeaveData = {
    LEAVE_TYPES: LEAVE_TYPES,
    EMPLOYEES: EMPLOYEES,
    buildSampleRequests: buildSampleRequests,
    iso: iso
  };
})();
