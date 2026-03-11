import db from "@/lib/db";
import type { Holiday } from "@/lib/types";

type HolidayRow = {
  date: string;
  name: string;
};

export function listHolidaysForMonth(month: string): Holiday[] {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText);

  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 1 || monthIndex > 12) {
    return [];
  }

  const start = `${yearText}-${monthText}-01`;
  const endDate = new Date(Date.UTC(year, monthIndex, 0));
  const end = `${yearText}-${monthText}-${String(endDate.getUTCDate()).padStart(2, "0")}`;

  const rows = db
    .prepare("SELECT date, name FROM holidays WHERE date BETWEEN ? AND ? ORDER BY date ASC")
    .all(start, end) as HolidayRow[];

  return rows;
}
