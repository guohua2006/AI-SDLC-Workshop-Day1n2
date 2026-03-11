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
