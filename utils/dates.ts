/**
 * Date utility functions for Bluom.App
 */

/**
 * Get today's date in ISO format (YYYY-MM-DD)
 */
export function getTodayISO(): string {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

/**
 * Format date to ISO string (YYYY-MM-DD)
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Get date range for the current week (Monday to Sunday)
 */
export function getCurrentWeekRange(): { startDate: string; endDate: string } {
  const today = new Date();
  const currentDay = today.getDay();
  const diff = currentDay === 0 ? -6 : 1 - currentDay;

  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    startDate: formatDateISO(monday),
    endDate: formatDateISO(sunday),
  };
}

/**
 * Get date N days ago
 */
export function getDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return formatDateISO(date);
}

/**
 * Check if date is today
 */
export function isToday(dateString: string): boolean {
  return dateString === getTodayISO();
}

/**
 * Format time to HH:MM
 */
export function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Parse time string (HH:MM) to hours and minutes
 */
export function parseTime(timeString: string): {
  hours: number;
  minutes: number;
} {
  const [hours, minutes] = timeString.split(":").map(Number);
  return { hours, minutes };
}

/**
 * Get friendly date string (e.g., "Today", "Yesterday", "Dec 20")
 */
export function getFriendlyDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (formatDateISO(date) === formatDateISO(today)) {
    return "Today";
  } else if (formatDateISO(date) === formatDateISO(yesterday)) {
    return "Yesterday";
  } else {
    const month = date.toLocaleString("en-US", { month: "short" });
    const day = date.getDate();
    return `${month} ${day}`;
  }
}
