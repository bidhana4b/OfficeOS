/**
 * TITAN DEV AI — Export Utilities
 * CSV and data export functions for platform data
 */

export interface ExportColumn<T> {
  header: string;
  accessor: (row: T) => string | number | boolean | null | undefined;
}

/**
 * Converts data to CSV string
 */
export function toCSV<T>(data: T[], columns: ExportColumn<T>[]): string {
  const headers = columns.map((c) => `"${c.header}"`).join(',');
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const val = col.accessor(row);
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(',')
  );
  return [headers, ...rows].join('\n');
}

/**
 * Triggers a file download in the browser
 */
export function downloadFile(content: string, filename: string, mimeType = 'text/csv;charset=utf-8;') {
  const blob = new Blob(['\uFEFF' + content], { type: mimeType }); // BOM for Excel UTF-8
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export data as CSV file with automatic download
 */
export function exportCSV<T>(data: T[], columns: ExportColumn<T>[], filename: string) {
  const csv = toCSV(data, columns);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadFile(csv, `${filename}_${timestamp}.csv`);
}

// ============================================
// Pre-built export column definitions
// ============================================

export const clientExportColumns: ExportColumn<Record<string, unknown>>[] = [
  { header: 'Business Name', accessor: (r) => r.business_name as string },
  { header: 'Category', accessor: (r) => r.category as string },
  { header: 'Status', accessor: (r) => r.status as string },
  { header: 'Health Score', accessor: (r) => r.health_score as number },
  { header: 'Contact Email', accessor: (r) => r.contact_email as string },
  { header: 'Contact Phone', accessor: (r) => r.contact_phone as string },
  { header: 'Location', accessor: (r) => r.location as string },
  { header: 'Website', accessor: (r) => r.contact_website as string },
  { header: 'Created At', accessor: (r) => r.created_at as string },
];

export const invoiceExportColumns: ExportColumn<Record<string, unknown>>[] = [
  { header: 'Invoice #', accessor: (r) => r.invoice_number as string },
  { header: 'Client', accessor: (r) => {
    const client = r.clients as Record<string, unknown> | null;
    return client?.business_name as string || '';
  }},
  { header: 'Amount', accessor: (r) => r.amount as number },
  { header: 'Currency', accessor: (r) => r.currency as string },
  { header: 'Status', accessor: (r) => r.status as string },
  { header: 'Issue Date', accessor: (r) => r.issue_date as string },
  { header: 'Due Date', accessor: (r) => r.due_date as string },
  { header: 'Paid Date', accessor: (r) => r.paid_date as string },
  { header: 'Description', accessor: (r) => r.description as string },
];

export const teamMemberExportColumns: ExportColumn<Record<string, unknown>>[] = [
  { header: 'Name', accessor: (r) => r.name as string },
  { header: 'Primary Role', accessor: (r) => r.primary_role as string },
  { header: 'Email', accessor: (r) => r.email as string },
  { header: 'Phone', accessor: (r) => r.phone as string },
  { header: 'Status', accessor: (r) => r.status as string },
  { header: 'Current Load', accessor: (r) => r.current_load as number },
  { header: 'Max Capacity', accessor: (r) => r.max_capacity as number },
  { header: 'Joined At', accessor: (r) => r.joined_at as string },
];

export const deliverableExportColumns: ExportColumn<Record<string, unknown>>[] = [
  { header: 'Title', accessor: (r) => r.title as string },
  { header: 'Type', accessor: (r) => r.deliverable_type as string },
  { header: 'Status', accessor: (r) => r.status as string },
  { header: 'Priority', accessor: (r) => r.priority as string },
  { header: 'Client', accessor: (r) => {
    const client = r.clients as Record<string, unknown> | null;
    return client?.business_name as string || '';
  }},
  { header: 'Assigned To', accessor: (r) => {
    const member = r.assigned_to_member as Record<string, unknown> | null;
    return member?.name as string || '';
  }},
  { header: 'Deadline', accessor: (r) => r.deadline as string },
  { header: 'Created At', accessor: (r) => r.created_at as string },
];

export const campaignExportColumns: ExportColumn<Record<string, unknown>>[] = [
  { header: 'Name', accessor: (r) => r.name as string },
  { header: 'Platform', accessor: (r) => r.platform as string },
  { header: 'Status', accessor: (r) => r.status as string },
  { header: 'Budget', accessor: (r) => r.budget as number },
  { header: 'Spent', accessor: (r) => r.spent as number },
  { header: 'Client', accessor: (r) => {
    const client = r.clients as Record<string, unknown> | null;
    return client?.business_name as string || '';
  }},
  { header: 'Start Date', accessor: (r) => r.start_date as string },
  { header: 'End Date', accessor: (r) => r.end_date as string },
];
