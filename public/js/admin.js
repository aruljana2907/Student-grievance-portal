/**
 * Administrator Portal Logic
 * 
 * Handles administrative dashboards, Chart.js visualizations,
 * ticket triage, responses, CSV exports, and audit logs.
 * 
 * SECURITY: Strict zero-innerHTML with user data to protect against XSS.
 */

let adminUser = null;
let charts = {};

document.addEventListener('DOMContentLoaded', async () => {
  adminUser = await checkAuth('admin');
  if (!adminUser) return;

  if (document.getElementById('admin-stats-container')) {
    initAdminDashboard();
  }
  if (document.getElementById('admin-tickets-table')) {
    initAdminTicketsTable();
  }
  if (document.getElementById('admin-audit-table')) {
    initAdminAuditLogs();
  }
});

/**
 * Admin Dashboard & Charts
 */
async function initAdminDashboard() {
  try {
    const res = await api.get('/api/admin/stats');
    if (!res.ok) return;

    const data = await res.json();
    const summary = data.summary || {};

    setText('stat-total', summary.total_tickets || 0);
    setText('stat-pending', summary.pending_count || 0);
    setText('stat-review', summary.in_review_count || 0);
    setText('stat-resolved', summary.resolved_count || 0);
    setText('stat-grievance', summary.grievance_count || 0);
    setText('stat-feedback', summary.feedback_count || 0);

    renderCharts(data);
  } catch (err) {
    showToast('Failed to load administrative analytics', 'error');
  }
}

function renderCharts(data) {
  if (typeof Chart === 'undefined') return;

  // Chart theme colors
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#cbd5e1' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  // 1. Status Doughnut Chart
  const statusCtx = document.getElementById('chart-status');
  if (statusCtx) {
    if (charts.status) charts.status.destroy();
    const statusMap = { pending: 0, in_review: 0, resolved: 0 };
    (data.byStatus || []).forEach((item) => {
      statusMap[item.status] = item.count;
    });

    charts.status = new Chart(statusCtx, {
      type: 'doughnut',
      data: {
        labels: ['Pending', 'In Review', 'Resolved'],
        datasets: [
          {
            data: [statusMap.pending, statusMap.in_review, statusMap.resolved],
            backgroundColor: ['#f59e0b', '#6366f1', '#0d9488'],
            borderWidth: 2,
            borderColor: isDark ? '#131d31' : '#ffffff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: textColor, font: { family: 'system-ui' } },
          },
        },
      },
    });
  }

  // 2. Category Bar Chart
  const catCtx = document.getElementById('chart-category');
  if (catCtx) {
    if (charts.category) charts.category.destroy();
    const categories = data.byCategory || [];

    charts.category = new Chart(catCtx, {
      type: 'bar',
      data: {
        labels: categories.map((c) => c.category.toUpperCase()),
        datasets: [
          {
            label: 'Tickets',
            data: categories.map((c) => c.count),
            backgroundColor: '#2563eb',
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            ticks: { color: textColor },
            grid: { color: gridColor },
          },
          y: {
            beginAtZero: true,
            ticks: { color: textColor, stepSize: 1 },
            grid: { color: gridColor },
          },
        },
      },
    });
  }

  // 3. Monthly Trend Line Chart
  const monthCtx = document.getElementById('chart-monthly');
  if (monthCtx) {
    if (charts.monthly) charts.monthly.destroy();
    const monthly = data.byMonth || [];

    charts.monthly = new Chart(monthCtx, {
      type: 'line',
      data: {
        labels: monthly.map((m) => m.month),
        datasets: [
          {
            label: 'Submissions',
            data: monthly.map((m) => m.count),
            borderColor: '#0d9488',
            backgroundColor: 'rgba(13, 148, 136, 0.1)',
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#0d9488',
            pointRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            ticks: { color: textColor },
            grid: { color: gridColor },
          },
          y: {
            beginAtZero: true,
            ticks: { color: textColor, stepSize: 1 },
            grid: { color: gridColor },
          },
        },
      },
    });
  }
}

/**
 * Admin Ticket Table with Filters, Sorting, and Server-Side Pagination
 */
let currentAdminPage = 1;

