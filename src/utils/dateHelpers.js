import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear } from 'date-fns';

// Get date range based on filter
export const getDateRange = (filter) => {
  const today = new Date();

  switch (filter) {
    case 'today':
      return {
        start: startOfDay(today).toISOString().split('T')[0],
        end: endOfDay(today).toISOString().split('T')[0],
        label: 'Today',
      };

    case 'week':
      return {
        start: startOfWeek(today, { weekStartsOn: 1 }).toISOString().split('T')[0],
        end: endOfWeek(today, { weekStartsOn: 1 }).toISOString().split('T')[0],
        label: 'This Week',
      };

    case 'month':
      return {
        start: startOfMonth(today).toISOString().split('T')[0],
        end: endOfMonth(today).toISOString().split('T')[0],
        label: 'This Month',
      };

    case 'ytd':
      return {
        start: startOfYear(today).toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
        label: 'Year to Date',
      };

    case 'quarter':
      const quarter = Math.floor(today.getMonth() / 3);
      const quarterStart = new Date(today.getFullYear(), quarter * 3, 1);
      const quarterEnd = new Date(today.getFullYear(), quarter * 3 + 3, 0);
      return {
        start: quarterStart.toISOString().split('T')[0],
        end: quarterEnd.toISOString().split('T')[0],
        label: `Q${quarter + 1} ${today.getFullYear()}`,
      };

    default:
      return {
        start: startOfMonth(today).toISOString().split('T')[0],
        end: endOfMonth(today).toISOString().split('T')[0],
        label: 'This Month',
      };
  }
};

// Format date for display
export const formatDate = (date, formatStr = 'MMM dd, yyyy') => {
  if (!date) return '';
  return format(new Date(date), formatStr);
};

// Format date range for display
export const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return '';
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
};

// Check if date is today
export const isToday = (date) => {
  const today = new Date();
  const checkDate = new Date(date);
  return (
    checkDate.getDate() === today.getDate() &&
    checkDate.getMonth() === today.getMonth() &&
    checkDate.getFullYear() === today.getFullYear()
  );
};

// Check if date is overdue
export const isOverdue = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate < today;
};

// Check if date is in the future
export const isFuture = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate > today;
};

// Get days until date
export const daysUntil = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  const diffTime = checkDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};
