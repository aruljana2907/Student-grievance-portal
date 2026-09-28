/**
 * Generates unique, standardized human-readable ticket codes.
 * Format: GRV-YYYY-XXXX or FBK-YYYY-XXXX
 * Example: GRV-2026-0001
 */

function generateTicketCode(type = 'grievance', id = null) {
  const prefix = type === 'feedback' ? 'FBK' : 'GRV';
  const year = new Date().getFullYear();
  
  if (id !== null && Number.isInteger(id)) {
    const sequence = String(id).padStart(4, '0');
    return `${prefix}-${year}-${sequence}`;
  }
  
  // Random 4-digit fallback for pre-insert reservation
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}-${randomSuffix}`;
}

module.exports = {
  generateTicketCode,
};
