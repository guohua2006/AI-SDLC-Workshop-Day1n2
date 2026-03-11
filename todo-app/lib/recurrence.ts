import type { RecurrencePattern } from "@/lib/types";

export function calculateNextDueDate(
  currentDueDateIso: string,
  pattern: RecurrencePattern
): string {
  const date = new Date(currentDueDateIso);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid due date for recurrence calculation");
  }

  const next = new Date(date);

  if (pattern === "daily") {
    next.setUTCDate(next.getUTCDate() + 1);
  } else if (pattern === "weekly") {
    next.setUTCDate(next.getUTCDate() + 7);
  } else if (pattern === "monthly") {
    const day = next.getUTCDate();
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + 1);
    const monthDays = new Date(
      Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)
    ).getUTCDate();
    next.setUTCDate(Math.min(day, monthDays));
  } else {
    const month = next.getUTCMonth();
    const day = next.getUTCDate();
    next.setUTCFullYear(next.getUTCFullYear() + 1);

    // Handle Feb 29 in non-leap years.
    if (month === 1 && day === 29 && next.getUTCMonth() !== 1) {
      next.setUTCMonth(1, 28);
    }
  }

  return next.toISOString();
}
