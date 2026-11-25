/**
 * Thin wrapper around localStorage for LeaveFlow.
 * All demo data is stored under versioned keys so it can be reset easily.
 */
(function () {
  "use strict";

  const KEYS = {
    employees: "leaveflow.v1.employees",
    requests: "leaveflow.v1.requests",
    prefs: "leaveflow.v1.prefs"
  };

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      console.warn("Could not read " + key + " from localStorage", err);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn("Could not write " + key + " to localStorage", err);
    }
  }

  const Store = {
    /** Seed sample data on first run (or when forced). */
    init: function (force) {
      if (force || !localStorage.getItem(KEYS.employees)) {
        write(KEYS.employees, window.LeaveData.EMPLOYEES);
      }
      if (force || !localStorage.getItem(KEYS.requests)) {
        write(KEYS.requests, window.LeaveData.buildSampleRequests());
      }
    },

    reset: function () {
      localStorage.removeItem(KEYS.employees);
      localStorage.removeItem(KEYS.requests);
      this.init(true);
    },

    getEmployees: function () { return read(KEYS.employees, []); },
    getRequests: function () { return read(KEYS.requests, []); },
    saveRequests: function (list) { write(KEYS.requests, list); },

    addRequest: function (req) {
      const list = this.getRequests();
      list.push(req);
      this.saveRequests(list);
      return req;
    },

    updateRequest: function (id, changes) {
      const list = this.getRequests();
      const idx = list.findIndex(function (r) { return r.id === id; });
      if (idx === -1) return null;
      list[idx] = Object.assign({}, list[idx], changes);
      this.saveRequests(list);
      return list[idx];
    },

    nextId: function () {
      const max = this.getRequests().reduce(function (m, r) {
        const n = parseInt(String(r.id).replace(/\D/g, ""), 10);
        return isNaN(n) ? m : Math.max(m, n);
      }, 1000);
      return "LR-" + (max + 1);
    },

    getPrefs: function () { return read(KEYS.prefs, {}); },
    setPref: function (k, v) {
      const p = this.getPrefs();
      p[k] = v;
      write(KEYS.prefs, p);
    }
  };

  window.Store = Store;
})();
