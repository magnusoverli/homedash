export function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getSchoolYearRange(importDate = new Date()) {
  const currentYear = importDate.getFullYear();
  const currentMonth = importDate.getMonth();

  let schoolYearStart, schoolYearEnd;

  if (currentMonth >= 7) {
    schoolYearStart = new Date(currentYear, 7, 1);
    schoolYearEnd = new Date(currentYear + 1, 6, 31);
  } else {
    schoolYearStart = new Date(currentYear - 1, 7, 1);
    schoolYearEnd = new Date(currentYear, 6, 31);
  }

  return { schoolYearStart, schoolYearEnd };
}
