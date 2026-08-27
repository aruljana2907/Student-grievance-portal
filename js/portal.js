(function () {
  const session = requireRole("student");
  if (!session) return;

  document.getElementById("whoami").textContent = `${session.name} · ${session.regNo}`;
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

  function fmtDate(ts) {
    return new Date(ts).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  }

  function render() {
    const grid = document.getElementById("ticketGrid");
    const tickets = ticketsForStudent(session.regNo);

    if (tickets.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
        <h3>No submissions yet</h3>
        <p>Anything you submit above will show up here as a tracked ticket.</p>
      </div>`;
      return;
    }

    grid.innerHTML = tickets
      .map((t) => {
        const respBlock = t.response
          ? `<div class="ticket-response"><span class="lbl">Admin response</span>${sanitize(t.response)}</div>`
          : `<div class="ticket-empty">Awaiting response from admin.</div>`;
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
            <div class="meta">Submitted ${fmtDate(t.createdAt)}</div>
          </div>
          <div class="ticket-perf"></div>
          <div class="ticket-bottom">${respBlock}</div>
        </article>`;
      })
      .join("");
  }

  document.getElementById("ticketForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const type = document.getElementById("t_type").value;
    const category = document.getElementById("t_category").value;
    const subject = document.getElementById("t_subject").value.trim();
    const description = document.getElementById("t_description").value.trim();
    if (!subject || !description) return;

    const tickets = getTickets();
    const now = Date.now();
    tickets.push({
      id: genId(type === "Grievance" ? "GRV" : "FBK"),
      regNo: session.regNo,
      studentName: session.name,
      category,
      subject: sanitize(subject),
      description: sanitize(description),
      status: "pending",
      response: "",
      createdAt: now,
      updatedAt: now
    });
    saveTickets(tickets);

    e.target.reset();
    const successBox = document.getElementById("submitSuccess");
    successBox.classList.add("show");
    setTimeout(() => successBox.classList.remove("show"), 2500);
    render();
  });

  render();
})();
