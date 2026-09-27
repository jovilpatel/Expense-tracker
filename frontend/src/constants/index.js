export const PAYMENT_MODES = ['Cash', 'Online'];

export const TRANSACTION_TYPES = ['Credit', 'Debit'];

export const TX_STATUSES = ['Completed', 'Active'];

export const RECEIVE_STATUSES = ['Pending', 'Partially Received', 'Received'];

export const PAY_STATUSES = ['Pending', 'Partially Paid', 'Paid'];

export const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Date (newest first)' },
  { value: 'date_asc', label: 'Date (oldest first)' },
  { value: 'amount_desc', label: 'Amount (high to low)' },
  { value: 'amount_asc', label: 'Amount (low to high)' },
];

export const REPORT_PERIODS = ['daily', 'weekly', 'monthly'];

export const PAGE_SIZE = 20;

export const ALL_CATEGORY = '__ALL__';