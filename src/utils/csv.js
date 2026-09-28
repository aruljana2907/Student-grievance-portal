/**
 * Safe CSV Generation Utility.
 * 
 * SECURITY: Implements Formula Injection (CSV Injection) mitigation.
 * If user-controlled fields begin with =, +, -, @, \t, or \r, spreadsheet
 * programs (Excel, LibreOffice) can execute arbitrary formulas or commands.
 * We neutralize this by prefixing dangerous characters with an apostrophe (').
 */

function sanitizeForCsv(value) {
  if (value === null || value === undefined) {
    return '""';
  }
  
  let str = String(value);
  
  // Neutralize CSV formula injection
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  
  // Escape internal double quotes by doubling them and wrapping in quotes
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

function ticketsToCsv(tickets = []) {
  const headers = [
    'Ticket Code',
    'Type',
    'Category',
    'Subject',
    'Description',
    'Priority',
    'Status',
    'Student Register No',
    'Student Name',
    'Department',
    'Created At',
    'Updated At',
    'Latest Admin Response',
  ];

  const rows = tickets.map((t) => [
    sanitizeForCsv(t.ticket_code),
    sanitizeForCsv(t.type),
    sanitizeForCsv(t.category),
    sanitizeForCsv(t.subject),
    sanitizeForCsv(t.description),
    sanitizeForCsv(t.priority),
    sanitizeForCsv(t.status),
    sanitizeForCsv(t.register_no || t.student_register_no || 'N/A'),
    sanitizeForCsv(t.student_name || t.name || 'N/A'),
    sanitizeForCsv(t.department || 'N/A'),
    sanitizeForCsv(t.created_at ? new Date(t.created_at).toISOString() : ''),
    sanitizeForCsv(t.updated_at ? new Date(t.updated_at).toISOString() : ''),
    sanitizeForCsv(t.latest_response || t.response_message || 'None'),
  ]);

  const csvContent = [
    headers.map((h) => `"${h}"`).join(','),
    ...rows.map((r) => r.join(',')),
  ].join('\r\n');

  return csvContent;
}

module.exports = {
  sanitizeForCsv,
  ticketsToCsv,
};