async function initAdminTicketsTable() {
  const tableBody = document.getElementById('admin-tickets-table-body');
  const searchInput = document.getElementById('admin-search');
  const statusFilter = document.getElementById('admin-status-filter');
  const catFilter = document.getElementById('admin-category-filter');
  const typeFilter = document.getElementById('admin-type-filter');
  const priorityFilter = document.getElementById('admin-priority-filter');
  const sortSelect = document.getElementById('admin-sort-select');

  async function loadAdminTickets(page = 1) {
    currentAdminPage = page;
    const params = new URLSearchParams({
      page,
      limit: 10,
      search: searchInput ? searchInput.value.trim() : '',
      status: statusFilter ? statusFilter.value : 'all',
      category: catFilter ? catFilter.value : 'all',
      type: typeFilter ? typeFilter.value : 'all',
      priority: priorityFilter ? priorityFilter.value : 'all',
      sortBy: sortSelect ? sortSelect.value.split(':')[0] : 'created_at',
      sortOrder: sortSelect ? sortSelect.value.split(':')[1] : 'DESC',
    });

    try {
      const res = await api.get(`/api/admin/tickets?${params.toString()}`);
      if (!res.ok) return;

      const data = await res.json();
      renderTicketsTable(data.tickets || []);
      renderPagination(data.pagination);
    } catch (err) {
      showToast('Error loading tickets', 'error');
    }
  }

  function renderTicketsTable(tickets) {
    tableBody.innerHTML = '';
    if (tickets.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="8" class="text-center p-4 text-muted">No tickets match the search criteria.</td>`;
      tableBody.appendChild(row);
      return;
    }

    tickets.forEach((t) => {
      const tr = document.createElement('tr');

      // 1. Code
      const tdCode = document.createElement('td');
      const codeSpan = document.createElement('span');
      codeSpan.className = 'ticket-code';
      codeSpan.textContent = t.ticket_code;
      tdCode.appendChild(codeSpan);

      // 2. Student Info
      const tdStudent = document.createElement('td');
      const nameDiv = document.createElement('div');
      nameDiv.className = 'font-weight-bold text-main';
      nameDiv.textContent = t.student_name || 'Student';
      const regDiv = document.createElement('small');
      regDiv.className = 'text-muted';
      regDiv.textContent = `${t.student_register_no} • ${t.student_department}`;
      tdStudent.appendChild(nameDiv);
      tdStudent.appendChild(regDiv);

      // 3. Subject & Type
      const tdSubject = document.createElement('td');
      const subDiv = document.createElement('div');
      subDiv.className = 'text-main font-weight-bold';
      subDiv.textContent = t.subject;
      const typeSpan = document.createElement('span');
      typeSpan.className = 'badge bg-secondary me-1 text-uppercase';
      typeSpan.style.fontSize = '0.68rem';
      typeSpan.textContent = t.type;
      const catSpan = document.createElement('span');
      catSpan.className = 'badge bg-light text-dark border text-uppercase';
      catSpan.style.fontSize = '0.68rem';
      catSpan.textContent = t.category;
      tdSubject.appendChild(subDiv);
      tdSubject.appendChild(typeSpan);
      tdSubject.appendChild(catSpan);

      // 4. Priority
      const tdPriority = document.createElement('td');
      const prioBadge = document.createElement('span');
      prioBadge.className = `badge-priority priority-${t.priority}`;
      prioBadge.textContent = t.priority;
      tdPriority.appendChild(prioBadge);

      // 5. Status
      const tdStatus = document.createElement('td');
      const statBadge = document.createElement('span');
      statBadge.className = `badge-status status-${t.status}`;
      statBadge.textContent = t.status.replace('_', ' ');
      tdStatus.appendChild(statBadge);

      // 6. Date
      const tdDate = document.createElement('td');
      tdDate.className = 'text-muted';
      tdDate.style.fontSize = '0.85rem';
      tdDate.textContent = new Date(t.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      // 7. Actions
      const tdActions = document.createElement('td');
      const manageBtn = document.createElement('button');
      manageBtn.className = 'btn btn-sm btn-primary-institutional';
      manageBtn.textContent = 'Respond';
      manageBtn.onclick = () => openAdminResponseModal(t.id);
      tdActions.appendChild(manageBtn);

      tr.appendChild(tdCode);
      tr.appendChild(tdStudent);
      tr.appendChild(tdSubject);
      tr.appendChild(tdPriority);
      tr.appendChild(tdStatus);
      tr.appendChild(tdDate);
      tr.appendChild(tdActions);

      tableBody.appendChild(tr);
    });
  }

  function renderPagination(pagination) {
    const nav = document.getElementById('admin-pagination');
    if (!nav || !pagination) return;

    nav.innerHTML = '';
    const { page, totalPages, total } = pagination;

    const countText = document.getElementById('admin-tickets-count-label');
    if (countText) {
      countText.textContent = `Showing page ${page} of ${totalPages} (${total} total tickets)`;
    }

    if (totalPages <= 1) return;

    // Previous Button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${page === 1 ? 'disabled' : ''}`;
    const prevA = document.createElement('a');
    prevA.className = 'page-link';
    prevA.href = '#';
    prevA.textContent = 'Previous';
    prevA.onclick = (e) => {
      e.preventDefault();
      if (page > 1) loadAdminTickets(page - 1);
    };
    prevLi.appendChild(prevA);
    nav.appendChild(prevLi);

    // Numbered Pages
    for (let i = 1; i <= totalPages; i++) {
      const pageLi = document.createElement('li');
      pageLi.className = `page-item ${i === page ? 'active' : ''}`;
      const pageA = document.createElement('a');
      pageA.className = 'page-link';
      pageA.href = '#';
      pageA.textContent = i;
      pageA.onclick = (e) => {
        e.preventDefault();
        loadAdminTickets(i);
      };
      pageLi.appendChild(pageA);
      nav.appendChild(pageLi);
    }

    // Next Button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${page === totalPages ? 'disabled' : ''}`;
    const nextA = document.createElement('a');
    nextA.className = 'page-link';
    nextA.href = '#';
    nextA.textContent = 'Next';
    nextA.onclick = (e) => {
      e.preventDefault();
      if (page < totalPages) loadAdminTickets(page + 1);
    };
    nextLi.appendChild(nextA);
    nav.appendChild(nextLi);
  }

  // Filter Listeners
  if (searchInput) searchInput.addEventListener('input', () => loadAdminTickets(1));
  if (statusFilter) statusFilter.addEventListener('change', () => loadAdminTickets(1));
  if (catFilter) catFilter.addEventListener('change', () => loadAdminTickets(1));
  if (typeFilter) typeFilter.addEventListener('change', () => loadAdminTickets(1));
  if (priorityFilter) priorityFilter.addEventListener('change', () => loadAdminTickets(1));
  if (sortSelect) sortSelect.addEventListener('change', () => loadAdminTickets(1));

  // Initial Load
  await loadAdminTickets(1);
}

/**
 * Open Admin Response Modal
 */
async function openAdminResponseModal(ticketId) {
  try {
    const res = await api.get(`/api/tickets/${ticketId}`);
    if (!res.ok) {
      showToast('Could not fetch ticket details', 'error');
      return;
    }

    const { ticket } = await res.json();

    document.getElementById('resp-ticket-id').value = ticket.id;
    setText('admin-modal-code', ticket.ticket_code);
    setText('admin-modal-student', `${ticket.student_name} (${ticket.student_register_no})`);
    setText('admin-modal-dept', ticket.student_department);
    setText('admin-modal-subject', ticket.subject);
    setText('admin-modal-desc', ticket.description);
    setText('admin-modal-category', ticket.category.toUpperCase());
    setText('admin-modal-priority', ticket.priority.toUpperCase());

    const statusSelect = document.getElementById('admin-modal-status-select');
    if (statusSelect) statusSelect.value = ticket.status;

    const messageInput = document.getElementById('admin-modal-message');
    if (messageInput) messageInput.value = '';

    // Show conversation timeline
    const historyContainer = document.getElementById('admin-modal-responses');
    if (historyContainer) {
      historyContainer.innerHTML = '';
      if (!ticket.responses || ticket.responses.length === 0) {
        historyContainer.innerHTML = `<p class="text-muted mb-0">No responses recorded yet.</p>`;
      } else {
        ticket.responses.forEach((r) => {
          const item = document.createElement('div');
          item.className = 'response-item';

          const head = document.createElement('div');
          head.className = 'd-flex justify-content-between mb-1';

          const adminName = document.createElement('strong');
          adminName.className = 'text-primary';
          adminName.textContent = r.admin_name || 'Admin';

          const time = document.createElement('small');
          time.className = 'text-muted';
          time.textContent = new Date(r.created_at).toLocaleString();

          head.appendChild(adminName);
          head.appendChild(time);

          const msg = document.createElement('p');
          msg.className = 'mb-0 text-main';
          msg.textContent = r.message;

          item.appendChild(head);
          item.appendChild(msg);
          historyContainer.appendChild(item);
        });
      }
    }

    const modalEl = document.getElementById('admin-respond-modal');
    if (modalEl && window.bootstrap) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
  } catch (err) {
    showToast('Failed to open administration modal', 'error');
  }
}

/**
 * Submit Admin Response & Status Change
 */
window.submitAdminResponse = async function () {
  const ticketId = document.getElementById('resp-ticket-id')?.value;
  const status = document.getElementById('admin-modal-status-select')?.value;
  const message = document.getElementById('admin-modal-message')?.value.trim();

  try {
    const res = await api.put(`/api/admin/tickets/${ticketId}/status`, {
      status,
      message,
    });

    if (res.ok) {
      showToast('Status and response saved successfully!', 'success');
      const modalEl = document.getElementById('admin-respond-modal');
      if (modalEl && window.bootstrap) {
        bootstrap.Modal.getInstance(modalEl)?.hide();
      }
      setTimeout(() => window.location.reload(), 500);
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to update ticket', 'error');
    }
  } catch (err) {
    showToast('Network error while saving response', 'error');
  }
};

/**
 * CSV Export Trigger
 */
window.triggerCsvExport = function () {
  showToast('Preparing encrypted CSV export...', 'info', 2000);
  window.location.href = '/api/admin/export';
};

/**
 * Admin Security Audit Logs Viewer
 */
async function initAdminAuditLogs() {
  const tableBody = document.getElementById('admin-audit-table-body');
  const actionFilter = document.getElementById('audit-action-filter');

  async function loadLogs() {
    const action = actionFilter ? actionFilter.value : '';
    const params = new URLSearchParams({ limit: 50 });
    if (action) params.append('action', action);

    try {
      const res = await api.get(`/api/admin/audit-logs?${params.toString()}`);
      if (!res.ok) return;

      const data = await res.json();
      renderLogsTable(data.logs || []);
    } catch (err) {
      showToast('Failed to load audit logs', 'error');
    }
  }

  function renderLogsTable(logs) {
    tableBody.innerHTML = '';
    if (logs.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-muted">No audit events recorded.</td></tr>`;
      return;
    }

    logs.forEach((log) => {
      const tr = document.createElement('tr');

      const tdTime = document.createElement('td');
      tdTime.className = 'text-muted';
      tdTime.style.fontSize = '0.85rem';
      tdTime.textContent = new Date(log.created_at).toLocaleString();

      const tdAction = document.createElement('td');
      const actionBadge = document.createElement('span');
      actionBadge.className = 'badge bg-secondary';
      actionBadge.textContent = log.action;
      tdAction.appendChild(actionBadge);

      const tdUser = document.createElement('td');
      tdUser.textContent = log.user_name ? `${log.user_name} (${log.user_role})` : 'System / Unauthenticated';

      const tdIp = document.createElement('td');
      const ipCode = document.createElement('code');
      ipCode.textContent = log.ip;
      tdIp.appendChild(ipCode);

      const tdAgent = document.createElement('td');
      tdAgent.className = 'text-muted';
      tdAgent.style.fontSize = '0.8rem';
      tdAgent.textContent = log.user_agent ? log.user_agent.substring(0, 60) + '...' : 'Unknown';

      tr.appendChild(tdTime);
      tr.appendChild(tdAction);
      tr.appendChild(tdUser);
      tr.appendChild(tdIp);
      tr.appendChild(tdAgent);

      tableBody.appendChild(tr);
    });
  }

  if (actionFilter) actionFilter.addEventListener('change', loadLogs);
  await loadLogs();
}
