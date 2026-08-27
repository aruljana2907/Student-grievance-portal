/* ===================================================================
   Secure Student Grievance & Feedback Portal — data layer
   -------------------------------------------------------------------
   GitHub Pages only serves static files, so this demo replaces the
   original PHP + MySQL backend with an in-browser store (localStorage)
   that mirrors the same shape: users, sessions, tickets. Passwords are
   still hashed (SHA-256 via SubtleCrypto) and never stored in plain
   text, and every field is HTML-escaped before it is rendered, so the
   same defensive habits from the internship project carry through —
   this is a client-only prototype for demonstration, not a production
   auth system.
   =================================================================== */

const DB = {
  USERS: "sgfp_users",
  TICKETS: "sgfp_tickets",
  SESSION: "sgfp_session",
  SEEDED: "sgfp_seeded_v1"
};

/* ---------- low-level storage helpers ---------- */
function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}
function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* ---------- security helpers ---------- */
async function hashPassword(password) {
  const enc = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function sanitize(str) {
  const div = document.createElement("div");
  div.textContent = String(str ?? "");
  return div.innerHTML;
}

function genId(prefix) {
  const n = Math.floor(1000 + Math.random() * 9000);
  const y = new Date().getFullYear();
  return `${prefix}-${y}-${n}`;
}

/* ---------- seed data (first load only) ---------- */
async function seedIfNeeded() {
  if (localStorage.getItem(DB.SEEDED)) return;

  const users = [
    {
      role: "admin",
      username: "admin",
      name: "Shagul S",
      title: "Founder & CEO, Layercodes Technologies",
      passwordHash: await hashPassword("Admin@123")
    },
    {
      role: "student",
      regNo: "110725105034",
      name: "Janani A",
      department: "CSE (Cyber Security)",
      passwordHash: await hashPassword("Student@123")
    }
  ];
  writeJSON(DB.USERS, users);

  const now = Date.now();
  const day = 86400000;
  const tickets = [
    {
      id: genId("GRV"),
      regNo: "110725105034",
      studentName: "Janani A",
      category: "Facilities",
      subject: "Lab systems running outdated software",
      description:
        "Several systems in the CSE cyber security lab are still on an unsupported OS version, which blocks installing current security tools for practicals.",
      status: "in-review",
      response: "Forwarded to the IT infrastructure team for a scheduled upgrade window.",
      createdAt: now - 6 * day,
      updatedAt: now - 2 * day
    },
    {
      id: genId("FBK"),
      regNo: "110725105034",
      studentName: "Janani A",
      category: "Academic",
      subject: "Request for an extra secure-coding workshop",
      description:
        "It would help to have a follow-up session on preventing SQL injection and XSS, since it came up often during the internship project work.",
      status: "resolved",
      response: "Added to next semester's workshop calendar — thank you for the suggestion.",
      createdAt: now - 12 * day,
      updatedAt: now - 9 * day
    },
    {
      id: genId("GRV"),
      regNo: "110725105034",
      studentName: "Janani A",
      category: "Administrative",
      subject: "Delay in internship completion certificate",
      description:
        "It has been over two weeks since the internship ended and the completion certificate has not yet been issued.",
      status: "pending",
      response: "",
      createdAt: now - day,
      updatedAt: now - day
    }
  ];
  writeJSON(DB.TICKETS, tickets);
  localStorage.setItem(DB.SEEDED, "1");
}

/* ---------- users ---------- */
function getUsers() {
  return readJSON(DB.USERS, []);
}
function saveUsers(users) {
  writeJSON(DB.USERS, users);
}
function findStudent(regNo) {
  return getUsers().find((u) => u.role === "student" && u.regNo === regNo);
}
function findAdmin(username) {
  return getUsers().find((u) => u.role === "admin" && u.username === username);
}

/* ---------- tickets ---------- */
function getTickets() {
  return readJSON(DB.TICKETS, []);
}
function saveTickets(tickets) {
  writeJSON(DB.TICKETS, tickets);
}
function ticketsForStudent(regNo) {
  return getTickets()
    .filter((t) => t.regNo === regNo)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/* ---------- session ---------- */
function setSession(session) {
  sessionStorage.setItem(DB.SESSION, JSON.stringify(session));
}
function getSession() {
  try {
    const raw = sessionStorage.getItem(DB.SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}
function clearSession() {
  sessionStorage.removeItem(DB.SESSION);
}

/* ---------- route guards ---------- */
function requireRole(role, loginPage = "index.html") {
  const s = getSession();
  if (!s || s.role !== role) {
    window.location.href = loginPage;
    return null;
  }
  return s;
}
