const SINGAPORE_TZ = "Asia/Singapore";

export function toSingaporeLabel(isoValue: string | null): string {
  if (!isoValue) {
    return "No due date";
  }

  const date = new Date(isoValue);
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: SINGAPORE_TZ,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function fromDatetimeLocalToIso(input: string | null): string | null {
  if (!input) {
    return null;
  }

  // datetime-local has no timezone. We interpret it as Singapore local time.
  const withOffset = `${input}:00+08:00`;
  const date = new Date(withOffset);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export function toDatetimeLocalFromIso(isoValue: string | null): string {
  if (!isoValue) {
    return "";
  }

  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: SINGAPORE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const value = formatter.format(date).replace(" ", "T");
  return value;
}

export function getDueStatusLabel(isoValue: string | null): string {
  if (!isoValue) {
    return "No due date";
  }

  const dueTime = new Date(isoValue).getTime();
  const nowTime = Date.now();

  if (Number.isNaN(dueTime)) {
    return "Invalid due date";
  }

  const diffMinutes = Math.floor((dueTime - nowTime) / 60000);

  if (diffMinutes < 0) {
    const overdueMinutes = Math.abs(diffMinutes);
    if (overdueMinutes < 60) {
      return `${overdueMinutes} minutes overdue`;
    }

    if (overdueMinutes < 1440) {
      return `${Math.floor(overdueMinutes / 60)} hours overdue`;
    }

    return `${Math.floor(overdueMinutes / 1440)} days overdue`;
  }

  if (diffMinutes < 60) {
    return `Due in ${diffMinutes} minutes`;
  }

  if (diffMinutes < 1440) {
    return `Due in ${Math.floor(diffMinutes / 60)} hours`;
  }

  if (diffMinutes < 10080) {
    return `Due in ${Math.floor(diffMinutes / 1440)} days`;
  }

  return `Due ${toSingaporeLabel(isoValue)}`;
}
