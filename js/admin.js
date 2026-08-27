(function () {
  const session = requireRole("admin");
  if (!session) return;

  document.getElementById("whoami").textContent = `${session.name} · admin`;
  document.getElementById("logoutLink").addEventListener("click", (e) => {
    e.preventDefault();
    clearSession();
    window.location.href = "index.html";
  });

  const STATUS_LABEL = {
    pending: "Pending",
    "in-review": "In review",
    resolved: "Resolved"
  };
  const STATUS_CLASS = {
    pending: "badge-pending",
    "in-review": "badge-review",
    resolved: "badge-resolved"
  };

  const statusFilter = document.getElementById("f_status");
  const categoryFilter = document.getElementById("f_category");
  const searchBox = document.getElementById("f_search");

  function fmtDate(ts) {
    return new Date(ts).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  }

  const ICONS = {
    total:
      '<svg viewBox="0 0 24 24" fill="none" stroke="#1B2430" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6a2 2 0 0 1 2-2h8l6 6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><path d="M14 4v6h6"/></svg>',
    pending:
      '<svg viewBox="0 0 24 24" fill="none" stroke="#C98A2D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
    review:
      '<svg viewBox="0 0 24 24" fill="none" stroke="#3D5A80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12c2-4 6-6 9-6s7 2 9 6c-2 4-6 6-9 6s-7-2-9-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>',
    resolved:
      '<svg viewBox="0 0 24 24" fill="none" stroke="#2E8B7A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>'
  };

  function renderStats(all) {
    const counts = { pending: 0, "in-review": 0, resolved: 0 };
    all.forEach((t) => counts[t.status]++);
    const stats = [
      { num: all.length, lbl: "Total submissions", icon: ICONS.total },
      { num: counts.pending, lbl: "Pending", icon: ICONS.pending },
      { num: counts["in-review"], lbl: "In review", icon: ICONS.review },
      { num: counts.resolved, lbl: "Resolved", icon: ICONS.resolved }
    ];
    document.getElementById("statRow").innerHTML = stats
      .map(
        (s) => `<div class="stat-card">
          <div class="icon">${s.icon}</div>
          <div class="text"><div class="num">${s.num}</div><div class="lbl">${s.lbl}</div></div>
        </div>`
      )
      .join("");
  }

  function applyFilters(all) {
    const status = statusFilter.value;
    const category = categoryFilter.value;
    const q = searchBox.value.trim().toLowerCase();

    return all.filter((t) => {
      if (status !== "all" && t.status !== status) return false;
      if (category !== "all" && t.category !== category) return false;
      if (q) {
        const hay = `${t.id} ${t.subject} ${t.studentName} ${t.regNo}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function render() {
    const all = getTickets().sort((a, b) => b.createdAt - a.createdAt);
    renderStats(all);
    const filtered = applyFilters(all);
    const grid = document.getElementById("ticketGrid");

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
        <h3>No submissions match these filters</h3>
        <p>Try clearing the search or choosing a different status.</p>
      </div>`;
      return;
    }

    grid.innerHTML = filtered
      .map((t) => {
        const statusOptions = Object.keys(STATUS_LABEL)
          .map((k) => `<option value="${k}" ${k === t.status ? "selected" : ""}>${STATUS_LABEL[k]}</option>`)
          .join("");
        return `
        <article class="ticket">
          <div class="ticket-top">
            <div class="ticket-id-row">
              <span class="ticket-id">#${sanitize(t.id)}</span>
              <span class="badge ${STATUS_CLASS[t.status]}">${STATUS_LABEL[t.status]}</span>
            </div>
            <div class="ticket-cat-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.6 3.5H6a1.5 1.5 0 0 0-1.5 1.5v6.6c0 .4.16.78.44 1.06l8.9 8.9c.58.58 1.53.58 2.12 0l6.6-6.6c.58-.58.58-1.53 0-2.12l-8.9-8.9a1.5 1.5 0 0 0-1.06-.44Z"/><circle cx="8.5" cy="8.5" r="1.2"/></svg>
              <span class="ticket-cat">${sanitize(t.category)}</span>
            </div>
            <h3>${sanitize(t.subject)}</h3>
            <p class="desc">${sanitize(t.description)}</p>
            <div class="meta">${sanitize(t.studentName)} · #${sanitize(t.regNo)} · ${fmtDate(t.createdAt)}</div>
          </div>
          <div class="ticket-perf"></div>
          <div class="ticket-bottom">
            <div class="field" style="margin-bottom:8px;">
              <label style="font-size:.7rem;">Response</label>
              <textarea class="respBox" data-id="${sanitize(t.id)}" placeholder="Write a response…" style="min-height:64px;">${sanitize(t.response)}</textarea>
            </div>
            <div class="ticket-actions">
              <select class="statusSelect" data-id="${sanitize(t.id)}">${statusOptions}</select>
              <button class="btn btn-ghost btn-small saveBtn" data-id="${sanitize(t.id)}">Save</button>
            </div>
          </div>
        </article>`;
      })
      .join("");

    grid.querySelectorAll(".saveBtn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const status = grid.querySelector(`.statusSelect[data-id="${CSS.escape(id)}"]`).value;
        const response = grid.querySelector(`.respBox[data-id="${CSS.escape(id)}"]`).value.trim();

        const tickets = getTickets();
        const idx = tickets.findIndex((t) => t.id === id);
        if (idx === -1) return;
        tickets[idx].status = status;
        tickets[idx].response = sanitize(response);
        tickets[idx].updatedAt = Date.now();
        saveTickets(tickets);

        btn.textContent = "Saved ✓";
        setTimeout(render, 500);
      });
    });
  }

  [statusFilter, categoryFilter].forEach((el) => el.addEventListener("change", render));
  searchBox.addEventListener("input", render);

  render();
})();
