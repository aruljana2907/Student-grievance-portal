/**
 * Student Portal Logic
 * 
 * Handles ticket submission, listing, filtering, editing, deletion,
 * and profile password changes.
 * 
 * SECURITY: Strict zero-innerHTML policy with user-supplied data.
 * All dynamic elements are built via safe DOM methods or escaped values.
 */

let currentUser = null;
let allStudentTickets = [];

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await checkAuth('student');
  if (!currentUser) return;

  // Initialize specific page modules
  if (document.getElementById('student-dashboard-metrics')) {
    initStudentDashboard();
  }
  if (document.getElementById('ticket-submission-form')) {
    initTicketSubmission();
  }
  if (document.getElementById('student-tickets-container')) {
    initStudentTicketsList();
  }
  if (document.getElementById('profile-form')) {
    initProfilePage();
  }
});

/**
 * Student Dashboard Overview
 */
async function initStudentDashboard() {
  try {
    const res = await api.get('/api/tickets');
    if (!res.ok) return;

    const data = await res.json();
    const tickets = data.tickets || [];

    const total = tickets.length;
    const pending = tickets.filter((t) => t.status === 'pending').length;
    const inReview = tickets.filter((t) => t.status === 'in_review').length;
    const resolved = tickets.filter((t) => t.status === 'resolved').length;

    setText('metric-total', total);
    setText('metric-pending', pending);
    setText('metric-review', inReview);
    setText('metric-resolved', resolved);

    // Render recent 3 tickets
    const recentList = document.getElementById('recent-tickets-list');
    if (recentList) {
      recentList.innerHTML = '';
      if (tickets.length === 0) {
        recentList.innerHTML = `<div class="p-4 text-center text-muted">No tickets submitted yet. Click "New Ticket" to get started.</div>`;
        return;
      }

      tickets.slice(0, 3).forEach((ticket) => {
        recentList.appendChild(createTicketCard(ticket));
      });
    }
  } catch (err) {
    showToast('Failed to load dashboard data', 'error');
  }
}

/**
 * Handle Grievance / Feedback Submission
 */
function initTicketSubmission() {
  const form = document.getElementById('ticket-submission-form');
  const submitBtn = document.getElementById('submit-ticket-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const type = document.getElementById('ticket-type')?.value;
    const category = document.getElementById('ticket-category')?.value;
    const priority = document.getElementById('ticket-priority')?.value || 'medium';
    const subject = document.getElementById('ticket-subject')?.value.trim();
    const description = document.getElementById('ticket-description')?.value.trim();

    if (!type || !category || !subject || !description) {
      showToast('Please fill out all required fields.', 'error');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span> Submitting...`;
    }

    try {
      const res = await api.post('/api/tickets', {
        type,
        category,
        priority,
        subject,
        description,
      });
      const data = await res.json();

      if (res.ok) {
        showToast('Ticket submitted successfully!', 'success', 2000);
        setTimeout(() => {
          window.location.href = '/student/tickets.html';
        }, 800);
      } else {
        showToast(data.error || 'Failed to submit ticket', 'error');
      }
    } catch (err) {
      showToast('Network error while submitting ticket', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Ticket';
      }
    }
  });
}

/**
 * "My Submissions" Tickets List with Filters & Modal Handlers
 */
async function initStudentTicketsList() {
  const container = document.getElementById('student-tickets-container');
  const searchInput = document.getElementById('ticket-search');
  const statusFilter = document.getElementById('status-filter');

  async function loadTickets() {
    try {
      const res = await api.get('/api/tickets');
      if (!res.ok) return;

      const data = await res.json();
      allStudentTickets = data.tickets || [];
      renderFiltered();
    } catch (err) {
      showToast('Error loading your tickets', 'error');
    }
  }

  function renderFiltered() {
    container.innerHTML = '';
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const status = statusFilter ? statusFilter.value : 'all';

    let filtered = allStudentTickets.filter((t) => {
      const matchesStatus = status === 'all' || t.status === status;
      const matchesQuery =
        !query ||
        t.ticket_code.toLowerCase().includes(query) ||
        t.subject.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="portal-card p-5 text-center text-muted">
          <p class="mb-1" style="font-size: 1.1rem; font-weight: 600;">No tickets found</p>
          <p class="mb-0">There are no submissions matching your selected filter.</p>
        </div>
      `;
      return;
    }

    filtered.forEach((ticket) => {
      container.appendChild(createTicketCard(ticket));
    });
  }

  if (searchInput) searchInput.addEventListener('input', renderFiltered);
  if (statusFilter) statusFilter.addEventListener('change', renderFiltered);

  await loadTickets();
}

/**
 * Safely Construct Ticket Card Component
 */
function createTicketCard(ticket) {
  const card = document.createElement('div');
  card.className = `ticket-card status-${ticket.status}`;

  // Header row
  const headerDiv = document.createElement('div');
  headerDiv.className = 'd-flex justify-content-between align-items-center mb-2 flex-wrap gap-2';

  const leftMeta = document.createElement('div');
  leftMeta.className = 'd-flex align-items-center gap-2';

  const codeSpan = document.createElement('span');
  codeSpan.className = 'ticket-code';
  codeSpan.textContent = ticket.ticket_code;

  const typeSpan = document.createElement('span');
  typeSpan.className = 'badge bg-secondary text-uppercase';
  typeSpan.style.fontSize = '0.7rem';
  typeSpan.textContent = ticket.type;

  const categorySpan = document.createElement('span');
  categorySpan.className = 'badge bg-light text-dark border text-uppercase';
  categorySpan.style.fontSize = '0.7rem';
  categorySpan.textContent = ticket.category;

  leftMeta.appendChild(codeSpan);
  leftMeta.appendChild(typeSpan);
  leftMeta.appendChild(categorySpan);

  const rightMeta = document.createElement('div');
  rightMeta.className = 'd-flex align-items-center gap-2';

  const prioritySpan = document.createElement('span');
  prioritySpan.className = `badge-priority priority-${ticket.priority}`;
  prioritySpan.textContent = ticket.priority;

  const statusBadge = document.createElement('span');
  statusBadge.className = `badge-status status-${ticket.status}`;
  statusBadge.textContent = ticket.status.replace('_', ' ');

  rightMeta.appendChild(prioritySpan);
  rightMeta.appendChild(statusBadge);

  headerDiv.appendChild(leftMeta);
  headerDiv.appendChild(rightMeta);

  // Subject
  const subjectEl = document.createElement('h5');
  subjectEl.className = 'mb-1 text-main font-weight-bold';
  subjectEl.style.fontSize = '1.05rem';
  subjectEl.textContent = ticket.subject;

  // Description snippet
  const descEl = document.createElement('p');
  descEl.className = 'text-muted mb-3';
  descEl.style.fontSize = '0.92rem';
  descEl.textContent =
    ticket.description.length > 180
      ? ticket.description.substring(0, 180) + '...'
      : ticket.description;

  // Latest admin response if available
  let responseBox = null;
  if (ticket.latest_response) {
    responseBox = document.createElement('div');
    responseBox.className = 'p-2 px-3 mb-3 rounded border border-info-subtle bg-info-subtle';
    responseBox.style.fontSize = '0.88rem';

    const respTitle = document.createElement('strong');
    respTitle.className = 'd-block text-primary mb-1';
    respTitle.textContent = 'Latest Administration Response:';

    const respText = document.createElement('span');
    respText.className = 'text-secondary';
    respText.textContent = ticket.latest_response;

    responseBox.appendChild(respTitle);
    responseBox.appendChild(respText);
  }

  // Footer Actions
  const footerDiv = document.createElement('div');
  footerDiv.className = 'd-flex justify-content-between align-items-center pt-2 border-top flex-wrap gap-2';

  const dateSpan = document.createElement('small');
  dateSpan.className = 'text-muted';
  const createdDate = new Date(ticket.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  dateSpan.textContent = `Submitted on ${createdDate}`;

  const btnGroup = document.createElement('div');
  btnGroup.className = 'd-flex gap-2';

  // View Details Button
  const viewBtn = document.createElement('button');
  viewBtn.className = 'btn btn-sm btn-outline-primary';
  viewBtn.textContent = 'View Details';
  viewBtn.onclick = () => openViewModal(ticket.id);
  btnGroup.appendChild(viewBtn);

  // Edit & Delete only for Pending tickets
  if (ticket.status === 'pending') {
    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-sm btn-outline-secondary';
    editBtn.textContent = 'Edit';
    editBtn.onclick = () => openEditModal(ticket.id);
    btnGroup.appendChild(editBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-sm btn-outline-danger';
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = () => confirmDeleteTicket(ticket.id);
    btnGroup.appendChild(deleteBtn);
  }

  footerDiv.appendChild(dateSpan);
  footerDiv.appendChild(btnGroup);

  card.appendChild(headerDiv);
  card.appendChild(subjectEl);
  card.appendChild(descEl);
  if (responseBox) card.appendChild(responseBox);
  card.appendChild(footerDiv);

  return card;
}

/**
 * Open Ticket Detail Modal
 */
async function openViewModal(ticketId) {
  try {
    const res = await api.get(`/api/tickets/${ticketId}`);
    if (!res.ok) {
      showToast('Could not load ticket details', 'error');
      return;
    }

    const { ticket } = await res.json();

    setText('modal-ticket-code', ticket.ticket_code);
    setText('modal-ticket-subject', ticket.subject);
    setText('modal-ticket-desc', ticket.description);
    setText('modal-ticket-type', ticket.type.toUpperCase());
    setText('modal-ticket-cat', ticket.category.toUpperCase());
    setText('modal-ticket-priority', ticket.priority.toUpperCase());
    setText('modal-ticket-status', ticket.status.replace('_', ' ').toUpperCase());

    const responsesContainer = document.getElementById('modal-responses-container');
    if (responsesContainer) {
      responsesContainer.innerHTML = '';
      if (!ticket.responses || ticket.responses.length === 0) {
        responsesContainer.innerHTML = `<p class="text-muted mb-0">No response recorded by administration yet.</p>`;
      } else {
        ticket.responses.forEach((resp) => {
          const item = document.createElement('div');
          item.className = 'response-item';

          const head = document.createElement('div');
          head.className = 'd-flex justify-content-between mb-1';

          const adminName = document.createElement('strong');
          adminName.className = 'text-primary';
          adminName.textContent = resp.admin_name || 'Administrator';

          const time = document.createElement('small');
          time.className = 'text-muted';
          time.textContent = new Date(resp.created_at).toLocaleString();

          head.appendChild(adminName);
          head.appendChild(time);

          const msg = document.createElement('p');
          msg.className = 'mb-0 text-main';
          msg.textContent = resp.message;

          item.appendChild(head);
          item.appendChild(msg);
          responsesContainer.appendChild(item);
        });
      }
    }

    const modalEl = document.getElementById('view-ticket-modal');
    if (modalEl && window.bootstrap) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
  } catch (err) {
    showToast('Failed to open ticket details', 'error');
  }
}

/**
 * Open Ticket Edit Modal
 */
async function openEditModal(ticketId) {
  try {
    const res = await api.get(`/api/tickets/${ticketId}`);
    if (!res.ok) {
      showToast('Could not fetch ticket for editing', 'error');
      return;
    }

    const { ticket } = await res.json();
    if (ticket.status !== 'pending') {
      showToast('Only pending tickets can be edited', 'error');
      return;
    }

    document.getElementById('edit-ticket-id').value = ticket.id;
    document.getElementById('edit-type').value = ticket.type;
    document.getElementById('edit-category').value = ticket.category;
    document.getElementById('edit-priority').value = ticket.priority;
    document.getElementById('edit-subject').value = ticket.subject;
    document.getElementById('edit-description').value = ticket.description;

    const modalEl = document.getElementById('edit-ticket-modal');
    if (modalEl && window.bootstrap) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
  } catch (err) {
    showToast('Failed to open edit modal', 'error');
  }
}

/**
 * Submit Ticket Edit
 */
window.submitTicketEdit = async function () {
  const ticketId = document.getElementById('edit-ticket-id')?.value;
  const type = document.getElementById('edit-type')?.value;
  const category = document.getElementById('edit-category')?.value;
  const priority = document.getElementById('edit-priority')?.value;
  const subject = document.getElementById('edit-subject')?.value.trim();
  const description = document.getElementById('edit-description')?.value.trim();

  if (!subject || !description) {
    showToast('Subject and description cannot be empty', 'error');
    return;
  }

  try {
    const res = await api.put(`/api/tickets/${ticketId}`, {
      type,
      category,
      priority,
      subject,
      description,
    });

    if (res.ok) {
      showToast('Ticket updated successfully', 'success');
      const modalEl = document.getElementById('edit-ticket-modal');
      if (modalEl && window.bootstrap) {
        bootstrap.Modal.getInstance(modalEl)?.hide();
      }
      setTimeout(() => window.location.reload(), 500);
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to update ticket', 'error');
    }
  } catch (err) {
    showToast('Network error while updating ticket', 'error');
  }
};

/**
 * Confirm and Delete Ticket
 */
async function confirmDeleteTicket(ticketId) {
  if (!confirm('Are you sure you want to delete this pending ticket? This action cannot be undone.')) {
    return;
  }

  try {
    const res = await api.delete(`/api/tickets/${ticketId}`);
    if (res.ok) {
      showToast('Ticket deleted successfully', 'success');
      setTimeout(() => window.location.reload(), 500);
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to delete ticket', 'error');
    }
  } catch (err) {
    showToast('Network error while deleting ticket', 'error');
  }
}

/**
 * Profile & Password Management
 */
function initProfilePage() {
  if (currentUser) {
    setText('profile-name', currentUser.name);
    setText('profile-regno', currentUser.registerNo);
    setText('profile-dept', currentUser.department);
    setText('profile-email', currentUser.email);
    setText('profile-role', currentUser.role.toUpperCase());
  }

  const pwdForm = document.getElementById('change-password-form');
  if (pwdForm) {
    pwdForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const currentPassword = document.getElementById('current-password')?.value;
      const newPassword = document.getElementById('new-password')?.value;
      const confirmPassword = document.getElementById('confirm-new-password')?.value;

      if (newPassword !== confirmPassword) {
        showToast('New passwords do not match.', 'error');
        return;
      }

      try {
        const res = await api.post('/api/auth/change-password', {
          currentPassword,
          newPassword,
        });
        const data = await res.json();

        if (res.ok) {
          showToast('Password updated successfully!', 'success');
          pwdForm.reset();
        } else {
          showToast(data.error || 'Failed to change password', 'error');
        }
      } catch (err) {
        showToast('Network error while changing password', 'error');
      }
    });
  }
}
